import unittest
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import bot_presentation as presentation

bot = presentation.bot

PHONE = "584241234567"
IDENTITY = {
    "service_id": "579",
    "client_id": "321",
    "username": "clienteprueba",
    "name": "Cliente Prueba",
    "phone": PHONE,
    "status": "Activo",
    "raw": {},
}
INVOICE = {"id_factura": 9150, "folio": 9150, "estado": "Pendiente"}


class BotPresentationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        bot.user_states.clear()

    def test_datos_bancarios_historicos(self):
        text = presentation.bank_details_text(Decimal("779.95"))
        self.assertIn("Datos Bancarios de WiFi Rapidito", text)
        self.assertIn("0412-0330315", text)
        self.assertIn("0134-0332-56-3321061868", text)
        self.assertNotIn("779", text)

    def test_lista_bancos_muestra_codigo_antes_del_nombre(self):
        text = presentation.banks_text()
        self.assertIn("1. 0102 - Banco de Venezuela", text)
        self.assertIn("8. 0134 - Banesco", text)

    async def test_deuda_formatea_bcv_y_monto_en_bolivares(self):
        state = bot.state_for(PHONE)
        state["identity"] = dict(IDENTITY)
        send = AsyncMock(return_value=True)

        with patch.object(bot, "load_pending_invoices", AsyncMock(return_value=[INVOICE])), \
             patch.object(bot, "get_bcv_rate", AsyncMock(return_value=Decimal("779.95"))), \
             patch.object(bot, "enviar_whatsapp", send):
            await presentation.handle_debt(PHONE, state)

        text = send.await_args.args[1]
        self.assertIn("Factura: #9150", text)
        self.assertIn("Tasa BCV: Bs. 779,95 / USD", text)
        self.assertIn("Total: Bs. 19.498,75", text)
        self.assertIn("0134-0332-56-3321061868", text)

    async def test_reportar_pago_muestra_factura_tasa_y_cuatro_modalidades(self):
        state = bot.state_for(PHONE)
        state["identity"] = dict(IDENTITY)
        send = AsyncMock(return_value=True)

        with patch.object(bot, "load_pending_invoices", AsyncMock(return_value=[INVOICE])), \
             patch.object(bot, "get_bcv_rate", AsyncMock(return_value=Decimal("779.95"))), \
             patch.object(bot, "enviar_whatsapp", send):
            await presentation.start_payment(PHONE, state)

        text = send.await_args.args[1]
        self.assertEqual(state["mode"], "PAYMENT_METHOD")
        self.assertIn("Reportar Pago – Cliente Prueba", text)
        self.assertIn("Monto: Bs. 19.498,75", text)
        self.assertIn("Tasa BCV: Bs. 779,95 / USD", text)
        self.assertIn("1. 📱 Pago Móvil Banesco → Banesco", text)
        self.assertIn("4. 🏛 Transferencia Otros Bancos → Banesco", text)

    async def test_referencia_se_confirma_y_luego_pide_monto_con_punto(self):
        state = bot.state_for(PHONE)
        state["mode"] = "PAYMENT_REFERENCE"
        state["identity"] = dict(IDENTITY)
        state["data"] = {"expected_amount": "19498.81"}
        send = AsyncMock(return_value=True)

        with patch.object(bot, "enviar_whatsapp", send):
            await presentation.handle_payment_flow(PHONE, state, "833634")

        self.assertEqual(state["mode"], "PAYMENT_AMOUNT")
        text = send.await_args.args[1]
        self.assertIn("Referencia: *833634*", text)
        self.assertIn("punto (.)", text)
        self.assertIn("👉 19498.81", text)


if __name__ == "__main__":
    unittest.main()
