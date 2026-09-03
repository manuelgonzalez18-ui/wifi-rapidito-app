import unittest
from unittest.mock import AsyncMock, patch

import bot_entry as entry

bot = entry.bot
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


class BotResetTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        bot.user_states.clear()

    async def test_hola_reinicia_desde_cualquier_flujo(self):
        state = bot.state_for(PHONE)
        state["mode"] = "PAYMENT_CONFIRM"
        state["identity"] = dict(IDENTITY)
        state["data"] = {"reference": "123456", "amount": "100"}
        send = AsyncMock(return_value=True)

        with patch.object(bot, "enviar_whatsapp", send):
            await bot.process_user_message(PHONE, "Hola")

        self.assertEqual(state["mode"], "START")
        self.assertIsNone(state["identity"])
        self.assertEqual(state["data"], {})
        self.assertIn("Bienvenido al Asistente Virtual", send.await_args.args[1])
        self.assertIn("Ya soy cliente", send.await_args.args[1])

    async def test_menu_con_identidad_sigue_volviendo_al_panel(self):
        state = bot.state_for(PHONE)
        state["mode"] = "PAYMENT_DATE"
        state["identity"] = dict(IDENTITY)
        state["data"] = {"reference": "123456"}
        send = AsyncMock(return_value=True)

        with patch.object(bot, "enviar_whatsapp", send):
            await bot.process_user_message(PHONE, "menu")

        self.assertEqual(state["mode"], "CLIENT_MENU")
        self.assertEqual(state["identity"]["username"], "clienteprueba")
        self.assertEqual(state["data"], {})
        self.assertIn("¿En qué puedo ayudarte", send.await_args.args[1])


if __name__ == "__main__":
    unittest.main()
