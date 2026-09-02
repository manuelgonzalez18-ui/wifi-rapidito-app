"""Textos y formato final del bot histórico de WiFi Rapidito.

Esta capa conserva las integraciones de ``bot_logic`` y la compatibilidad de
``bot_entry`` pero hace que los mensajes visibles coincidan con las capturas
reconstruidas: datos bancarios, lista de bancos, deuda y reporte de pago.
"""

from __future__ import annotations

import bot_entry as entry

bot = entry.bot

_previous_payment_flow = bot.handle_payment_flow


def bank_details_text(rate=None):
    del rate  # La pantalla de Datos Bancarios histórica no muestra la tasa.
    return "\n".join([
        "🏦 *Datos Bancarios de WiFi Rapidito*",
        "Para facilitar el pago de tu mensualidad:",
        "—",
        "📱 *Para Pago Móvil:*",
        "Banco: Banesco",
        "Teléfono: 0412-0330315",
        "Documento: J-402638850",
        "",
        "🏛 *Para Transferencias o Depósitos:*",
        "A nombre de: Inversiones Tu Super PC 2013 C.A",
        "Documento: J-402638850",
        "N° de Cuenta: 0134-0332-56-3321061868",
        "Banco: Banesco",
        "—",
        "Recuerda reportar tu pago una vez realizado. ¡Gracias!",
        "💡 Escribe *2* para reportar tu pago o *menu* para volver.",
    ])


def payment_method_text():
    return "\n".join([
        "💰 *¿Cómo realizó su pago?*",
        "1. 📱 Pago Móvil Banesco → Banesco",
        "2. 🔄 Pago Móvil Otros Bancos → Banesco",
        "3. 🏦 Transferencia Banesco → Banesco",
        "4. 🏛 Transferencia Otros Bancos → Banesco",
        "",
        "Escribe el número 👇",
    ])


def banks_text():
    from bot_flows import VENEZUELAN_BANKS

    lines = [
        "🏦 *Banco de origen:*",
        "Puedes escribir el número de la lista, el código bancario (ej. 0134) o el nombre del banco.",
        "",
    ]
    for index, (code, name) in enumerate(VENEZUELAN_BANKS.items(), start=1):
        lines.append(f"{index}. {code} - {name}")
    return "\n".join(lines)


async def handle_debt(numero_cliente, state):
    identity = state["identity"]
    invoices = await bot.load_pending_invoices(identity)
    if not invoices:
        await bot.enviar_whatsapp(
            numero_cliente,
            f"✅ *{bot.display_name(identity)}*, no tienes facturas pendientes de pago.\n\nEscribe *menu* para volver.",
        )
        return

    try:
        rate = await bot.get_bcv_rate()
        amount = bot.monthly_amount_bs(rate, bot.MONTHLY_PRICE_USD)
        message = "\n".join([
            "💰 *¿Cuánto debo?*",
            "—",
            f"👤 Cliente: {bot.display_name(identity)}",
            f"📄 Factura: #{bot.invoice_display(invoices[0])}",
            f"💵 Monto: ${bot.MONTHLY_PRICE_USD}",
            f"📊 Tasa BCV: Bs. {entry.format_bs(rate)} / USD",
            f"💰 Total: Bs. {entry.format_bs(amount)}",
            "—",
            "",
            bank_details_text(),
        ])
    except Exception as exc:
        bot.logger.warning("No se pudo obtener tasa BCV: %s", exc)
        message = "\n".join([
            "💰 Tienes una factura pendiente de pago.",
            f"💵 Monto: ${bot.MONTHLY_PRICE_USD}",
            "⚠️ No pude consultar la tasa BCV en este momento.",
            "",
            bank_details_text(),
        ])

    await bot.enviar_whatsapp(numero_cliente, message)


async def start_payment(numero_cliente, state):
    identity = state["identity"]
    invoices = await bot.load_pending_invoices(identity)
    if not invoices:
        await bot.enviar_whatsapp(numero_cliente, "✅ No tienes facturas pendientes para reportar.")
        return

    invoice = invoices[0]
    data = {"invoice": invoice}
    try:
        rate = await bot.get_bcv_rate()
        expected = bot.monthly_amount_bs(rate, bot.MONTHLY_PRICE_USD)
        data["bcv_rate"] = str(rate)
        data["expected_amount"] = str(expected)
        intro = "\n".join([
            f"💳 *Reportar Pago – {bot.display_name(identity)}*",
            "—",
            f"📄 Factura: #{bot.invoice_display(invoice)}",
            "",
            "📋 *Datos para realizar el pago:*",
            "🏦 Banco: BANESCO",
            "🔢 RIF: J-402638850",
            "💳 Cuenta: 01340332563321061868",
            "📱 Tlf Pago Móvil: 04120330315",
            f"💰 Monto: Bs. {entry.format_bs(expected)}",
            f"📊 Tasa BCV: Bs. {entry.format_bs(rate)} / USD",
            "—",
            payment_method_text(),
        ])
    except Exception as exc:
        bot.logger.warning("Tasa BCV no disponible al iniciar pago: %s", exc)
        intro = "\n".join([
            f"💳 *Reportar Pago – {bot.display_name(identity)}*",
            f"📄 Factura: #{bot.invoice_display(invoice)}",
            "",
            payment_method_text(),
        ])

    state["mode"] = "PAYMENT_METHOD"
    state["data"] = data
    await bot.enviar_whatsapp(numero_cliente, intro)


async def handle_payment_flow(numero_cliente, state, mensaje):
    data = state["data"]
    if state["mode"] == "PAYMENT_REFERENCE":
        ref = bot.normalize_reference(mensaje)
        if not ref:
            await bot.enviar_whatsapp(
                numero_cliente,
                "La referencia debe contener exactamente *6 dígitos*. Intenta nuevamente.",
            )
            return
        data["reference"] = ref
        state["mode"] = "PAYMENT_AMOUNT"
        expected = data.get("expected_amount")
        example = expected or "19498.81"
        await bot.enviar_whatsapp(
            numero_cliente,
            "\n".join([
                f"✅ Referencia: *{ref}*",
                "",
                "💰 *Monto pagado en Bs:*",
                "Debes escribirlo usando un punto (.) para los decimales, sin comas ni símbolos.",
                "Escríbelo exactamente como en el siguiente ejemplo:",
                f"👉 {example}",
            ]),
        )
        return

    await _previous_payment_flow(numero_cliente, state, mensaje)


bot.bank_details_text = bank_details_text
bot.payment_method_text = payment_method_text
bot.banks_text = banks_text
bot.handle_debt = handle_debt
bot.start_payment = start_payment
bot.handle_payment_flow = handle_payment_flow

app = bot.app
