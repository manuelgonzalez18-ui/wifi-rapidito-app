from fastapi import BackgroundTasks, FastAPI, Request
from fastapi.responses import JSONResponse, PlainTextResponse
import hashlib
import hmac
import httpx
import json
import os
import logging
import time
from kommo_service import create_lead_with_contact

app = FastAPI()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("wifi-rapidito-bot")

# --- CONFIGURACIÓN ---
WHATSAPP_PROVIDER = os.getenv("WHATSAPP_PROVIDER", "evolution").strip().lower()

# Evolution se conserva como compatibilidad/fallback. El número principal de
# Wifi Rapidito funciona mediante Meta WhatsApp Business Platform.
EVO_API_URL = os.getenv("EVO_API_URL", "http://evolution_api:8080")
EVO_API_KEY = os.getenv("EVO_API_KEY", "")
INSTANCE_NAME = os.getenv("INSTANCE_NAME", "rapidito_bot")

# Meta WhatsApp Cloud API. Ninguna de estas credenciales debe guardarse en Git.
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")
META_PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID", "")
META_VERIFY_TOKEN = os.getenv("META_VERIFY_TOKEN", "")
META_APP_SECRET = os.getenv("META_APP_SECRET", "")
META_GRAPH_VERSION = os.getenv("META_GRAPH_VERSION", "v23.0")

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
_processed_message_ids = {}
MESSAGE_DEDUPE_TTL = 900

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


def mark_message_once(message_id):
    if not message_id:
        return True
    now = time.monotonic()
    expired = [key for key, seen_at in _processed_message_ids.items() if now - seen_at > MESSAGE_DEDUPE_TTL]
    for key in expired:
        _processed_message_ids.pop(key, None)
    if message_id in _processed_message_ids:
        return False
    _processed_message_ids[message_id] = now
    return True


