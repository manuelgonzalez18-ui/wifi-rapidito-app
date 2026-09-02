import unittest
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import bot_presentation as presentation

bot = presentation.bot
entry = presentation.entry

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
        bot._processed_message_ids.clear()

    def test_capa_historica_queda_conectada_al_app(self):
        self.assertIs(bot.process_user_message, entry.process_user_message)
        self.assertIs(bot.handle_debt, presentation.handle_debt)
        self.assertIs(bot.start_payment, presentation.start_payment)
        self.assertIs(bot.handle_payment_flow, presentation.handle_payment_flow)
        self.assertIs(bot.show_service_status, presentation.show_service_status)
        self.assertIsNotNone(presentation.app)

    async def test_identificacion_historica_pide_usuario_y_muestra_cuenta(self):
        send = AsyncMock(return_value=True)
        lookup = AsyncMock(return_value=dict(IDENTITY))

        with patch.object(bot, "enviar_whatsapp", send), \
             patch.object(entry, "find_client_by_username", lookup):
            await entry.process_user_message(PHONE, "hola")
            self.assertIn("Ya soy cliente", send.await_args.args[1])

            await entry.process_user_message(PHONE, "1")
            self.assertEqual(bot.state_for(PHONE)["mode"], "CLIENT_USERNAME")
            self.assertIn("usuario asignado", send.await_args.args[1])

            await entry.process_user_message(PHONE, "clienteprueba")

        lookup.assert_awaited_once_with("clienteprueba")
        state = bot.state_for(PHONE)
        self.assertEqual(state["mode"], "CLIENT_MENU")
        self.assertEqual(state["identity"]["username"], "clienteprueba")
        texts = [call.args[1] for call in send.await_args_list]
        self.assertTrue(any("Buscando tu cuenta" in text for text in texts))
        self.assertTrue(any("¡Te encontré!" in text and "Activo" in text for text in texts))
        self.assertTrue(any("10. 💜 Promesa de Pago" in text for text in texts))

    async def test_menu_despues_de_identificar_no_vuelve_a_pedir_usuario(self):
        state = bot.state_for(PHONE)
        state["mode"] = "CLIENT_MENU"
        state["identity"] = dict(IDENTITY)
        send = AsyncMock(return_value=True)

        with patch.object(bot, "enviar_whatsapp", send):
            await entry.process_user_message(PHONE, "menu")

        self.assertEqual(state["mode"], "CLIENT_MENU")
        text = send.await_args.args[1]
        self.assertIn("¿En qué puedo ayudarte", text)
        self.assertNotIn("usuario asignado", text)

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

    async def test_monto_pago_pide_fecha_en_formato_historico(self):
        state = bot.state_for(PHONE)
        state["mode"] = "PAYMENT_AMOUNT"
        state["identity"] = dict(IDENTITY)
        state["data"] = {}
        send = AsyncMock(return_value=True)

        with patch.object(bot, "enviar_whatsapp", send):
            await presentation.handle_payment_flow(PHONE, state, "19450.00")

        self.assertEqual(state["mode"], "PAYMENT_DATE")
        self.assertEqual(state["data"]["amount"], Decimal("19450.00"))
        text = send.await_args.args[1]
        self.assertIn("Fecha del pago (DD/MM/AAAA)", text)
        self.assertIn("22/08/2026", text)
        self.assertNotIn("AAAA-MM-DD", text)

    async def test_estado_servicio_refresca_wisphub_y_solo_muestra_estado(self):
        state = bot.state_for(PHONE)
        state["mode"] = "CLIENT_MENU"
        state["identity"] = dict(IDENTITY)
        refreshed = {**IDENTITY, "status": "Suspendido"}
        send = AsyncMock(return_value=True)
        lookup = AsyncMock(return_value=refreshed)

        with patch.object(entry, "find_client_by_username", lookup), \
             patch.object(bot, "enviar_whatsapp", send):
            await presentation.show_service_status(PHONE, state)

        lookup.assert_awaited_once_with("clienteprueba")
        self.assertEqual(state["identity"]["status"], "Suspendido")
        text = send.await_args.args[1]
        self.assertIn("Suspendido", text)
        self.assertNotIn("Servicio: 579", text)
        self.assertNotIn("Cliente Prueba", text)


if __name__ == "__main__":
    unittest.main()
