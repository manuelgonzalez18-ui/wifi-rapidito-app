import unittest
from unittest.mock import AsyncMock, patch

import bot_logic as bot


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


class BotConversationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        bot.user_states.clear()
        bot._processed_message_ids.clear()

    async def test_menu_cliente_muestra_diez_opciones(self):
        send = AsyncMock(return_value=True)
        with patch.object(bot, "find_client_by_whatsapp_phone", AsyncMock(return_value=IDENTITY)), \
             patch.object(bot, "enviar_whatsapp", send):
            await bot.process_user_message(PHONE, "hola")

        text = send.await_args.args[1]
        self.assertIn("1. 💰 ¿Cuánto debo?", text)
        self.assertIn("7. ⚠️ Falla Masiva en mi Comunidad", text)
        self.assertIn("10. 💜 Promesa de Pago", text)
        self.assertEqual(bot.state_for(PHONE)["mode"], "CLIENT_MENU")

    async def test_sin_internet_inicia_solicitando_mac(self):
        state = bot.state_for(PHONE)
        state["mode"] = "CLIENT_MENU"
        state["identity"] = dict(IDENTITY)
        send = AsyncMock(return_value=True)

        with patch.object(bot, "enviar_whatsapp", send):
            await bot.process_user_message(PHONE, "4")

        self.assertEqual(state["mode"], "SUPPORT_MAC")
        self.assertIn("MAC", send.await_args.args[1])

    async def test_falla_masiva_no_solicita_mac(self):
        state = bot.state_for(PHONE)
        state["mode"] = "CLIENT_MENU"
        state["identity"] = dict(IDENTITY)
        send = AsyncMock(return_value=True)

        with patch.object(bot, "enviar_whatsapp", send):
            await bot.process_user_message(PHONE, "7")

        self.assertEqual(state["mode"], "SUPPORT_COMMUNITY")
        text = send.await_args.args[1]
        self.assertIn("comunidad", text.lower())
        self.assertNotIn("MAC", text)

    async def test_cambio_clave_respeta_tres_pasos_y_confirmacion(self):
        state = bot.state_for(PHONE)
        state["mode"] = "CLIENT_MENU"
        state["identity"] = dict(IDENTITY)
        send = AsyncMock(return_value=True)

        with patch.object(bot, "enviar_whatsapp", send):
            await bot.process_user_message(PHONE, "8")
            self.assertEqual(state["mode"], "PASSWORD_MAC")

            await bot.process_user_message(PHONE, "4CD7C86AF250")
            self.assertEqual(state["data"]["mac"], "4C:D7:C8:6A:F2:50")
            self.assertEqual(state["mode"], "PASSWORD_COMMUNITY")

            await bot.process_user_message(PHONE, "Prado Largo")
            self.assertEqual(state["mode"], "PASSWORD_NEW")

            await bot.process_user_message(PHONE, "Clave.2026$")
            self.assertEqual(state["mode"], "PASSWORD_CONFIRM")
            self.assertIn("Confirma tu solicitud", send.await_args.args[1])

    async def test_estado_servicio_no_crea_ticket(self):
        state = bot.state_for(PHONE)
        state["mode"] = "CLIENT_MENU"
        state["identity"] = {**IDENTITY, "status": "Suspendido"}
        send = AsyncMock(return_value=True)
        lookup = AsyncMock(return_value={**IDENTITY, "status": "Suspendido"})
        create_ticket = AsyncMock()

        with patch.object(bot, "find_client_by_whatsapp_phone", lookup), \
             patch.object(bot, "enviar_whatsapp", send), \
             patch.object(bot, "create_support_ticket", create_ticket):
            await bot.process_user_message(PHONE, "9")

        create_ticket.assert_not_awaited()
        self.assertIn("Suspendido", send.await_args.args[1])

    async def test_pago_sin_facturas_no_abre_captura(self):
        state = bot.state_for(PHONE)
        state["mode"] = "CLIENT_MENU"
        state["identity"] = dict(IDENTITY)
        send = AsyncMock(return_value=True)

        with patch.object(bot, "load_pending_invoices", AsyncMock(return_value=[])), \
             patch.object(bot, "enviar_whatsapp", send):
            await bot.process_user_message(PHONE, "2")

        self.assertEqual(state["mode"], "CLIENT_MENU")
        self.assertIn("No tienes facturas pendientes", send.await_args.args[1])


if __name__ == "__main__":
    unittest.main()
