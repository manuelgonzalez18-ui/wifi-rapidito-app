import unittest
from decimal import Decimal
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


def fake_invoice():
    return {"id_factura": 9150, "folio": 9150, "estado": "Pendiente"}


class BotConversationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        bot.user_states.clear()
        bot._processed_message_ids.clear()

    async def test_cliente_nuevo_en_conversacion_pide_usuario(self):
        send = AsyncMock(return_value=True)
        with patch.object(bot, "enviar_whatsapp", send):
            await bot.process_user_message(PHONE, "hola")
            await bot.process_user_message(PHONE, "1")

        state = bot.state_for(PHONE)
        self.assertEqual(state["mode"], "CLIENT_USERNAME")
        self.assertIn("usuario asignado", send.await_args.args[1])

    async def test_usuario_encontrado_muestra_estado_y_menu_diez_opciones(self):
        send = AsyncMock(return_value=True)
        lookup = AsyncMock(return_value=dict(IDENTITY))
        state = bot.state_for(PHONE)
        state["mode"] = "CLIENT_USERNAME"

        with patch.object(entry, "find_client_by_username", lookup), \
             patch.object(bot, "enviar_whatsapp", send):
            await bot.process_user_message(PHONE, "clienteprueba")

        self.assertEqual(state["mode"], "CLIENT_MENU")
        self.assertEqual(state["identity"]["username"], "clienteprueba")
        texts = [call.args[1] for call in send.await_args_list]
        self.assertTrue(any("¡Te encontré!" in text for text in texts))
        menu = texts[-1]
        self.assertIn("1. 💰 ¿Cuánto debo?", menu)
        self.assertIn("7. ⚠️ Falla Masiva en mi Comunidad", menu)
        self.assertIn("10. 💜 Promesa de Pago", menu)

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

    async def test_falla_masiva_crea_ticket_real_y_reporte_sin_mac(self):
        state = bot.state_for(PHONE)
        state["mode"] = "CLIENT_MENU"
        state["identity"] = dict(IDENTITY)
        send = AsyncMock(return_value=True)
        create_ticket = AsyncMock(return_value=("1652", {"id_ticket": 1652}))
        admin = AsyncMock(return_value=True)

        with patch.object(bot, "enviar_whatsapp", send), \
             patch.object(bot, "create_support_ticket", create_ticket), \
             patch.object(bot, "send_admin_report", admin):
            await bot.process_user_message(PHONE, "7")
            await bot.process_user_message(PHONE, "Prado Largo")
            await bot.process_user_message(PHONE, "NO")
            await bot.process_user_message(PHONE, "La comunidad completa está sin servicio")

        create_ticket.assert_awaited_once()
        _, option, ticket_data = create_ticket.await_args.args
        self.assertEqual(option, "7")
        self.assertNotIn("mac", ticket_data)
        report = admin.await_args.args[0]
        self.assertIn("#1652", report)
        self.assertNotIn("MAC:", report)
        self.assertTrue(any("#1652" in call.args[1] for call in send.await_args_list))

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

    async def test_cambio_clave_usa_numero_real_wisphub(self):
        state = bot.state_for(PHONE)
        state["mode"] = "PASSWORD_CONFIRM"
        state["identity"] = dict(IDENTITY)
        state["data"] = {
            "mac": "4C:D7:C8:6A:F2:50",
            "community": "Prado Largo",
            "new_password": "Clave.2026$",
        }
        send = AsyncMock(return_value=True)
        create_ticket = AsyncMock(return_value=("1455", {"id_ticket": 1455}))
        admin = AsyncMock(return_value=True)

        with patch.object(bot, "enviar_whatsapp", send), \
             patch.object(bot, "create_password_ticket", create_ticket), \
             patch.object(bot, "send_admin_report", admin):
            await bot.process_user_message(PHONE, "SI")

        report = admin.await_args.args[0]
        self.assertIn("#1455", report)
        self.assertIn("ID Servicio: 579", report)
        self.assertTrue(any("#1455" in call.args[1] for call in send.await_args_list))
        self.assertEqual(state["mode"], "CLIENT_MENU")

    async def test_estado_servicio_solo_muestra_estado_y_no_crea_ticket(self):
        state = bot.state_for(PHONE)
        state["mode"] = "CLIENT_MENU"
        state["identity"] = {**IDENTITY, "status": "Suspendido"}
        send = AsyncMock(return_value=True)
        create_ticket = AsyncMock()

        with patch.object(bot, "enviar_whatsapp", send), \
             patch.object(bot, "create_support_ticket", create_ticket):
            await bot.process_user_message(PHONE, "9")

        create_ticket.assert_not_awaited()
        text = send.await_args.args[1]
        self.assertIn("Suspendido", text)
        self.assertNotIn("Servicio: 579", text)
        self.assertNotIn("Cliente Prueba", text)

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

    async def test_pago_confirma_referencia_enmascarada_y_fecha_espanol(self):
        state = bot.state_for(PHONE)
        state["mode"] = "PAYMENT_DATE"
        state["identity"] = dict(IDENTITY)
        state["data"] = {
            "invoice": fake_invoice(),
            "method": "2",
            "method_label": "Pago Móvil Otros Bancos → Banesco",
            "origin_bank_code": "0102",
            "origin_bank_name": "Banco de Venezuela",
            "sender_phone": "04241382174",
            "reference": "833634",
            "amount": Decimal("19450.00"),
        }
        send = AsyncMock(return_value=True)

        with patch.object(bot, "enviar_whatsapp", send):
            await bot.process_user_message(PHONE, "22/08/2026")

        text = send.await_args.args[1]
        self.assertIn("****3634", text)
        self.assertIn("0102 - Banco de Venezuela", text)
        self.assertIn("22/08/2026", text)
        self.assertIn("Bs. 19.450,00", text)

    async def test_pago_no_verificado_va_a_revision_manual(self):
        state = bot.state_for(PHONE)
        state["mode"] = "PAYMENT_CONFIRM"
        state["identity"] = dict(IDENTITY)
        state["data"] = {
            "invoice": fake_invoice(),
            "method": "2",
            "method_label": "Pago Móvil Otros Bancos → Banesco",
            "origin_bank_code": "0102",
            "origin_bank_name": "Banco de Venezuela",
            "sender_phone": "04241382174",
            "reference": "833634",
            "amount": Decimal("19450.00"),
            "payment_date": "2026-08-22",
        }
        send = AsyncMock(return_value=True)
        validate = AsyncMock(return_value=(False, {"message": "No se encontró la operación"}))
        admin = AsyncMock(return_value=True)

        with patch.object(bot, "enviar_whatsapp", send), \
             patch.object(bot, "register_verified_payment", validate), \
             patch.object(bot, "send_admin_report", admin):
            await bot.process_user_message(PHONE, "SI")

        validate.assert_awaited_once()
        report = admin.await_args.args[0]
        self.assertIn("Pago NO verificado", report)
        self.assertIn("833634", report)
        self.assertTrue(any("revisión manual" in call.args[1] for call in send.await_args_list))
        self.assertEqual(state["mode"], "CLIENT_MENU")

    async def test_promesa_muestra_monto_accion_y_fecha_ddmmyyyy(self):
        state = bot.state_for(PHONE)
        state["mode"] = "CLIENT_MENU"
        state["identity"] = dict(IDENTITY)
        send = AsyncMock(return_value=True)
        window = {"today": __import__("datetime").date(2026, 9, 2), "is_open": True, "max": __import__("datetime").date(2026, 9, 5), "next_open": None}

        with patch.object(bot, "get_promise_restriction", AsyncMock(return_value=None)), \
             patch.object(bot, "promise_window", return_value=window), \
             patch.object(bot, "load_pending_invoices", AsyncMock(return_value=[fake_invoice()])), \
             patch.object(bot, "enviar_whatsapp", send):
            await bot.process_user_message(PHONE, "10")

        text = send.await_args.args[1]
        self.assertIn("Monto: $25", text)
        self.assertIn("Registrar y activar servicio", text)
        self.assertIn("05/09/2026", text)

    async def test_promesa_cancelada_no_registra_en_wisphub(self):
        state = bot.state_for(PHONE)
        state["mode"] = "PROMISE_CONFIRM"
        state["identity"] = dict(IDENTITY)
        state["data"] = {"invoice": fake_invoice(), "deadline": "2026-09-05"}
        send = AsyncMock(return_value=True)
        register = AsyncMock()

        with patch.object(bot, "enviar_whatsapp", send), \
             patch.object(bot, "register_promise", register):
            await bot.process_user_message(PHONE, "NO")

        register.assert_not_awaited()
        self.assertEqual(state["mode"], "CLIENT_MENU")
        self.assertIn("Promesa cancelada", send.await_args.args[1])


if __name__ == "__main__":
    unittest.main()
