import os
import requests

API_URL = os.getenv("EVO_API_URL", "http://localhost:8080").rstrip("/")
INSTANCE = os.getenv("INSTANCE_NAME", "rapidito_bot")
API_KEY = os.getenv("EVO_API_KEY", "")


def get_qr():
    if not API_KEY:
        raise SystemExit("EVO_API_KEY no está configurada. No se consultó Evolution API.")

    print(f"\n--- Intentando obtener QR de la instancia: {INSTANCE} ---")
    url = f"{API_URL}/instance/connect/{INSTANCE}"
    headers = {"apikey": API_KEY}

    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code == 200:
            print("\n✅ Respuesta de conexión obtenida.")
            try:
                payload = response.json()
                print(payload)
            except ValueError:
                print(response.text)
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            raise SystemExit(1)
    except requests.RequestException as exc:
        print(f"❌ Error de conexión: {exc}")
        raise SystemExit(1) from exc


if __name__ == "__main__":
    get_qr()
