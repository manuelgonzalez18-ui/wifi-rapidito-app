import unittest
from decimal import Decimal

from bot_flows import (
    PAYMENT_METHODS,
    SUPPORT_TYPES,
    monthly_amount_bs,
    normalize_amount,
    normalize_mac,
    normalize_reference,
    resolve_bank,
    valid_wifi_password,
)


class BotFlowsTests(unittest.TestCase):
    def test_mac_normalization(self):
        self.assertEqual(normalize_mac("4CD7C86AF250"), "4C:D7:C8:6A:F2:50")
        self.assertEqual(normalize_mac("4c:d7:c8:6a:f2:50"), "4C:D7:C8:6A:F2:50")
        self.assertIsNone(normalize_mac("1234"))

    def test_wifi_password_rules(self):
        self.assertTrue(valid_wifi_password("Vale.300$"))
        self.assertFalse(valid_wifi_password("1234567"))
        self.assertFalse(valid_wifi_password("clave con espacio"))

    def test_payment_reference(self):
        self.assertEqual(normalize_reference("123456"), "123456")
        self.assertEqual(normalize_reference("Ref 123456"), "123456")
        self.assertIsNone(normalize_reference("12345"))

    def test_amount(self):
        self.assertEqual(normalize_amount("2500,50"), Decimal("2500.50"))
        self.assertIsNone(normalize_amount("0"))
        self.assertIsNone(normalize_amount("abc"))

    def test_bcv_monthly_amount(self):
        self.assertEqual(monthly_amount_bs("100.50", 25), Decimal("2512.50"))

    def test_bank_resolution(self):
        self.assertEqual(resolve_bank("0134"), ("0134", "Banesco"))
        self.assertEqual(resolve_bank("Banesco"), ("0134", "Banesco"))
        self.assertIsNotNone(resolve_bank("1"))

    def test_support_mac_rule(self):
        self.assertTrue(SUPPORT_TYPES["4"]["requires_mac"])
        self.assertTrue(SUPPORT_TYPES["5"]["requires_mac"])
        self.assertTrue(SUPPORT_TYPES["6"]["requires_mac"])
        self.assertFalse(SUPPORT_TYPES["7"]["requires_mac"])

    def test_payment_methods_present(self):
        self.assertEqual(set(PAYMENT_METHODS), {"1", "2", "3", "4"})


if __name__ == "__main__":
    unittest.main()
