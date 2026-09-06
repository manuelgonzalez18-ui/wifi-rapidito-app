from fastapi import BackgroundTasks, FastAPI, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo
import hashlib
import hmac
import httpx
import json
import os
import logging
import re
import time

from kommo_service import create_lead_with_contact
from bot_flows import (
    BANK_DETAILS,
    MAIN_MENU,
    PAYMENT_METHODS,
    SUPPORT_TYPES,
    change_password_report,
    internal_ticket_report,
    monthly_amount_bs,
    normalize_amount,
    normalize_mac,
    normalize_reference,
    resolve_bank,
    valid_wifi_password,
)

app = FastAPI()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
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

WISPHUB_API_URL = os.getenv("WISPHUB_API_URL", "https://api.wisphub.app/api").rstrip("/")
WISPHUB_API_KEY = os.getenv("WISPHUB_API_KEY", "")
PORTAL_BASE_URL = os.getenv("PORTAL_BASE_URL", "https://wifirapidito.com").rstrip("/")
PROMISE_RESTRICTIONS_URL = os.getenv(
    "PROMISE_RESTRICTIONS_URL",
    f"{PORTAL_BASE_URL}/promise_restrictions.php",
)
PAYMENT_PROXY_URL = os.getenv("PAYMENT_PROXY_URL", f"{PORTAL_BASE_URL}/proxy_payments.php")
PROMISE_PROXY_URL = os.getenv("PROMISE_PROXY_URL", f"{PORTAL_BASE_URL}/proxy_promises.php")
TICKET_PROXY_URL = os.getenv("TICKET_PROXY_URL", f"{PORTAL_BASE_URL}/proxy.php")
BCV_RATE_URL = os.getenv("BCV_RATE_URL", "https://ve.dolarapi.com/v1/dolares/oficial")
ADMIN_REPORT_NUMBER = os.getenv("ADMIN_REPORT_NUMBER", "584120330315")
MONTHLY_PRICE_USD = Decimal(os.getenv("MONTHLY_PRICE_USD", "25"))
CARACAS = ZoneInfo("America/Caracas")

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

MENSAJE_PROSPECTO = """
🌐 *Información Especializada*

Actualmente contamos con cobertura en:
📍 *Sotillo, Ciudad Brión, Las González, Las Martínez, Prado Largo, Gamelotal, Bosque de Curiepe* y próximamente en más comunidades del municipio Brión.

💰 *Oferta de Instalación:*
El costo es de **65$** e incluye el **primer mes de servicio GRATIS**. 🎁

¿Deseas contratar el servicio? Responde **'ME INTERESA'** para suministrarte los datos bancarios.
"""

