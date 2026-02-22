import requests
import os

# Configuración
# Si se corre desde fuera del docker, usar localhost o la IP del VPS
EVO_API_URL = "http://localhost:8080" 
API_KEY = "rapidito_key_2026"
INSTANCE_NAME = "rapidito_bot"

# La URL del webhook debe ser accesible por Evolution API.
# Dentro de docker-compose, se usa el nombre del servicio.
WEBHOOK_URL = "http://bot_backend:5000/webhook-whatsapp"

def set_webhook():
    url = f"{EVO_API_URL}/webhook/set/{INSTANCE_NAME}"
    headers = {
        "Content-Type": "application/json",
        "apikey": API_KEY
    }
    payload = {
        "enabled": True,
        "url": WEBHOOK_URL,
        "webhook_by_events": False,
        "events": [
            "MESSAGES_UPSERT"
        ]
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code in [200, 201]:
            print(f"✅ Webhook configurado exitosamente: {WEBHOOK_URL}")
            print(response.json())
        else:
            print(f"❌ Error al configurar webhook: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Error de conexión: {e}")

if __name__ == "__main__":
    set_webhook()
