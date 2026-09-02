"""Capa de compatibilidad del comportamiento histórico del bot WiFi Rapidito.

Mantiene ``bot_logic.py`` como núcleo de integraciones y aplica aquí los detalles
conversacionales confirmados por las capturas: identificación por usuario,
formato de pagos/promesas y estado del servicio simplificado.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
import re

import bot_logic as bot


_original_process_user_message = bot.process_user_message
_original_handle_payment_flow = bot.handle_payment_flow


def format_date_es(value: str) -> str:
    try:
        parsed = date.fromisoformat(str(value))
        return parsed.strftime("%d/%m/%Y")
    except Exception:
        return str(value)


def format_bs(value) -> str:
    try:
        amount = Decimal(str(value))
        raw = f"{amount:,.2f}"
        return raw.replace(",", "X").replace(".", ",").replace("X", ".")
    except Exception:
        return str(value)


def local_ve_phone(value: str) -> str | None:
    digits = re.sub(r"\D", "", str(value or ""))
    if len(digits) == 11 and digits.startswith("0"):
        return digits
    if len(digits) == 12 and digits.startswith("58"):
        return "0" + digits[2:]
    return None


def bank_display(data: dict) -> str:
    code = data.get("origin_bank_code")
    name = data.get("origin_bank_name")
    if code and name:
        return f"{code} - {name}"
    return "0134 - Banesco"


async def find_client_by_username(value: str):
    target = bot.normalize_username(value)
    if not target:
        return None
    try:
        clients = await bot.load_wisphub_clients()
    except Exception as exc:
        bot.logger.warning("No se pudo cargar WispHub para buscar usuario: %s", exc)
        return None

    for client in clients:
        username = bot.normalize_username(
            bot.client_value(client, ["usuario", "usuario_portal", "username"])
        )
        if username and username == target:
            return bot.identity_from_client(client)
    return None


async def show_service_status(numero_cliente, state):
    identity = state.get("identity")
    if not identity:
        await bot.enviar_whatsapp(numero_cliente, "Escribe *MENU* para identificar tu cuenta.")
        return

    status = str(identity.get("status") or "").strip()
    low = status.lower()
    if "suspend" in low or "cort" in low:
        label = "🔴 *Suspendido*"
    elif "activ" in low:
        label = "🟢 *Activo*"
    else:
        label = f"📊 *{status or 'Sin estado disponible'}*"

    await bot.enviar_whatsapp(
        numero_cliente,
        f"📊 *Estado de mi Servicio*\n\nEstado: {label}\n\nEscribe *MENU* para volver al menú.",
    )


async def handle_payment_flow(numero_cliente, state, mensaje):
    data = state["data"]
    mode = state["mode"]

    if mode == "PAYMENT_PHONE":
        phone = local_ve_phone(mensaje)
        if not phone:
            await bot.enviar_whatsapp(
                numero_cliente,
                "El teléfono no parece válido. Escríbelo nuevamente, por ejemplo: *04121234567*.",
            )
            return
        data["sender_phone"] = phone
        state["mode"] = "PAYMENT_REFERENCE"
        await bot.enviar_whatsapp(numero_cliente, f"✅ Teléfono: *{phone}*\n\n🔢 Indica los *últimos 6 dígitos de la referencia*.")
        return

    if mode == "PAYMENT_DATE":
        payment_date = bot.normalize_payment_date(mensaje)
        if not payment_date:
            await bot.enviar_whatsapp(numero_cliente, "Fecha inválida. Usa *DD/MM/AAAA*.")
            return
        data["payment_date"] = payment_date
        state["mode"] = "PAYMENT_CONFIRM"
        ref = str(data["reference"])
        await bot.enviar_whatsapp(
            numero_cliente,
            "\n".join([
                "📝 *Confirma tus datos:*",
                "—",
                f"👤 Cliente: {bot.display_name(state['identity'])}",
                f"📄 Factura: #{bot.invoice_display(data['invoice'])}",
                f"💳 Tipo: {data['method_label']}",
                f"🏦 Banco origen: {bank_display(data)}",
                f"📱 Tlf emisor: {data.get('sender_phone', 'No aplica')}",
                f"🔢 Referencia: ****{ref[-4:]}",
                f"💰 Monto: Bs. {format_bs(data['amount'])}",
                f"📅 Fecha: {format_date_es(payment_date)}",
                "—",
                "¿Correcto? Responde *Sí* o *No*",
            ]),
        )
        return

    if mode == "PAYMENT_CONFIRM":
        if bot.is_no(mensaje):
            bot.reset_to_client_menu(state)
            await bot.enviar_whatsapp(
                numero_cliente,
                "❌ Reporte de pago cancelado.\n\n" + bot.MAIN_MENU.format(name=bot.display_name(state["identity"])),
            )
            return
        if not bot.is_yes(mensaje):
            await bot.enviar_whatsapp(numero_cliente, "Responde *Sí* para continuar o *No* para cancelar.")
            return

        await bot.enviar_whatsapp(numero_cliente, "⌛ *Validando con el banco...*")
        try:
            ok, result = await bot.register_verified_payment(state["identity"], data["invoice"], data)
        except Exception as exc:
            ok, result = False, {"message": str(exc)}

        bank = bank_display(data)
        if ok:
            report = "\n".join([
                "🔔 *Pago Verificado Automáticamente*",
                "—",
                f"👤 {bot.display_name(state['identity'])}",
                f"💳 {data['method_label']}",
                f"💰 Bs. {format_bs(data['amount'])}",
                f"🔢 Ref: {data['reference']}",
                f"🏦 {bank}",
                f"📱 {data.get('sender_phone', 'No aplica')}",
            ])
            await bot.send_admin_report(report)
            await bot.enviar_whatsapp(
                numero_cliente,
                "\n".join([
                    "✅ *¡Pago verificado y registrado!*",
                    f"📄 Factura #{bot.invoice_display(data['invoice'])} marcada como pagada",
                    "Tu servicio será reactivado en minutos ⚡",
                    "",
                    "Escribe *menu* para volver al menú.",
                ]),
            )
        else:
            reason = result.get("message") or result.get("error") or "No fue posible validar la operación automáticamente."
            report = "\n".join([
                "⚠️ *Pago NO verificado (revisión manual)*",
                "—",
                f"👤 Cliente: {bot.display_name(state['identity'])}",
                f"📱 WhatsApp: {bot.normalize_phone(numero_cliente)}",
                f"📄 Factura: #{bot.invoice_display(data['invoice'])}",
                f"💳 Modalidad: {data['method_label']}",
                f"💰 Bs. {format_bs(data['amount'])}",
                f"🔢 Ref: {data['reference']}",
                f"🏦 {bank}",
                f"📱 Emisor: {data.get('sender_phone', 'No aplica')}",
                f"📋 Motivo: {reason}",
                "📲 Vía: WhatsApp Bot",
            ])
            await bot.send_admin_report(report)
            await bot.enviar_whatsapp(
                numero_cliente,
                "⚠️ *Pago NO verificado.*\n\nLa operación fue enviada para revisión manual y la factura no se marcará como pagada hasta confirmar el pago.",
            )

        bot.reset_to_client_menu(state)
        return

    await _original_handle_payment_flow(numero_cliente, state, mensaje)


async def start_promise(numero_cliente, state):
    identity = state["identity"]
    restriction = await bot.get_promise_restriction(identity)
    if restriction:
        blocked_until = restriction.get("blocked_until", "la fecha indicada")
        await bot.enviar_whatsapp(
            numero_cliente,
            "🚫 *Promesa de pago no disponible temporalmente*\n\n"
            f"Podrás solicitar una nueva promesa a partir del *{format_date_es(blocked_until)}*.",
        )
        return

    window = bot.promise_window()
    if not window["is_open"]:
        await bot.enviar_whatsapp(
            numero_cliente,
            "⏳ *Promesa de Pago no disponible hoy*\n\n"
            f"📅 Próxima apertura: *{format_date_es(window['next_open'].isoformat())}*.",
        )
        return

    invoices = await bot.load_pending_invoices(identity)
    if not invoices:
        await bot.enviar_whatsapp(numero_cliente, "✅ No tienes facturas pendientes. No necesitas registrar una promesa de pago.")
        return
    if len(invoices) != 1:
        await bot.enviar_whatsapp(
            numero_cliente,
            f"⚠️ La promesa requiere una sola factura pendiente. Actualmente aparecen {len(invoices)}.",
        )
        return

    invoice = invoices[0]
    state["data"] = {"invoice": invoice, "promise_max": window["max"].isoformat()}
    state["mode"] = "PROMISE_DATE"
    await bot.enviar_whatsapp(
        numero_cliente,
        "\n".join([
            "💜 *Solicitar Promesa de Pago*",
            "—",
            f"👤 Cliente: {bot.display_name(identity)}",
            f"📄 Factura: #{bot.invoice_display(invoice)}",
            f"💰 Monto: ${bot.MONTHLY_PRICE_USD}",
            "⚡ Acción: Registrar y activar servicio",
            "—",
            "📅 ¿Hasta qué fecha puedes pagar?",
            f"Fecha máxima permitida: *{format_date_es(window['max'].isoformat())}*",
            "Escribe la fecha en formato *DD/MM/AAAA*.",
        ]),
    )


async def handle_promise_flow(numero_cliente, state, mensaje):
    data = state["data"]
    mode = state["mode"]

    if mode == "PROMISE_DATE":
        payment_date = bot.normalize_payment_date(mensaje)
        if not payment_date:
            await bot.enviar_whatsapp(numero_cliente, "Fecha inválida. Usa *DD/MM/AAAA*.")
            return
        selected = date.fromisoformat(payment_date)
        window = bot.promise_window()
        if selected < window["today"] or selected > window["max"]:
            await bot.enviar_whatsapp(
                numero_cliente,
                f"La fecha debe estar entre *{format_date_es(window['today'].isoformat())}* y *{format_date_es(window['max'].isoformat())}*.",
            )
            return
        data["deadline"] = payment_date
        state["mode"] = "PROMISE_CONFIRM"
        await bot.enviar_whatsapp(
            numero_cliente,
            "\n".join([
                "📝 *Confirma tu promesa:*",
                f"Factura: #{bot.invoice_display(data['invoice'])}",
                f"Monto: ${bot.MONTHLY_PRICE_USD}",
                f"Fecha límite: {format_date_es(data['deadline'])}",
                "Acción: Registrar y activar servicio",
                "",
                "¿Confirmar? Responde *Sí* o *No*",
            ]),
        )
        return

    if mode == "PROMISE_CONFIRM":
        if bot.is_no(mensaje):
            bot.reset_to_client_menu(state)
            await bot.enviar_whatsapp(numero_cliente, "❌ Promesa cancelada.")
            return
        if not bot.is_yes(mensaje):
            await bot.enviar_whatsapp(numero_cliente, "Responde *Sí* para confirmar o *No* para cancelar.")
            return

        await bot.enviar_whatsapp(numero_cliente, "⌛ *Registrando promesa...*")
        try:
            await bot.register_promise(state["identity"], data["invoice"], data["deadline"])
        except Exception as exc:
            bot.logger.exception("No se pudo registrar promesa")
            await bot.enviar_whatsapp(numero_cliente, f"⚠️ No pude registrar la promesa en WispHub.\nDetalle: {exc}")
            bot.reset_to_client_menu(state)
            return

        deadline_display = format_date_es(data["deadline"])
        await bot.send_admin_report("\n".join([
            "🔔 *Promesa de Pago Registrada*",
            "—",
            f"👤 {bot.display_name(state['identity'])}",
            f"📄 Factura: #{bot.invoice_display(data['invoice'])}",
            f"📅 Fecha: {deadline_display}",
            "📲 Vía: WhatsApp Bot",
        ]))
        await bot.enviar_whatsapp(
            numero_cliente,
            "\n".join([
                "✅ *¡Promesa de pago registrada!*",
                f"📄 Factura: #{bot.invoice_display(data['invoice'])}",
                f"📅 Fecha límite: {deadline_display}",
                "⚡ Tu servicio será reactivado en minutos",
                "",
                "Recuerda realizar el pago antes de la fecha límite.",
                "Escribe *menu* para volver al menú.",
            ]),
        )
        bot.reset_to_client_menu(state)
        return


async def process_user_message(numero_cliente, mensaje):
    state_key = bot.normalize_phone(numero_cliente) or str(numero_cliente)
    raw_message = str(mensaje or "").strip()
    message = raw_message.lower()
    if not message:
        return

    state = bot.state_for(state_key)

    # Antes de identificar una cuenta, el bot histórico pide el usuario de
    # WiFi Rapidito. Una vez identificado, MENU vuelve directamente al menú.
    if message in {"menu", "menú", "volver", "inicio"} or message.startswith("hola") or message.startswith("buenas"):
        if state.get("identity"):
            await bot.show_client_menu(numero_cliente, state, state["identity"])
        else:
            state["mode"] = "START"
            state["identity"] = None
            state["data"] = {}
            await bot.enviar_whatsapp(numero_cliente, bot.MENU_BIENVENIDA)
        return

    if state["mode"] == "START" and message == "1":
        state["mode"] = "CLIENT_USERNAME"
        state["data"] = {}
        await bot.enviar_whatsapp(
            numero_cliente,
            "👤 Escribe el *usuario asignado en WiFi Rapidito*.\n\nEjemplo: *normaavila*",
        )
        return

    if state["mode"] == "CLIENT_USERNAME":
        await bot.enviar_whatsapp(numero_cliente, "🔍 *Buscando tu cuenta...*")
        identity = await find_client_by_username(raw_message)
        if not identity:
            await bot.enviar_whatsapp(
                numero_cliente,
                "⚠️ No encontré ese usuario en WispHub. Verifica cómo está escrito e inténtalo nuevamente o escribe *MENU*.",
            )
            return
        state["identity"] = identity
        bot.reset_to_client_menu(state)
        status = str(identity.get("status") or "").lower()
        status_label = "🟢 Activo" if "activ" in status else ("🔴 Suspendido" if "suspend" in status or "cort" in status else identity.get("status") or "Sin estado")
        await bot.enviar_whatsapp(
            numero_cliente,
            f"✅ *¡Te encontré!*\n\n👤 {bot.display_name(identity)}\n📡 Estado: {status_label}",
        )
        await bot.enviar_whatsapp(numero_cliente, bot.MAIN_MENU.format(name=bot.display_name(identity)))
        return

    await _original_process_user_message(numero_cliente, raw_message)


# Sustituimos únicamente las piezas conversacionales. Las integraciones reales
# siguen viviendo en bot_logic.py y son las mismas que usa el portal.
bot.show_service_status = show_service_status
bot.handle_payment_flow = handle_payment_flow
bot.start_promise = start_promise
bot.handle_promise_flow = handle_promise_flow
bot.process_user_message = process_user_message

app = bot.app