SUPPORT_SUBJECTS = {
    "4": "No Tiene Internet",
    "5": "Internet Lento",
    "6": "Internet Intermitente",
    "7": "Falla Masiva En Mi Comunidad",
}


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
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(META_APP_SECRET.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    received = signature_header.split("=", 1)[1]
    return hmac.compare_digest(expected, received)


def state_for(phone):
    key = normalize_phone(phone) or str(phone)
    state = user_states.get(key)
    if not isinstance(state, dict):
        state = {"mode": "START", "identity": None, "data": {}}
        user_states[key] = state
    state.setdefault("mode", "START")
    state.setdefault("identity", None)
    state.setdefault("data", {})
    return state


def reset_to_client_menu(state):
    state["mode"] = "CLIENT_MENU"
    state["data"] = {}


def display_name(identity):
    return str((identity or {}).get("name") or "cliente").strip()


def is_yes(value):
    return str(value or "").strip().lower() in {"si", "sí", "s", "yes", "1", "confirmar", "confirmo"}


def is_no(value):
    return str(value or "").strip().lower() in {"no", "n", "cancelar", "cancelo", "2"}


def normalize_payment_date(value):
    text = str(value or "").strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            pass
    return None


def is_pending_invoice(invoice):
    status = str(invoice.get("estado", "") if isinstance(invoice, dict) else "").lower().strip()
    return (
        "pendiente" in status
        or "por_pagar" in status
        or "por pagar" in status
        or "unpaid" in status
        or invoice.get("estado") == 2
        or status == "2"
    )


def invoice_id(invoice):
    if not isinstance(invoice, dict):
        return ""
    return str(invoice.get("id_factura") or invoice.get("id") or "").strip()


def invoice_display(invoice):
    if not isinstance(invoice, dict):
        return ""
    return str(invoice.get("folio") or invoice.get("numero_factura") or invoice_id(invoice)).strip()


def extract_ticket_id(payload):
    if isinstance(payload, dict):
        for key in ("id_ticket", "ticket_id", "id"):
            value = payload.get(key)
            if value not in (None, "") and not isinstance(value, (dict, list)):
                return str(value)
        for value in payload.values():
            found = extract_ticket_id(value)
            if found:
                return found
    elif isinstance(payload, list):
        for item in payload:
            found = extract_ticket_id(item)
            if found:
                return found
    return ""


async def load_wisphub_clients(force=False):
    now = time.monotonic()
    if not force and _client_cache["clients"] and now - _client_cache["loaded_at"] < CLIENT_CACHE_TTL:
        return _client_cache["clients"]

    if not WISPHUB_API_KEY:
        logger.warning("WISPHUB_API_KEY no está configurada; no se puede identificar al cliente.")
        return []

    headers = {"Authorization": f"Api-Key {WISPHUB_API_KEY}", "Accept": "application/json"}
    clients = []
    offset = 0
    limit = 300

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        for _ in range(40):
            response = await client.get(
                f"{WISPHUB_API_URL}/clientes/",
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


def identity_from_client(client):
    service = client_value(client, ["id_servicio", "servicio_id"])
    if not service and isinstance(client.get("servicio"), dict):
        service = scalar_id(client["servicio"])
    raw_name = client_value(
        client,
        ["nombre", "nombre_cliente", "cliente", "name", "razon_social", "nombre_completo"],
        "Cliente",
    )
    if isinstance(raw_name, dict):
        raw_name = client_value(raw_name, ["nombre", "name"], "Cliente")
    return {
        "service_id": scalar_id(service),
        "client_id": scalar_id(client_value(client, ["id_cliente", "cliente_id", "id"])),
        "username": normalize_username(client_value(client, ["usuario", "usuario_portal", "username"])),
        "name": str(raw_name or "Cliente").strip(),
        "phone": normalize_phone(client_value(client, ["telefono", "movil", "celular", "phone"])),
        "status": str(client_value(client, ["estado", "status", "estado_servicio"], "")).strip(),
        "raw": client,
    }


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
            return identity_from_client(client)
    return None


async def wisphub_get(path, params=None):
    if not WISPHUB_API_KEY:
        raise RuntimeError("WISPHUB_API_KEY no configurada")
    headers = {"Authorization": f"Api-Key {WISPHUB_API_KEY}", "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        response = await client.get(f"{WISPHUB_API_URL}/{path.lstrip('/')}", params=params or {}, headers=headers)
        response.raise_for_status()
        return response.json()


async def load_pending_invoices(identity):
    if not identity:
        return []

    service_id = str(identity.get("service_id") or "").strip()
    username = normalize_username(identity.get("username"))

    # Fuente principal recomendada por WispHub para portales/chatbots:
    # el saldo del cliente ya trae únicamente sus facturas pendientes.
    if service_id:
        try:
            payload = await wisphub_get(f"clientes/{service_id}/saldo/")
            summaries = payload.get("facturas", []) if isinstance(payload, dict) else []
            if not isinstance(summaries, list):
                summaries = []

            unique = {}
            for summary in summaries:
                if not isinstance(summary, dict):
                    continue

                iid = invoice_id(summary)
                invoice = dict(summary)

                # Enriquecer con el detalle real para conservar estado, folio
                # y demás campos que usan las respuestas del asistente.
                if iid:
                    try:
                        detail = await wisphub_get(f"facturas/{iid}/")
                        if isinstance(detail, dict):
                            invoice.update(detail)
                    except Exception as exc:
                        logger.info("Detalle de factura %s no disponible: %s", iid, exc)

                if not invoice.get("estado"):
                    invoice["estado"] = "Pendiente de Pago"

                iid = invoice_id(invoice) or iid
                if iid and is_pending_invoice(invoice):
                    unique[iid] = invoice

            return sorted(
                unique.values(),
                key=lambda item: int(invoice_id(item) or 0),
                reverse=True,
            )
        except Exception as exc:
            logger.warning(
                "Consulta oficial de saldo WispHub falló service_id=%s: %s",
                service_id,
                exc,
            )

    # Fallback solamente para identidades antiguas sin id_servicio.
    # Aunque WispHub ignore el filtro remoto, verificamos localmente
    # que la factura pertenezca al usuario antes de aceptarla.
    if not username:
        return []

    try:
        payload = await wisphub_get("facturas/", params={"cliente": username, "limit": 50})
    except Exception as exc:
        logger.info("Fallback de facturas falló usuario=%s: %s", username, exc)
        return []

    items = payload.get("results", []) if isinstance(payload, dict) else payload
    if not isinstance(items, list):
        return []

    unique = {}
    for item in items:
        if not isinstance(item, dict) or not is_pending_invoice(item):
            continue
        client = item.get("cliente")
        invoice_username = ""
        if isinstance(client, dict):
            invoice_username = normalize_username(
                client.get("usuario") or client.get("usuario_portal") or client.get("username")
            )
        elif client not in (None, ""):
            invoice_username = normalize_username(client)

        if invoice_username != username:
            continue
        iid = invoice_id(item)
        if iid:
            unique[iid] = item

    return sorted(
        unique.values(),
        key=lambda item: int(invoice_id(item) or 0),
        reverse=True,
    )


async def get_bcv_rate():
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        response = await client.get(BCV_RATE_URL)
        response.raise_for_status()
        data = response.json()
    for key in ("promedio", "venta", "compra"):
        value = data.get(key) if isinstance(data, dict) else None
        if value not in (None, ""):
            rate = Decimal(str(value))
            if rate > 0:
                return rate
    raise RuntimeError("Tasa BCV inválida")


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


def promise_window():
    today = datetime.now(CARACAS).date()
    day = today.day
    is_open = day >= 13 or day <= 5
    if day <= 5:
        max_date = today.replace(day=5)
    else:
        if today.month == 12:
            max_date = date(today.year + 1, 1, 5)
        else:
            max_date = date(today.year, today.month + 1, 5)
    next_open = date(today.year, today.month, 13) if 6 <= day <= 12 else None
    return {"today": today, "is_open": is_open, "max": max_date, "next_open": next_open}


async def enviar_whatsapp(numero, texto):
    phone = normalize_phone(numero)
    if WHATSAPP_PROVIDER == "meta":
        if not META_ACCESS_TOKEN or not META_PHONE_NUMBER_ID or not phone:
            logger.error("Meta WhatsApp no está configurado completamente en el VPS.")
            return False
        url = f"https://graph.facebook.com/{META_GRAPH_VERSION}/{META_PHONE_NUMBER_ID}/messages"
        headers = {"Authorization": f"Bearer {META_ACCESS_TOKEN}", "Content-Type": "application/json"}
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


async def send_admin_report(text):
    if not ADMIN_REPORT_NUMBER:
        return False
    return await enviar_whatsapp(ADMIN_REPORT_NUMBER, text)


def bank_details_text(rate=None):
    lines = [
        "🏦 *Datos Bancarios - Banesco*", "", "📲 *Pago Móvil*",
        f"Banco: {BANK_DETAILS['bank']}", f"RIF: {BANK_DETAILS['rif']}", f"Teléfono: {BANK_DETAILS['mobile_phone']}",
        "", "🏦 *Transferencia / Depósito*", f"Titular: {BANK_DETAILS['holder']}", f"RIF: {BANK_DETAILS['rif']}",
        f"Cuenta: {BANK_DETAILS['account']}",
    ]
    if rate:
        amount = monthly_amount_bs(rate, MONTHLY_PRICE_USD)
        lines.extend(["", f"💵 Mensualidad: *${MONTHLY_PRICE_USD}*", f"💰 Monto BCV: *{amount} Bs*"])
    lines.extend(["", "Escribe *2* para reportar tu pago o *MENU* para volver."])
    return "\n".join(lines)


def payment_method_text():
    return "\n".join([
        "💳 *¿Cómo realizaste el pago?*", "", "1. Pago Móvil Banesco → Banesco",
        "2. Pago Móvil de otros bancos → Banesco", "3. Transferencia Banesco → Banesco",
        "4. Transferencia de otros bancos → Banesco", "", "Responde con el número de la opción.",
    ])


def banks_text():
    from bot_flows import VENEZUELAN_BANKS
    lines = ["🏦 *Banco de origen*", "Selecciona el banco desde donde realizaste el pago:"]
    for index, (code, name) in enumerate(VENEZUELAN_BANKS.items(), start=1):
        lines.append(f"{index}. {name} ({code})")
    lines.append("\nTambién puedes escribir el código bancario o el nombre.")
    return "\n".join(lines)


def support_description(data):
    parts = [f"Comunidad: {data.get('community', '')}"]
    if data.get("mac"):
        parts.append(f"MAC: {data['mac']}")
    if data.get("red_light"):
        parts.append(f"Luz roja: {data['red_light']}")
    parts.append(f"Descripción del cliente: {data.get('description', '')}")
    return "<p>" + "<br>".join(parts) + "</p>"


async def create_support_ticket(identity, option, data):
    payload = {
        "servicio": identity.get("service_id") or identity.get("client_id"),
        "asunto": SUPPORT_SUBJECTS[option], "departamento": "Soporte Técnico",
        "descripcion": support_description(data), "prioridad": "media",
    }
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.post(TICKET_PROXY_URL, data=payload)
    body_text = response.text
    try:
        body = response.json()
    except Exception:
        body = {"raw": body_text}
    if response.status_code < 200 or response.status_code >= 300:
        raise RuntimeError(body.get("detail") or body.get("error") or body_text[:300] or f"HTTP {response.status_code}")
    ticket = extract_ticket_id(body)
    if not ticket:
        logger.error("Ticket creado pero sin id_ticket reconocible: %s", body)
        raise RuntimeError("WispHub creó la gestión pero no devolvió un número de ticket reconocible")
    return ticket, body


async def create_password_ticket(identity, data):
    payload = {
        "servicio": identity.get("service_id") or identity.get("client_id"),
        "asunto": "Cambio De Contraseña En Router Wifi", "departamento": "Soporte Técnico",
        "descripcion": (
            "<p>Solicitud de cambio de clave vía WhatsApp Bot.<br>"
            f"Comunidad: {data['community']}<br>Nueva clave: {data['new_password']}<br>MAC Router: {data['mac']}</p>"
        ),
        "prioridad": "media",
    }
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.post(TICKET_PROXY_URL, data=payload)
    text = response.text
    try:
        body = response.json()
    except Exception:
        body = {"raw": text}
    if response.status_code < 200 or response.status_code >= 300:
        raise RuntimeError(body.get("detail") or body.get("error") or text[:300] or f"HTTP {response.status_code}")
    ticket = extract_ticket_id(body)
    if not ticket:
        raise RuntimeError("WispHub no devolvió el número del ticket")
    return ticket, body


async def register_verified_payment(identity, invoice, data):
    form = {
        "invoice_id": invoice_id(invoice), "reference": data["reference"],
        "user_name": identity.get("username") or display_name(identity), "forma_pago": "16749",
        "payment_date": data["payment_date"], "amount": str(data["amount"]),
        "banco_origen": data.get("origin_bank_code", ""), "phone_emisor": data.get("sender_phone", ""),
    }
    async with httpx.AsyncClient(timeout=40.0, follow_redirects=True) as client:
        response = await client.post(PAYMENT_PROXY_URL, data=form)
    try:
        body = response.json()
    except Exception:
        body = {"message": response.text[:500]}
    if 200 <= response.status_code < 300 and body.get("status") == "success":
        return True, body
    return False, body


async def register_promise(identity, invoice, deadline):
    payload = {"id_factura": int(invoice_id(invoice)), "fecha_limite": deadline, "comentarios": "Promesa registrada vía WhatsApp Bot", "accion": 1}
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.post(PROMISE_PROXY_URL, json=payload)
    try:
        body = response.json()
    except Exception:
        body = {"error": response.text[:500]}
    if response.status_code < 200 or response.status_code >= 300:
        raise RuntimeError(body.get("error") or body.get("detail") or f"HTTP {response.status_code}")
    return body


async def show_client_menu(numero_cliente, state, identity=None):
    identity = identity or state.get("identity") or await find_client_by_whatsapp_phone(numero_cliente)
    if not identity:
        state["mode"] = "START"; state["identity"] = None; state["data"] = {}
        await enviar_whatsapp(numero_cliente, "No pude asociar este WhatsApp con un servicio activo en WispHub.\n\nVerifica que estés escribiendo desde el número registrado o escribe *MENU* para volver al inicio.")
        return
    state["identity"] = identity
    reset_to_client_menu(state)
    await enviar_whatsapp(numero_cliente, MAIN_MENU.format(name=display_name(identity)))


async def handle_debt(numero_cliente, state):
    identity = state["identity"]
    invoices = await load_pending_invoices(identity)
    if not invoices:
        await enviar_whatsapp(numero_cliente, f"✅ *{display_name(identity)}*, no tienes facturas pendientes de pago.\n\nEscribe *MENU* para volver.")
        return
    try:
        rate = await get_bcv_rate(); amount = monthly_amount_bs(rate, MONTHLY_PRICE_USD)
        message = (
            f"💰 *Monto pendiente*\n\n👤 {display_name(identity)}\n🧾 Factura: *#{invoice_display(invoices[0])}*\n"
            f"💵 Mensualidad: *${MONTHLY_PRICE_USD}*\n📈 Tasa BCV: *{rate} Bs/$*\n💰 Total a pagar: *{amount} Bs*\n\n{bank_details_text()}"
        )
    except Exception as exc:
        logger.warning("No se pudo obtener tasa BCV: %s", exc)
        message = f"💰 Tienes una factura pendiente por *${MONTHLY_PRICE_USD}*.\n\nNo pude consultar la tasa BCV en este momento. Intenta nuevamente en unos minutos.\n\n{bank_details_text()}"
    await enviar_whatsapp(numero_cliente, message)


async def start_payment(numero_cliente, state):
    identity = state["identity"]
    invoices = await load_pending_invoices(identity)
    if not invoices:
        await enviar_whatsapp(numero_cliente, "✅ No tienes facturas pendientes para reportar.")
        return
    invoice = invoices[0]; data = {"invoice": invoice}
    try:
        rate = await get_bcv_rate(); data["bcv_rate"] = str(rate); data["expected_amount"] = str(monthly_amount_bs(rate, MONTHLY_PRICE_USD))
        intro = f"💳 *Reportar Pago*\n\n🧾 Factura: *#{invoice_display(invoice)}*\n💵 Mensualidad: *${MONTHLY_PRICE_USD}*\n💰 Monto BCV: *{data['expected_amount']} Bs*\n\n{bank_details_text()}\n\n{payment_method_text()}"
    except Exception as exc:
        logger.warning("Tasa BCV no disponible al iniciar pago: %s", exc)
        intro = f"💳 *Reportar Pago*\n\n🧾 Factura: *#{invoice_display(invoice)}*\n\n{payment_method_text()}"
    state["mode"] = "PAYMENT_METHOD"; state["data"] = data
    await enviar_whatsapp(numero_cliente, intro)


async def handle_payment_flow(numero_cliente, state, mensaje):
    data = state["data"]; mode = state["mode"]
    if mode == "PAYMENT_METHOD":
        if mensaje not in PAYMENT_METHODS:
            await enviar_whatsapp(numero_cliente, "Opción no válida.\n\n" + payment_method_text()); return
        data["method"] = mensaje; data["method_label"] = PAYMENT_METHODS[mensaje]
        if mensaje in {"2", "4"}:
            state["mode"] = "PAYMENT_BANK"; await enviar_whatsapp(numero_cliente, banks_text())
        elif mensaje in {"1", "2"}:
            state["mode"] = "PAYMENT_PHONE"; await enviar_whatsapp(numero_cliente, "📱 Indica el *teléfono emisor* del Pago Móvil.")
        else:
            state["mode"] = "PAYMENT_REFERENCE"; await enviar_whatsapp(numero_cliente, "🔢 Indica los *últimos 6 dígitos de la referencia*.")
        return
    if mode == "PAYMENT_BANK":
        bank = resolve_bank(mensaje)
        if not bank:
            await enviar_whatsapp(numero_cliente, "No reconocí ese banco. Puedes responder con el número, código bancario o nombre.\n\n" + banks_text()); return
        data["origin_bank_code"], data["origin_bank_name"] = bank
        if data["method"] == "2":
            state["mode"] = "PAYMENT_PHONE"; await enviar_whatsapp(numero_cliente, "📱 Indica el *teléfono emisor* del Pago Móvil.")
        else:
            state["mode"] = "PAYMENT_REFERENCE"; await enviar_whatsapp(numero_cliente, "🔢 Indica los *últimos 6 dígitos de la referencia*.")
        return
    if mode == "PAYMENT_PHONE":
        phone = normalize_phone(mensaje)
        if len(phone) < 10:
            await enviar_whatsapp(numero_cliente, "El teléfono no parece válido. Escríbelo nuevamente, por ejemplo: 04121234567."); return
        data["sender_phone"] = phone; state["mode"] = "PAYMENT_REFERENCE"
        await enviar_whatsapp(numero_cliente, "🔢 Indica los *últimos 6 dígitos de la referencia*."); return
    if mode == "PAYMENT_REFERENCE":
        ref = normalize_reference(mensaje)
        if not ref:
            await enviar_whatsapp(numero_cliente, "La referencia debe contener exactamente *6 dígitos*. Intenta nuevamente."); return
        data["reference"] = ref; state["mode"] = "PAYMENT_AMOUNT"; expected = data.get("expected_amount")
        suffix = f"\nMonto esperado según BCV: *{expected} Bs*." if expected else ""
        await enviar_whatsapp(numero_cliente, f"💰 Indica el *monto exacto pagado en Bs.* usando punto para los decimales.{suffix}"); return
    if mode == "PAYMENT_AMOUNT":
        amount = normalize_amount(mensaje)
        if amount is None:
            await enviar_whatsapp(numero_cliente, "Monto inválido. Ejemplo: *3250.50*"); return
        data["amount"] = amount; state["mode"] = "PAYMENT_DATE"
        await enviar_whatsapp(numero_cliente, "📅 Indica la *fecha del pago* en formato DD/MM/AAAA o AAAA-MM-DD."); return
    if mode == "PAYMENT_DATE":
        payment_date = normalize_payment_date(mensaje)
        if not payment_date:
            await enviar_whatsapp(numero_cliente, "Fecha inválida. Usa DD/MM/AAAA o AAAA-MM-DD."); return
        data["payment_date"] = payment_date; state["mode"] = "PAYMENT_CONFIRM"
        bank = data.get("origin_bank_name", "Banesco"); phone = data.get("sender_phone", "No aplica")
        await enviar_whatsapp(numero_cliente, "\n".join([
            "📝 *Confirma tus datos*", "", f"👤 Cliente: {display_name(state['identity'])}", f"🧾 Factura: #{invoice_display(data['invoice'])}",
            f"💳 Tipo: {data['method_label']}", f"🏦 Banco origen: {bank}", f"📱 Teléfono emisor: {phone}", f"🔢 Referencia: ******{data['reference']}",
            f"💰 Monto: {data['amount']} Bs", f"📅 Fecha: {data['payment_date']}", "", "Responde *SI* para validar con Banesco o *NO* para cancelar.",
        ])); return
    if mode == "PAYMENT_CONFIRM":
        if is_no(mensaje):
            reset_to_client_menu(state); await enviar_whatsapp(numero_cliente, "❌ Reporte de pago cancelado.\n\n" + MAIN_MENU.format(name=display_name(state["identity"]))); return
        if not is_yes(mensaje):
            await enviar_whatsapp(numero_cliente, "Responde *SI* para continuar o *NO* para cancelar."); return
        await enviar_whatsapp(numero_cliente, "⌛ *Validando con el banco…*")
        try:
            ok, result = await register_verified_payment(state["identity"], data["invoice"], data)
        except Exception as exc:
            ok, result = False, {"message": str(exc)}
        bank = data.get("origin_bank_name", "Banesco")
        if ok:
            report = "\n".join([
                "🔔 *Pago Verificado Automáticamente*", "━━━━━━━━━━━━━━━━━━━━", f"👤 Cliente: {display_name(state['identity'])}", f"🧾 Factura: #{invoice_display(data['invoice'])}",
                f"💳 Modalidad: {data['method_label']}", f"💰 Monto: {data['amount']} Bs", f"🔢 Referencia: {data['reference']}", f"🏦 Banco origen: {bank}",
                f"📱 Teléfono emisor: {data.get('sender_phone', 'No aplica')}", "✅ Validación: Banesco", "📲 Vía: WhatsApp Bot",
            ])
            await send_admin_report(report)
            await enviar_whatsapp(numero_cliente, f"✅ *¡Pago verificado y registrado!*\n\n🧾 Factura #{invoice_display(data['invoice'])}\n💰 Monto: {data['amount']} Bs\n\nWispHub registró el pago y procesará la reactivación del servicio automáticamente. 🚀")
        else:
            reason = result.get("message") or result.get("error") or "No fue posible validar la operación automáticamente."
            report = "\n".join([
                "⚠️ *Pago NO verificado (revisión manual)*", "━━━━━━━━━━━━━━━━━━━━", f"👤 Cliente: {display_name(state['identity'])}", f"📱 WhatsApp: {normalize_phone(numero_cliente)}",
                f"🧾 Factura: #{invoice_display(data['invoice'])}", f"💳 Modalidad: {data['method_label']}", f"💰 Monto: {data['amount']} Bs", f"🔢 Referencia: {data['reference']}",
                f"🏦 Banco origen: {bank}", f"📱 Teléfono emisor: {data.get('sender_phone', 'No aplica')}", f"📋 Motivo: {reason}", "📲 Vía: WhatsApp Bot",
            ])
            await send_admin_report(report)
            await enviar_whatsapp(numero_cliente, "⚠️ *No pudimos verificar el pago automáticamente.*\n\nLa información fue enviada para *revisión manual*. No se marcará la factura como pagada hasta que la operación sea confirmada.")
        reset_to_client_menu(state); return


async def start_support(numero_cliente, state, option):
    state["data"] = {"support_option": option}
    if SUPPORT_TYPES[option]["requires_mac"]:
        state["mode"] = "SUPPORT_MAC"; await enviar_whatsapp(numero_cliente, "📦 Indica la *MAC del equipo/router* (12 caracteres).\nEjemplo: 4CD7C86AF250")
    else:
        state["mode"] = "SUPPORT_COMMUNITY"; await enviar_whatsapp(numero_cliente, "🏠 Indica tu *comunidad o sector*.")


async def handle_support_flow(numero_cliente, state, mensaje):
    data = state["data"]; option = data["support_option"]; mode = state["mode"]
    if mode == "SUPPORT_MAC":
        mac = normalize_mac(mensaje)
        if not mac:
            await enviar_whatsapp(numero_cliente, "MAC inválida. Debe tener 12 caracteres hexadecimales. Ejemplo: 4CD7C86AF250"); return
        data["mac"] = mac; state["mode"] = "SUPPORT_COMMUNITY"; await enviar_whatsapp(numero_cliente, "🏠 Indica tu *comunidad o sector*."); return
    if mode == "SUPPORT_COMMUNITY":
        if len(mensaje.strip()) < 2:
            await enviar_whatsapp(numero_cliente, "Indica el nombre de tu comunidad o sector."); return
        data["community"] = mensaje.strip(); state["mode"] = "SUPPORT_RED_LIGHT"
        await enviar_whatsapp(numero_cliente, "🔴 ¿El equipo presenta *luz roja*?\nResponde *SI* o *NO*. Puedes agregar una observación breve."); return
    if mode == "SUPPORT_RED_LIGHT":
        data["red_light"] = mensaje.strip(); state["mode"] = "SUPPORT_DESCRIPTION"
        await enviar_whatsapp(numero_cliente, "📋 Describe lo que está ocurriendo y, si puedes, indica *desde cuándo* presenta la falla."); return
    if mode == "SUPPORT_DESCRIPTION":
        if len(mensaje.strip()) < 3:
            await enviar_whatsapp(numero_cliente, "Necesito una breve descripción de la falla."); return
        data["description"] = mensaje.strip(); await enviar_whatsapp(numero_cliente, "⌛ *Creando ticket de soporte…*")
        try:
            ticket_id, _ = await create_support_ticket(state["identity"], option, data)
        except Exception as exc:
            logger.exception("No se pudo crear ticket de falla")
            await enviar_whatsapp(numero_cliente, f"⚠️ No pude crear el ticket en WispHub en este momento.\nDetalle: {exc}\n\nLa gestión no fue marcada como creada.")
            reset_to_client_menu(state); return
        report = internal_ticket_report(ticket_id=ticket_id, issue_label=SUPPORT_TYPES[option]["label"], client=display_name(state["identity"]), whatsapp=normalize_phone(numero_cliente), community=data["community"], mac=data.get("mac"), red_light=data.get("red_light"), description=data["description"])
        await send_admin_report(report)
        await enviar_whatsapp(numero_cliente, f"✅ *Ticket creado correctamente*\n\n🔢 Ticket: *#{ticket_id}*\n🛠️ Asunto: *{SUPPORT_SUBJECTS[option]}*\n🏠 Comunidad: {data['community']}\n\nNuestro equipo técnico revisará tu reporte.")
        reset_to_client_menu(state)


async def start_change_password(numero_cliente, state):
    state["mode"] = "PASSWORD_MAC"; state["data"] = {}
    await enviar_whatsapp(numero_cliente, "🔑 *Cambio de Clave WiFi - Paso 1 de 3*\n\nIndica la *MAC del router* (12 caracteres).\nEjemplo: 4CD7C86AF250")


async def handle_password_flow(numero_cliente, state, mensaje):
    data = state["data"]; mode = state["mode"]
    if mode == "PASSWORD_MAC":
        mac = normalize_mac(mensaje)
        if not mac:
            await enviar_whatsapp(numero_cliente, "MAC inválida. Ejemplo válido: *4CD7C86AF250*"); return
        data["mac"] = mac; state["mode"] = "PASSWORD_COMMUNITY"
        await enviar_whatsapp(numero_cliente, f"✅ MAC detectada: *{mac}*\n\n🔑 *Paso 2 de 3*\nIndica el nombre de tu *comunidad o red WiFi*."); return
    if mode == "PASSWORD_COMMUNITY":
        if len(mensaje.strip()) < 2:
            await enviar_whatsapp(numero_cliente, "Indica el nombre de tu comunidad o red WiFi."); return
        data["community"] = mensaje.strip(); state["mode"] = "PASSWORD_NEW"
        await enviar_whatsapp(numero_cliente, "🔑 *Paso 3 de 3*\n\nEscribe la *nueva clave WiFi*.\nDebe tener mínimo *8 caracteres* y *no puede contener espacios*."); return
    if mode == "PASSWORD_NEW":
        password = mensaje.strip()
        if not valid_wifi_password(password):
            await enviar_whatsapp(numero_cliente, "La clave debe tener mínimo 8 caracteres y no puede contener espacios. Intenta nuevamente."); return
        data["new_password"] = password; state["mode"] = "PASSWORD_CONFIRM"
        await enviar_whatsapp(numero_cliente, "\n".join(["📝 *Confirma tu solicitud*", "", f"👤 Cliente: {display_name(state['identity'])}", f"📡 Comunidad: {data['community']}", f"🔑 Nueva clave: {data['new_password']}", f"🔗 MAC Router: {data['mac']}", "", "Responde *SI* para crear el ticket o *NO* para cancelar."])); return
    if mode == "PASSWORD_CONFIRM":
        if is_no(mensaje):
            reset_to_client_menu(state); await enviar_whatsapp(numero_cliente, "❌ Solicitud cancelada.\n\n" + MAIN_MENU.format(name=display_name(state["identity"]))); return
        if not is_yes(mensaje):
            await enviar_whatsapp(numero_cliente, "Responde *SI* para crear el ticket o *NO* para cancelar."); return
        await enviar_whatsapp(numero_cliente, "⌛ *Creando ticket de soporte…*")
        try:
            ticket_id, _ = await create_password_ticket(state["identity"], data)
        except Exception as exc:
            logger.exception("No se pudo crear ticket de cambio de clave"); await enviar_whatsapp(numero_cliente, f"⚠️ No pude crear el ticket en WispHub.\nDetalle: {exc}"); reset_to_client_menu(state); return
        report = change_password_report(ticket_id=ticket_id, client=display_name(state["identity"]), whatsapp=normalize_phone(numero_cliente), service_id=state["identity"].get("service_id", ""), community=data["community"], new_password=data["new_password"], mac=data["mac"])
        await send_admin_report(report)
        await enviar_whatsapp(numero_cliente, f"✅ *Ticket creado correctamente*\n\n🔢 Ticket: *#{ticket_id}*\n📋 Asunto: *Cambio De Contraseña En Router Wifi*\n📡 Comunidad: {data['community']}\n🔑 Nueva clave: {data['new_password']}\n🔗 MAC: {data['mac']}\n\nEl equipo técnico procesará la solicitud y te notificará cuando esté lista.")
        reset_to_client_menu(state)


async def show_service_status(numero_cliente, state):
    identity = await find_client_by_whatsapp_phone(numero_cliente) or state["identity"]; state["identity"] = identity
    status = str(identity.get("status") or "").strip(); low = status.lower()
    if "suspend" in low or "cort" in low:
        label = "🔴 *Suspendido*"
    elif "activ" in low:
        label = "🟢 *Activo*"
    else:
        label = f"📊 *{status or 'Sin estado disponible'}*"
    await enviar_whatsapp(numero_cliente, f"📊 *Estado de mi Servicio*\n\n👤 {display_name(identity)}\n🆔 Servicio: {identity.get('service_id') or '—'}\nEstado: {label}")


async def start_promise(numero_cliente, state):
    identity = state["identity"]; restriction = await get_promise_restriction(identity)
    if restriction:
        blocked_until = restriction.get("blocked_until", "la fecha indicada")
        message = (
            "🚫 *Promesa de pago temporalmente no disponible*\n\n"
            "🛡️ *Beneficio suspendido por incumplimiento*\n\n"
            "Registramos el incumplimiento de una promesa de pago anterior.\n\n"
            "De acuerdo con la política de *Wifi Rapidito*, este beneficio se encuentra suspendido temporalmente.\n\n"
            f"📅 *Podrás solicitar nuevamente una Promesa de Pago a partir del {blocked_until}.*\n\n"
            "La suspensión vence automáticamente en esa fecha y aplica únicamente a nuevas promesas de pago.\n\n"
            "✅ Puedes continuar usando con normalidad las opciones de *pagos, facturas y soporte técnico*."
        )
        await enviar_whatsapp(numero_cliente, message)
        return
    window = promise_window()
    if not window["is_open"]:
        await enviar_whatsapp(numero_cliente, "⏳ *Promesa de Pago no disponible hoy*\n\nLa ventana mensual está disponible del día *13* al día *5* del mes siguiente.\n" + f"📅 Próxima apertura: *{window['next_open'].isoformat()}*."); return
    invoices = await load_pending_invoices(identity)
    if not invoices:
        await enviar_whatsapp(numero_cliente, "✅ No tienes facturas pendientes. No necesitas registrar una promesa de pago."); return
    if len(invoices) != 1:
        await enviar_whatsapp(numero_cliente, "⚠️ La promesa de pago requiere *exactamente una factura pendiente*.\n" + f"Actualmente WispHub muestra {len(invoices)} facturas pendientes."); return
    invoice = invoices[0]; state["data"] = {"invoice": invoice, "promise_max": window["max"].isoformat()}; state["mode"] = "PROMISE_DATE"
    await enviar_whatsapp(numero_cliente, f"💜 *Promesa de Pago*\n\n🧾 Factura: *#{invoice_display(invoice)}*\n📅 Indica la fecha límite en la que realizarás el pago.\nDebe estar entre *{window['today'].isoformat()}* y *{window['max'].isoformat()}*.")


async def handle_promise_flow(numero_cliente, state, mensaje):
    data = state["data"]; mode = state["mode"]
    if mode == "PROMISE_DATE":
        payment_date = normalize_payment_date(mensaje)
        if not payment_date:
            await enviar_whatsapp(numero_cliente, "Fecha inválida. Usa DD/MM/AAAA o AAAA-MM-DD."); return
        selected = date.fromisoformat(payment_date); window = promise_window()
        if selected < window["today"] or selected > window["max"]:
            await enviar_whatsapp(numero_cliente, f"La fecha debe estar entre *{window['today'].isoformat()}* y *{window['max'].isoformat()}*."); return
        data["deadline"] = payment_date; state["mode"] = "PROMISE_CONFIRM"
        await enviar_whatsapp(numero_cliente, "\n".join(["📝 *Confirma tu Promesa de Pago*", "", f"👤 Cliente: {display_name(state['identity'])}", f"🧾 Factura: #{invoice_display(data['invoice'])}", f"📅 Fecha límite: {data['deadline']}", "", "Al confirmar, WispHub registrará la promesa y procesará la reactivación asociada.", "", "Responde *SI* para confirmar o *NO* para cancelar."])); return
    if mode == "PROMISE_CONFIRM":
        if is_no(mensaje):
            reset_to_client_menu(state); await enviar_whatsapp(numero_cliente, "❌ Promesa cancelada."); return
        if not is_yes(mensaje):
            await enviar_whatsapp(numero_cliente, "Responde *SI* para confirmar o *NO* para cancelar."); return
        await enviar_whatsapp(numero_cliente, "⌛ *Registrando promesa en WispHub…*")
        try:
            await register_promise(state["identity"], data["invoice"], data["deadline"])
        except Exception as exc:
            logger.exception("No se pudo registrar promesa"); await enviar_whatsapp(numero_cliente, f"⚠️ No pude registrar la promesa en WispHub.\nDetalle: {exc}"); reset_to_client_menu(state); return
        report = "\n".join(["🔔 *Promesa de Pago Registrada*", "━━━━━━━━━━━━━━━━━━━━", f"👤 Cliente: {display_name(state['identity'])}", f"📱 WhatsApp: {normalize_phone(numero_cliente)}", f"🧾 Factura: #{invoice_display(data['invoice'])}", f"📅 Fecha límite: {data['deadline']}", "📲 Vía: WhatsApp Bot"])
        await send_admin_report(report)
        await enviar_whatsapp(numero_cliente, f"✅ *Promesa de Pago registrada correctamente*\n\n🧾 Factura: *#{invoice_display(data['invoice'])}*\n📅 Fecha límite: *{data['deadline']}*\n\nSi tu servicio estaba suspendido, WispHub procesará la reactivación asociada a esta promesa.")
        reset_to_client_menu(state)


async def process_user_message(numero_cliente, mensaje):
    state_key = normalize_phone(numero_cliente) or str(numero_cliente); raw_message = str(mensaje or "").strip(); message = raw_message.lower()
    if not message:
        return
    state = state_for(state_key)
    if message in {"menu", "menú", "volver", "inicio"} or message.startswith("hola") or message.startswith("buenas"):
        identity = state.get("identity") or await find_client_by_whatsapp_phone(numero_cliente)
        if identity:
            await show_client_menu(numero_cliente, state, identity)
        else:
            state["mode"] = "START"; state["identity"] = None; state["data"] = {}; await enviar_whatsapp(numero_cliente, MENU_BIENVENIDA)
        return
    mode = state["mode"]
    if mode == "START":
        if message == "1":
            identity = await find_client_by_whatsapp_phone(numero_cliente)
            if identity:
                await show_client_menu(numero_cliente, state, identity)
            else:
                await enviar_whatsapp(numero_cliente, "No encontré este número de WhatsApp entre los clientes de WispHub.\nPor favor escribe desde el número registrado en tu servicio.")
        elif message == "2":
            state["mode"] = "PROSPECT"; await enviar_whatsapp(numero_cliente, MENSAJE_PROSPECTO)
        else:
            await enviar_whatsapp(numero_cliente, "Escribe *MENU* para ver las opciones.")
        return
    if mode == "PROSPECT":
        if "interesa" in message:
            await create_lead_with_contact(state_key); await enviar_whatsapp(numero_cliente, "🚀 *¡Genial!* En breve un asesor te enviará los datos bancarios para coordinar tu instalación.")
        else:
            await enviar_whatsapp(numero_cliente, "Escribe *VOLVER* para regresar al menú principal.")
        return
    if mode.startswith("PAYMENT_"):
        await handle_payment_flow(numero_cliente, state, raw_message); return
    if mode.startswith("SUPPORT_"):
        await handle_support_flow(numero_cliente, state, raw_message); return
    if mode.startswith("PASSWORD_"):
        await handle_password_flow(numero_cliente, state, raw_message); return
    if mode.startswith("PROMISE_"):
        await handle_promise_flow(numero_cliente, state, raw_message); return
    if mode != "CLIENT_MENU":
        await show_client_menu(numero_cliente, state); return
    if message == "1":
        await handle_debt(numero_cliente, state)
    elif message == "2":
        await start_payment(numero_cliente, state)
    elif message == "3":
        try: rate = await get_bcv_rate()
        except Exception: rate = None
        await enviar_whatsapp(numero_cliente, bank_details_text(rate))
    elif message in SUPPORT_TYPES:
        await start_support(numero_cliente, state, message)
    elif message == "8":
        await start_change_password(numero_cliente, state)
    elif message == "9":
        await show_service_status(numero_cliente, state)
    elif message == "10":
        await start_promise(numero_cliente, state)
    else:
        await enviar_whatsapp(numero_cliente, "Opción no válida.\n\n" + MAIN_MENU.format(name=display_name(state["identity"])))


def meta_text_from_message(message):
    message_type = message.get("type")
    if message_type == "text": return (message.get("text") or {}).get("body", "")
    if message_type == "button": return (message.get("button") or {}).get("text", "")
    if message_type == "interactive":
        interactive = message.get("interactive") or {}; reply_type = interactive.get("type")
        if reply_type == "button_reply":
            reply = interactive.get("button_reply") or {}; return reply.get("title") or reply.get("id") or ""
        if reply_type == "list_reply":
            reply = interactive.get("list_reply") or {}; return reply.get("title") or reply.get("id") or ""
    return ""


@app.get("/webhook")
async def health_or_meta_verification(request: Request):
    mode = request.query_params.get("hub.mode"); verify_token = request.query_params.get("hub.verify_token"); challenge = request.query_params.get("hub.challenge")
    if mode == "subscribe":
        if not META_VERIFY_TOKEN: return JSONResponse({"error": "META_VERIFY_TOKEN no configurado"}, status_code=503)
        if hmac.compare_digest(verify_token or "", META_VERIFY_TOKEN):
            logger.info("Webhook de Meta verificado correctamente."); return PlainTextResponse(challenge or "")
        return JSONResponse({"error": "Verify token inválido"}, status_code=403)
    return {"status": "ok", "message": "Webhook receiver is active", "version": "4.0-bot-10-opciones", "provider": WHATSAPP_PROVIDER}


@app.post("/webhook")
async def recibir_mensaje(request: Request, background_tasks: BackgroundTasks):
    raw_body = await request.body()
    try:
        data = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except (UnicodeDecodeError, json.JSONDecodeError):
        return JSONResponse({"error": "JSON inválido"}, status_code=400)
    if data.get("object") == "whatsapp_business_account":
        signature = request.headers.get("x-hub-signature-256", "")
        if not verify_meta_signature(raw_body, signature):
            logger.warning("Webhook de Meta rechazado por firma inválida."); return JSONResponse({"error": "Firma inválida"}, status_code=403)
        accepted = 0
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value") or {}
                for message in value.get("messages") or []:
                    message_id = message.get("id")
                    if not mark_message_once(message_id): continue
                    numero_cliente = message.get("from", ""); texto = meta_text_from_message(message)
                    if numero_cliente and texto:
                        background_tasks.add_task(process_user_message, numero_cliente, texto); accepted += 1
        return {"status": "accepted", "messages": accepted}
    if data.get("event") == "messages.upsert":
        try:
            msg_data = data["data"]
            if msg_data["key"].get("fromMe"): return {"status": "ignored"}
            message_id = msg_data.get("key", {}).get("id")
            if not mark_message_once(message_id): return {"status": "duplicate"}
            numero_cliente = msg_data["key"].get("remoteJid", ""); message = msg_data.get("message", {}); texto = ""
            if "conversation" in message: texto = message["conversation"]
            elif "extendedTextMessage" in message: texto = message["extendedTextMessage"].get("text", "")
            if numero_cliente and texto: background_tasks.add_task(process_user_message, numero_cliente, texto)
        except Exception as exc:
            logger.exception("Error procesando mensaje de Evolution: %s", exc)
    return {"status": "processed"}