def verify_meta_signature(raw_body, signature_header):
    if not META_APP_SECRET:
        # Meta permite validar el webhook con verify token. La firma se activa
        # automáticamente cuando META_APP_SECRET se configura en el VPS.
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(META_APP_SECRET.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    received = signature_header.split("=", 1)[1]
    return hmac.compare_digest(expected, received)


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
🚫 *Promesa de pago temporalmente no disponible*

🛡️ *Beneficio suspendido por incumplimiento*

Registramos el incumplimiento de una promesa de pago anterior. De acuerdo con la política de Wifi Rapidito, podrás solicitar nuevamente este beneficio a partir del *{blocked_until}*.

📅 La suspensión vence automáticamente; no afecta *pagos, facturas ni soporte técnico*.
"""


async def enviar_whatsapp(numero, texto):
    phone = normalize_phone(numero)
    if WHATSAPP_PROVIDER == "meta":
        if not META_ACCESS_TOKEN or not META_PHONE_NUMBER_ID or not phone:
            logger.error("Meta WhatsApp no está configurado completamente en el VPS.")
            return False
        url = f"https://graph.facebook.com/{META_GRAPH_VERSION}/{META_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {META_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "text",
            "text": {"preview_url": True, "body": texto},
        }
    else:
        url = f"{EVO_API_URL}/message/sendText/{INSTANCE_NAME}"
        headers = {"apikey": EVO_API_KEY}
        payload = {"number": numero, "text": texto, "delay": 500, "linkPreview": True}

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code < 200 or response.status_code >= 300:
                logger.error("Error enviando WhatsApp por %s: HTTP %s", WHATSAPP_PROVIDER, response.status_code)
                return False
            return True
        except Exception as exc:
            logger.error("Error enviando WhatsApp por %s: %s", WHATSAPP_PROVIDER, exc)
            return False


async def process_user_message(numero_cliente, mensaje):
    state_key = normalize_phone(numero_cliente) or str(numero_cliente)
    mensaje = str(mensaje or "").strip().lower()
    if not mensaje:
        return

    state = user_states.get(state_key, "START")

    if any(word in mensaje for word in ["hola", "buenas", "inicio", "menu", "volver"]):
        user_states[state_key] = "START"
        await enviar_whatsapp(numero_cliente, MENU_BIENVENIDA)
        return

    if state == "START":
        if mensaje == "1":
            user_states[state_key] = "CLIENT"
            await enviar_whatsapp(numero_cliente, MENU_CLIENTE)
        elif mensaje == "2":
            user_states[state_key] = "PROSPECT"
            await enviar_whatsapp(numero_cliente, MENSAJE_PROSPECTO)
        else:
            await enviar_whatsapp(numero_cliente, "Escribe *'MENU'* para ver las opciones.")
        return

    if state == "CLIENT":
        if mensaje == "1":
            await enviar_whatsapp(numero_cliente, RESPUESTA_PAGO)
        elif mensaje == "2":
            await enviar_whatsapp(numero_cliente, await promise_response_for_phone(state_key))
        elif mensaje == "3":
            await enviar_whatsapp(numero_cliente, RESPUESTA_FACTURA)
        elif mensaje == "4":
            await enviar_whatsapp(numero_cliente, RESPUESTA_SOPORTE)
        else:
            await enviar_whatsapp(numero_cliente, "Opción no válida. Responde con el número (1-4) o escribe *'VOLVER'*.")
        return

    if state == "PROSPECT":
        if "interesa" in mensaje:
            await create_lead_with_contact(state_key)
            await enviar_whatsapp(numero_cliente, "🚀 *¡Genial!* En breve un asesor te enviará los datos bancarios para coordinar tu instalación.")
        else:
            await enviar_whatsapp(numero_cliente, "Escribe *'VOLVER'* para regresar al menú principal.")


def meta_text_from_message(message):
    message_type = message.get("type")
    if message_type == "text":
        return (message.get("text") or {}).get("body", "")
    if message_type == "button":
        return (message.get("button") or {}).get("text", "")
    if message_type == "interactive":
        interactive = message.get("interactive") or {}
        reply_type = interactive.get("type")
        if reply_type == "button_reply":
            reply = interactive.get("button_reply") or {}
            return reply.get("title") or reply.get("id") or ""
        if reply_type == "list_reply":
            reply = interactive.get("list_reply") or {}
            return reply.get("title") or reply.get("id") or ""
    return ""


@app.get("/webhook")
async def health_or_meta_verification(request: Request):
    mode = request.query_params.get("hub.mode")
    verify_token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe":
        if not META_VERIFY_TOKEN:
            return JSONResponse({"error": "META_VERIFY_TOKEN no configurado"}, status_code=503)
        if hmac.compare_digest(verify_token or "", META_VERIFY_TOKEN):
            logger.info("Webhook de Meta verificado correctamente.")
            return PlainTextResponse(challenge or "")
        return JSONResponse({"error": "Verify token inválido"}, status_code=403)

    return {
        "status": "ok",
        "message": "Webhook receiver is active",
        "version": "3.0-meta-cloud-api",
        "provider": WHATSAPP_PROVIDER,
    }


@app.post("/webhook")
async def recibir_mensaje(request: Request, background_tasks: BackgroundTasks):
    raw_body = await request.body()
    try:
        data = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except (UnicodeDecodeError, json.JSONDecodeError):
        return JSONResponse({"error": "JSON inválido"}, status_code=400)

    # Meta WhatsApp Business Platform / Cloud API
    if data.get("object") == "whatsapp_business_account":
        signature = request.headers.get("x-hub-signature-256", "")
        if not verify_meta_signature(raw_body, signature):
            logger.warning("Webhook de Meta rechazado por firma inválida.")
            return JSONResponse({"error": "Firma inválida"}, status_code=403)

        accepted = 0
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value") or {}
                for message in value.get("messages") or []:
                    message_id = message.get("id")
                    if not mark_message_once(message_id):
                        continue
                    numero_cliente = message.get("from", "")
                    mensaje = meta_text_from_message(message)
                    if numero_cliente and mensaje:
                        background_tasks.add_task(process_user_message, numero_cliente, mensaje)
                        accepted += 1
        return {"status": "accepted", "messages": accepted}

    # Compatibilidad con el webhook anterior de Evolution API.
    if data.get("event") == "messages.upsert":
        try:
            msg_data = data["data"]
            if msg_data["key"].get("fromMe"):
                return {"status": "ignored"}

            message_id = msg_data.get("key", {}).get("id")
            if not mark_message_once(message_id):
                return {"status": "duplicate"}

            numero_cliente = msg_data["key"].get("remoteJid", "")
            message = msg_data.get("message", {})
            mensaje = ""
            if "conversation" in message:
                mensaje = message["conversation"]
            elif "extendedTextMessage" in message:
                mensaje = message["extendedTextMessage"].get("text", "")

            if numero_cliente and mensaje:
                background_tasks.add_task(process_user_message, numero_cliente, mensaje)
        except Exception as exc:
            logger.exception("Error procesando mensaje de Evolution: %s", exc)

    return {"status": "processed"}
