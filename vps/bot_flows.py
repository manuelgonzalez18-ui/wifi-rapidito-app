"""Flujos reconstruidos del bot de WhatsApp WiFi Rapidito.

Este módulo concentra menús, estados y validaciones confirmadas por las capturas
históricas. Las integraciones reales (WispHub, Banesco/portal y WhatsApp) se
conectan desde bot_logic.py para mantenerlas separadas de la conversación.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
import re
from typing import Any


MAIN_MENU = """¿En qué puedo ayudarte, {name}?

1. 💰 ¿Cuánto debo?
2. 💳 Reportar Pago
3. 🏦 Datos Bancarios
4. 🔴 Sin Internet
5. 🟡 Internet Lento
6. 🟦 Intermitente
7. ⚠️ Falla Masiva en mi Comunidad
8. 🔑 Cambiar Clave
9. 📊 Estado de mi Servicio
10. 💜 Promesa de Pago

Escribe el número de la opción 👇"""

BANK_DETAILS = {
    "bank": "Banesco",
    "rif": "J-402638850",
    "account": "01340332563321061868",
    "mobile_phone": "04120330315",
    "holder": "Inversiones Tu Super PC 2013 C.A",
}

PAYMENT_METHODS = {
    "1": "Pago Móvil Banesco → Banesco",
    "2": "Pago Móvil Otros Bancos → Banesco",
    "3": "Transferencia Banesco → Banesco",
    "4": "Transferencia Otros Bancos → Banesco",
}

VENEZUELAN_BANKS = {
    "0102": "Banco de Venezuela",
    "0104": "Venezolano de Crédito",
    "0105": "Banco Mercantil",
    "0108": "BBVA Provincial",
    "0114": "Bancaribe",
    "0115": "Banco Exterior",
    "0128": "Banco Caroní",
    "0134": "Banesco",
    "0137": "Banco Sofitasa",
    "0138": "Banco Plaza",
    "0146": "Bangente",
    "0151": "Fondo Común (BFC)",
    "0156": "100% Banco",
    "0157": "Delsur Banco Universal",
    "0163": "Banco del Tesoro",
    "0166": "Banco Agrícola",
    "0168": "Bancrecer",
    "0169": "Banco Microfinanciero",
    "0171": "Banco Activo",
    "0172": "Bancamiga",
    "0174": "Banplus",
    "0175": "Banco Digital de los Trabajadores",
    "0177": "Banfanb",
    "0178": "N58 Banco Digital",
    "0191": "Banco Nacional de Crédito",
    "0601": "Instituto Municipal de Crédito",
}

SUPPORT_TYPES = {
    "4": {"label": "🔴 Sin Internet", "requires_mac": True},
    "5": {"label": "🟡 Internet Lento", "requires_mac": True},
    "6": {"label": "🟦 Intermitente", "requires_mac": True},
    "7": {"label": "⚠️ Falla Masiva en mi Comunidad", "requires_mac": False},
}


@dataclass
class ConversationState:
    step: str = "menu"
    option: str | None = None
    data: dict[str, Any] = field(default_factory=dict)

    def reset(self) -> None:
        self.step = "menu"
        self.option = None
        self.data.clear()


def normalize_mac(value: str) -> str | None:
    raw = re.sub(r"[^0-9A-Fa-f]", "", value or "").upper()
    if len(raw) != 12:
        return None
    return ":".join(raw[i : i + 2] for i in range(0, 12, 2))


def valid_wifi_password(value: str) -> bool:
    value = str(value or "")
    return len(value) >= 8 and not any(ch.isspace() for ch in value)


def normalize_reference(value: str) -> str | None:
    digits = re.sub(r"\D", "", value or "")
    return digits if len(digits) == 6 else None


def normalize_amount(value: str) -> Decimal | None:
    raw = str(value or "").strip().replace(",", ".")
    try:
        amount = Decimal(raw)
    except Exception:
        return None
    if amount <= 0:
        return None
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def monthly_amount_bs(bcv_rate: Decimal | str | float, monthly_usd: Decimal | str | float = 25) -> Decimal:
    return (Decimal(str(bcv_rate)) * Decimal(str(monthly_usd))).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def resolve_bank(value: str) -> tuple[str, str] | None:
    text = str(value or "").strip().lower()
    digits = re.sub(r"\D", "", text)

    # Permite número de lista (1..26), código bancario (0134) o nombre.
    if digits and digits in VENEZUELAN_BANKS:
        return digits, VENEZUELAN_BANKS[digits]

    if digits and 1 <= int(digits) <= len(VENEZUELAN_BANKS):
        code = list(VENEZUELAN_BANKS.keys())[int(digits) - 1]
        return code, VENEZUELAN_BANKS[code]

    for code, name in VENEZUELAN_BANKS.items():
        if text == name.lower() or text in name.lower():
            return code, name
    return None


def support_questions(option: str) -> list[str]:
    flow = SUPPORT_TYPES[option]
    questions = []
    if flow["requires_mac"]:
        questions.append("mac")
    questions.extend(["community", "red_light", "description"])
    return questions


def change_password_questions() -> list[str]:
    return ["mac", "community", "new_password"]


def payment_questions(method: str) -> list[str]:
    questions = []
    if method in {"2", "4"}:
        questions.append("origin_bank")
    if method in {"1", "2"}:
        questions.append("sender_phone")
    questions.extend(["reference_last6", "amount_bs", "payment_date", "confirm"])
    return questions


def internal_ticket_report(*, ticket_id: str, issue_label: str, client: str, whatsapp: str,
                           community: str, mac: str | None, red_light: str | None,
                           description: str) -> str:
    lines = [
        "🔔 *Nuevo Ticket de Falla*",
        "━━━━━━━━━━━━━━━━━━━━",
        issue_label,
        f"🔢 Ticket: #{ticket_id}",
        f"👤 {client}",
        f"📱 {whatsapp}",
        f"🏠 {community}",
    ]
    if mac:
        lines.append(f"📦 MAC: {mac}")
    if red_light:
        lines.append(f"🔴 Luz roja: {red_light}")
    lines.append(f"📋 {description}")
    return "\n".join(lines)


def change_password_report(*, ticket_id: str, client: str, whatsapp: str,
                           service_id: str, community: str, new_password: str,
                           mac: str) -> str:
    return "\n".join([
        "🔔 *Nuevo Ticket - Cambio de Clave WiFi*",
        "━━━━━━━━━━━━━━━━━━━━",
        f"🔢 Ticket: #{ticket_id}",
        f"👤 Cliente: {client}",
        f"📱 WhatsApp: {whatsapp}",
        f"🆔 ID Servicio: {service_id}",
        f"📡 Comunidad: {community}",
        f"🔑 Clave nueva: {new_password}",
        f"🔗 MAC Router: {mac}",
    ])
