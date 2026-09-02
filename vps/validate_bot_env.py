"""Preflight de configuración para el bot WiFi Rapidito.

No imprime secretos ni realiza escrituras. Con --network valida conectividad de
solo lectura contra WispHub, BCV y los adaptadores públicos del portal.
"""

from __future__ import annotations

import argparse
import os
import sys
from urllib.parse import urlparse

import httpx


def configured(name: str) -> bool:
    return bool(os.getenv(name, "").strip())


def valid_url(value: str) -> bool:
    try:
        parsed = urlparse(value)
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    except Exception:
        return False


def check_configuration() -> list[str]:
    errors: list[str] = []
    provider = os.getenv("WHATSAPP_PROVIDER", "evolution").strip().lower()
    if provider not in {"meta", "evolution"}:
        errors.append("WHATSAPP_PROVIDER debe ser 'meta' o 'evolution'.")

    if provider == "meta":
        for name in ("META_ACCESS_TOKEN", "META_PHONE_NUMBER_ID", "META_VERIFY_TOKEN"):
            if not configured(name):
                errors.append(f"Falta {name} para Meta WhatsApp.")
    else:
        if not configured("EVO_API_KEY"):
            errors.append("Falta EVO_API_KEY para Evolution API.")

    if not configured("WISPHUB_API_KEY"):
        errors.append("Falta WISPHUB_API_KEY.")

    admin = "".join(ch for ch in os.getenv("ADMIN_REPORT_NUMBER", "584120330315") if ch.isdigit())
    if len(admin) < 10:
        errors.append("ADMIN_REPORT_NUMBER no parece un número válido.")

    url_vars = {
        "WISPHUB_API_URL": "https://api.wisphub.app/api",
        "BCV_RATE_URL": "https://ve.dolarapi.com/v1/dolares/oficial",
        "PAYMENT_PROXY_URL": "https://wifirapidito.com/proxy_payments.php",
        "PROMISE_PROXY_URL": "https://wifirapidito.com/proxy_promises.php",
        "PROMISE_RESTRICTIONS_URL": "https://wifirapidito.com/promise_restrictions.php",
        "TICKET_PROXY_URL": "https://wifirapidito.com/proxy.php",
    }
    for name, default in url_vars.items():
        if not valid_url(os.getenv(name, default)):
            errors.append(f"{name} no contiene una URL válida.")

    return errors


def network_checks() -> list[str]:
    errors: list[str] = []
    wisphub_url = os.getenv("WISPHUB_API_URL", "https://api.wisphub.app/api").rstrip("/")
    wisphub_key = os.getenv("WISPHUB_API_KEY", "").strip()
    bcv_url = os.getenv("BCV_RATE_URL", "https://ve.dolarapi.com/v1/dolares/oficial")
    restrictions_url = os.getenv(
        "PROMISE_RESTRICTIONS_URL",
        "https://wifirapidito.com/promise_restrictions.php",
    )
    promises_url = os.getenv("PROMISE_PROXY_URL", "https://wifirapidito.com/proxy_promises.php")
    tickets_url = os.getenv("TICKET_PROXY_URL", "https://wifirapidito.com/proxy.php")

    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        try:
            response = client.get(bcv_url)
            response.raise_for_status()
            payload = response.json()
            rate = payload.get("promedio") or payload.get("venta") or payload.get("compra")
            if not rate or float(rate) <= 0:
                raise ValueError("respuesta sin tasa positiva")
            print("✅ BCV: fuente accesible y tasa válida.")
        except Exception as exc:
            errors.append(f"BCV no disponible: {exc}")

        if wisphub_key:
            try:
                response = client.get(
                    f"{wisphub_url}/clientes/",
                    params={"limit": 1},
                    headers={"Authorization": f"Api-Key {wisphub_key}", "Accept": "application/json"},
                )
                response.raise_for_status()
                print("✅ WispHub: credencial válida para lectura de clientes.")
            except Exception as exc:
                errors.append(f"WispHub no pasó la prueba de lectura: {exc}")

        for label, url, params in (
            ("Restricciones de promesa", restrictions_url, {"health": "preflight"}),
            ("Proxy de promesas", promises_url, {"health": "preflight"}),
            ("Proxy de tickets", tickets_url, {"limit": 1}),
        ):
            try:
                response = client.get(url, params=params)
                if response.status_code < 200 or response.status_code >= 300:
                    raise RuntimeError(f"HTTP {response.status_code}")
                print(f"✅ {label}: accesible.")
            except Exception as exc:
                errors.append(f"{label} no disponible: {exc}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida configuración del bot sin mostrar secretos.")
    parser.add_argument("--network", action="store_true", help="Ejecuta comprobaciones externas de solo lectura.")
    args = parser.parse_args()

    errors = check_configuration()
    if errors:
        print("❌ Configuración incompleta:")
        for error in errors:
            print(f" - {error}")
        return 1

    print("✅ Configuración mínima completa.")

    if args.network:
        errors = network_checks()
        if errors:
            print("❌ Preflight de red con errores:")
            for error in errors:
                print(f" - {error}")
            return 2
        print("✅ Preflight de red completado correctamente.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
