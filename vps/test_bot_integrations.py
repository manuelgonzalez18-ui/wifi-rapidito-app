import unittest
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import bot_logic as bot


IDENTITY = {
    "service_id": "579",
    "client_id": "321",
    "username": "clienteprueba",
    "name": "Cliente Prueba",
    "phone": "584241234567",
    "status": "Activo",
    "raw": {},
}


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code
        self.text = "{}"

    def json(self):
        return self._payload


class FakeAsyncClient:
    def __init__(self, response):
        self.response = response
        self.post = AsyncMock(return_value=response)
        self.get = AsyncMock(return_value=response)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


class BotIntegrationContractTests(unittest.IsolatedAsyncioTestCase):
    async def test_pago_envia_campos_esperados_por_proxy(self):
        response = FakeResponse({"status": "success", "wisphub": True})
        fake_client = FakeAsyncClient(response)
        invoice = {"id_factura": 9150, "folio": 9150, "estado": "Pendiente"}
        data = {
            "reference": "833634",
            "payment_date": "2026-08-22",
            "amount": Decimal("19450.00"),
            "origin_bank_code": "0102",
            "sender_phone": "584241382174",
        }

        with patch.object(bot.httpx, "AsyncClient", return_value=fake_client):
            ok, body = await bot.register_verified_payment(IDENTITY, invoice, data)

        self.assertTrue(ok)
        self.assertEqual(body["status"], "success")
        kwargs = fake_client.post.await_args.kwargs
        self.assertEqual(kwargs["data"]["invoice_id"], "9150")
        self.assertEqual(kwargs["data"]["reference"], "833634")
        self.assertEqual(kwargs["data"]["user_name"], "clienteprueba")
        self.assertEqual(kwargs["data"]["forma_pago"], "16749")
        self.assertEqual(kwargs["data"]["payment_date"], "2026-08-22")
        self.assertEqual(kwargs["data"]["amount"], "19450.00")
        self.assertEqual(kwargs["data"]["banco_origen"], "0102")

    async def test_pago_error_del_proxy_no_se_considera_verificado(self):
        response = FakeResponse({"status": "error", "message": "Banesco no encontró la operación"}, status_code=400)
        fake_client = FakeAsyncClient(response)
        invoice = {"id_factura": 9150}
        data = {
            "reference": "833634",
            "payment_date": "2026-08-22",
            "amount": Decimal("19450.00"),
        }

        with patch.object(bot.httpx, "AsyncClient", return_value=fake_client):
            ok, body = await bot.register_verified_payment(IDENTITY, invoice, data)

        self.assertFalse(ok)
        self.assertEqual(body["status"], "error")

    async def test_promesa_envia_accion_registrar_y_activar(self):
        response = FakeResponse({"id_promesa": 77}, status_code=201)
        fake_client = FakeAsyncClient(response)
        invoice = {"id_factura": 9264}

        with patch.object(bot.httpx, "AsyncClient", return_value=fake_client):
            body = await bot.register_promise(IDENTITY, invoice, "2026-09-05")

        self.assertEqual(body["id_promesa"], 77)
        kwargs = fake_client.post.await_args.kwargs
        self.assertEqual(kwargs["json"]["id_factura"], 9264)
        self.assertEqual(kwargs["json"]["fecha_limite"], "2026-09-05")
        self.assertEqual(kwargs["json"]["accion"], 1)

    async def test_ticket_falla_usa_numero_real_devuelto(self):
        response = FakeResponse({"id_ticket": 1652}, status_code=201)
        fake_client = FakeAsyncClient(response)
        data = {
            "community": "Prado Largo",
            "red_light": "NO",
            "description": "Intermitencia desde ayer",
            "mac": "4C:D7:C8:6A:F2:50",
        }

        with patch.object(bot.httpx, "AsyncClient", return_value=fake_client):
            ticket, body = await bot.create_support_ticket(IDENTITY, "6", data)

        self.assertEqual(ticket, "1652")
        self.assertEqual(body["id_ticket"], 1652)
        kwargs = fake_client.post.await_args.kwargs
        self.assertEqual(kwargs["data"]["servicio"], "579")
        self.assertEqual(kwargs["data"]["asunto"], "Internet Intermitente")
        self.assertIn("4C:D7:C8:6A:F2:50", kwargs["data"]["descripcion"])

    async def test_ticket_cambio_clave_usa_numero_real_devuelto(self):
        response = FakeResponse({"id_ticket": 1455}, status_code=201)
        fake_client = FakeAsyncClient(response)
        data = {
            "community": "Prado Largo",
            "new_password": "Clave.2026$",
            "mac": "4C:D7:C8:6A:F2:50",
        }

        with patch.object(bot.httpx, "AsyncClient", return_value=fake_client):
            ticket, body = await bot.create_password_ticket(IDENTITY, data)

        self.assertEqual(ticket, "1455")
        self.assertEqual(body["id_ticket"], 1455)
        kwargs = fake_client.post.await_args.kwargs
        self.assertEqual(kwargs["data"]["asunto"], "Cambio De Contraseña En Router Wifi")
        self.assertIn("Clave.2026$", kwargs["data"]["descripcion"])


if __name__ == "__main__":
    unittest.main()
