from fastapi import FastAPI, Request
import httpx
import os
import logging
import time
from kommo_service import create_lead_with_contact

app = FastAPI()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("wifi-rapidito-bot")

# --- CONFIGURACIÓN ---
EVO_API_URL = os.getenv("EVO_API_URL", "http://evolution_api:8080")
EVO_API_KEY = os.getenv("EVO_API_KEY", "")
INSTANCE_NAME = os.getenv("INSTANCE_NAME", "rapidito_bot")
WISPHUB_API_URL = os.getenv("WISPHUB_API_URL", "https://api.wisphub.app/api")
WISPHUB_API_KEY = os.getenv("WISPHUB_API_KEY", "")
PROMISE_RESTRICTIONS_URL = os.getenv(
    "PROMISE_RESTRICTIONS_URL",
    "https://wifirapidito.com/promise_restrictions.php",
)

# --- ALMACENAMIENTO DE ESTADOS / CACHE ---
user_states = {}
_client_cache = {"loaded_at": 0.0, "clients": []}
CLIENT_CACHE_TTL = 300

# --- MENÚS Y RESPUESTAS ---
MENU_BIENVENIDA = """
👋 *¡Hola! Bienvenido al Asistente Virtual de WiFi Rapidito.* 🚀

Para brindarte una atención personalizada, por favor indícanos:

1️⃣ *Ya soy cliente*
2️⃣ *Aún no soy cliente*

_Responde con el número de tu opción._
"""

MENU_CLIENTE = """
✅ *Panel de Clientes WiFi Rapidito*
¿En qué podemos ayudarte hoy? Ingresa el número de tu opción:

1️⃣ 💰 *Reportar un Pago* (Mensualidad)
2️⃣ 🤝 *Promesa de Pago*
3️⃣ 📄 *Descargar Factura* (Último PDF)
4️⃣ 🛠️ *Soporte Técnico* (Reportar una Falla)

_O escribe *'VOLVER'* para regresar al inicio._
"""

RESPUESTA_PAGO = """
💰 *Reportar un Pago*

1. Ingresa a www.wifirapidito.com o abre nuestra App.
2. Inicia sesión con tu usuario.
3. Selecciona *'Reportar pago'*.
4. Sigue el formulario de validación Banesco y adjunta tu comprobante.

Si la validación es exitosa, WispHub registra el pago y procesa la activación automáticamente. 🚀
"""

RESPUESTA_PROMESA = """
🤝 *Promesa de Pago*

1. Ingresa a www.wifirapidito.com o abre nuestra App.
2. Inicia sesión con tu usuario.
3. Selecciona *'Promesa de pago'*.
4. El sistema verificará automáticamente tu factura, la ventana permitida y la fecha máxima.

*Disponibilidad mensual:* del día 13 al día 5 del mes siguiente.
"""

RESPUESTA_FACTURA = """
📄 *Descarga de Factura*

1. Ingresa a www.wifirapidito.com o nuestra App.
2. En la parte inferior de tu pantalla, presiona el botón *'Docs'*.
3. Allí podrás ver y descargar tu última factura en PDF.
"""

RESPUESTA_SOPORTE = """
🛠️ *Soporte Técnico / Falla*

Para darte la atención más rápida, gestionamos fallas vía tickets:
1. Ingresa a www.wifirapidito.com o nuestra App.
2. Selecciona *'Soporte Técnico'* o *'Crear Ticket'*.
3. Completa el formulario con el detalle de tu solicitud.

Un técnico especializado revisará tu caso a la brevedad. 👨‍💻
"""

MENSAJE_PROSPECTO = """
🌐 *Información Especializada*

Actualmente contamos con cobertura en:
📍 *Sotillo, Ciudad Brión, Las González, Las Martínez, Prado Largo, Gamelotal, Bosque de Curiepe* y próximamente en más comunidades del municipio Brión.

💰 *Oferta de Instalación:*
El costo es de **65$** e incluye el **primer mes de servicio GRATIS**. 🎁

¿Deseas contratar el servicio? Responde **'ME INTERESA'** para suministrarte los datos bancarios.
"""


def normalize_phone(value):
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    if len(digits) == 11 and digits.startswith("0"):
        return "58" + digits[1:]
    if len(digits) == 10 and not digits.startswith("58"):
        return "58" + digits
    return digits


def normalize_username(value):
    username = str(value or "").strip().lower().replace(" ", "")
    suffix = "@wifi-rapidito"
    if username.endswith(suffix):
        username = username[:-len(suffix)]
    return username


def client_value(client, keys, default=""):
    for key in keys:
        value = client.get(key) if isinstance(client, dict) else None
        if value not in (None, ""):
            return value
    return default


def scalar_id(value):
    if isinstance(value, dict):
        for key in ("id_servicio", "id_cliente", "id", "pk"):
            if value.get(key) not in (None, ""):
                return str(value[key])
        return ""
    return str(value or "").strip()


async def load_wisphub_clients(force=False):
    now = time.monotonic()
    if not force and _client_cache["clients"] and now - _client_cache["loaded_at"] < CLIENT_CACHE_TTL:
        return _client_cache["clients"]

    if not WISPHUB_API_KEY:
        logger.warning("WISPHUB_API_KEY no está configurada; no se puede identificar al cliente para restricciones.")
        return []

    headers = {"Authorization": f"Api-Key {WISPHUB_API_KEY}", "Accept": "application/json"}
    clients = []
    offset = 0
    limit = 300

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        for _ in range(40):
            response = await client.get(
                f"{WISPHUB_API_URL.rstrip('/')}/clientes/",
                params={"limit": limit, "offset": offset},
                headers=headers,
            )
            response.raise_for_status()
            payload = response.json()
            batch = payload.get("results", []) if isinstance(payload, dict) else payload
            if not isinstance(batch, list):
                break
            clients.extend(item for item in batch if isinstance(item, dict))
            received = len(batch)
            if received == 0:
                break
            offset += received
            total = payload.get("count") if isinstance(payload, dict) else None
            if isinstance(total, int) and offset >= total:
                break
            if total is None and received < limit and not (payload.get("next") if isinstance(payload, dict) else None):
                break

    _client_cache["clients"] = clients
    _client_cache["loaded_at"] = now
    return clients


