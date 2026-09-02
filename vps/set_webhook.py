import os
import requests

# Configuración por entorno. Este script es solo para el fallback Evolution;
# el número principal puede operar con Meta Cloud API sin usarlo.
EVO_API_URL = os.getenv("EVO_API_URL", "http://localhost:8080").rstrip("/")
EVO_API_KEY = os.getenv("EVO_API_KEY", "")
INSTANCE_NAME = os.getenv("INSTANCE_NAME", "rapidito_bot")
WEBHOOK_URL = os.getenv("BOT_WEBHOOK_URL", "http://bot_backend:5000/webhook")


def set_webhook():
    if not EVO_API_KEY:
        raise SystemExit("EVO_API_KEY no está configurada. No se modificó el webhook.")

    url = f"{EVO_API_URL}/webhook/set/{INSTANCE_NAME}"
    headers = {
        "Content-Type": "application/json",
        "apikey": EVO_API_KEY,
    }
    payload = {
        "enabled": True,
        "url": WEBHOOK_URL,
        "webhook_by_events": False,
        "events": ["MESSAGES_UPSERT"],
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code in (200, 201):
            print(f"✅ Webhook configurado exitosamente: {WEBHOOK_URL}")
            print(response.json())
        else:
            print(f"❌ Error al configurar webhook: {response.status_code}")
            print(response.text)
            raise SystemExit(1)
    except requests.RequestException as exc:
        print(f"❌ Error de conexión: {exc}")
        raise SystemExit(1) from exc


if __name__ == "__main__":
    set_webhook()