async def find_client_by_whatsapp_phone(phone):
    target = normalize_phone(phone)
    if not target:
        return None
    try:
        clients = await load_wisphub_clients()
    except Exception as exc:
        logger.warning("No se pudo cargar el directorio WispHub: %s", exc)
        return None

    for client in clients:
        candidate = normalize_phone(client_value(client, ["telefono", "movil", "celular", "phone"]))
        if candidate and candidate == target:
            service = client_value(client, ["id_servicio", "servicio_id"])
            if not service and isinstance(client.get("servicio"), dict):
                service = scalar_id(client["servicio"])
            return {
                "service_id": scalar_id(service),
                "username": normalize_username(client_value(client, ["usuario", "usuario_portal", "username"])),
            }
    return None


async def get_promise_restriction(client_identity):
    if not client_identity or not client_identity.get("service_id") or not client_identity.get("username"):
        return None
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(
                PROMISE_RESTRICTIONS_URL,
                params={
                    "action": "check",
                    "service_id": client_identity["service_id"],
                    "username": client_identity["username"],
                },
            )
        if response.status_code != 200:
            logger.warning("Consulta de restricción devolvió HTTP %s", response.status_code)
            return None
        payload = response.json()
        return payload if payload.get("blocked") else None
    except Exception as exc:
        logger.warning("No se pudo consultar restricción de promesa: %s", exc)
        return None


async def promise_response_for_phone(phone):
    identity = await find_client_by_whatsapp_phone(phone)
    restriction = await get_promise_restriction(identity)
    if not restriction:
        return RESPUESTA_PROMESA

    blocked_until = restriction.get("blocked_until", "la fecha indicada")
    return f"""
🚫 *Promesa de pago no disponible temporalmente*

Debido al incumplimiento de una promesa anterior, este beneficio se encuentra suspendido por *3 meses*.

📅 Podrás solicitar una nueva promesa a partir del *{blocked_until}*.

Esta medida solo afecta nuevas promesas. Puedes continuar usando normalmente las opciones de *pago, facturas y soporte técnico*.
"""


async def enviar_whatsapp(numero, texto):
    url = f"{EVO_API_URL}/message/sendText/{INSTANCE_NAME}"
    headers = {"apikey": EVO_API_KEY}
    payload = {"number": numero, "text": texto, "delay": 500, "linkPreview": True}
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            await client.post(url, json=payload, headers=headers)
        except Exception as exc:
            logger.error("Error enviando mensaje WhatsApp: %s", exc)


@app.get("/webhook")
async def health_check():
    return {"status": "ok", "message": "Webhook receiver is active", "version": "2.0-promise-restrictions"}


@app.post("/webhook")
async def recibir_mensaje(request: Request):
    data = await request.json()

    if data.get('event') == 'messages.upsert':
        try:
            msg_data = data['data']
            if msg_data['key']['fromMe']:
                return {"status": "ignored"}

            numero_cliente = msg_data['key']['remoteJid']
            mensaje = ""
            message = msg_data.get('message', {})

            if 'conversation' in message:
                mensaje = message['conversation']
            elif 'extendedTextMessage' in message:
                mensaje = message['extendedTextMessage'].get('text', '')

            mensaje = mensaje.strip().lower()
            state = user_states.get(numero_cliente, "START")

            if any(word in mensaje for word in ["hola", "buenas", "inicio", "menu", "volver"]):
                user_states[numero_cliente] = "START"
                await enviar_whatsapp(numero_cliente, MENU_BIENVENIDA)

            elif state == "START":
                if mensaje == "1":
                    user_states[numero_cliente] = "CLIENT"
                    await enviar_whatsapp(numero_cliente, MENU_CLIENTE)
                elif mensaje == "2":
                    user_states[numero_cliente] = "PROSPECT"
                    await enviar_whatsapp(numero_cliente, MENSAJE_PROSPECTO)
                else:
                    await enviar_whatsapp(numero_cliente, "Escribe *'MENU'* para ver las opciones.")

            elif state == "CLIENT":
                if mensaje == "1":
                    await enviar_whatsapp(numero_cliente, RESPUESTA_PAGO)
                elif mensaje == "2":
                    phone_clean = numero_cliente.split('@')[0]
                    await enviar_whatsapp(numero_cliente, await promise_response_for_phone(phone_clean))
                elif mensaje == "3":
                    await enviar_whatsapp(numero_cliente, RESPUESTA_FACTURA)
                elif mensaje == "4":
                    await enviar_whatsapp(numero_cliente, RESPUESTA_SOPORTE)
                else:
                    await enviar_whatsapp(numero_cliente, "Opción no válida. Responde con el número (1-4) o escribe *'VOLVER'*.")

            elif state == "PROSPECT":
                if "interesa" in mensaje:
                    phone_clean = numero_cliente.split('@')[0]
                    await create_lead_with_contact(phone_clean)
                    await enviar_whatsapp(numero_cliente, "🚀 *¡Genial!* En breve un asesor te enviará los datos bancarios para coordinar tu instalación.")
                else:
                    await enviar_whatsapp(numero_cliente, "Escribe *'VOLVER'* para regresar al menú principal.")

        except Exception as exc:
            logger.exception("Error procesando mensaje: %s", exc)

    return {"status": "processed"}
