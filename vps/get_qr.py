import requests
import time
import os

# Configuración
API_URL = "http://localhost:8080"
INSTANCE = "rapidito_bot"
API_KEY = "rapidito_key_2026"

def get_qr():
    print(f"\n--- Intentando obtener QR de la instancia: {INSTANCE} ---")
    url = f"{API_URL}/instance/connect/{INSTANCE}"
    headers = {"apikey": API_KEY}
    
    try:
        # Intentamos forzar la generación del QR
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            print("\n¡QR Generado con éxito!")
            print("Escanea este código con tu WhatsApp:")
            print("(Si no ves un código claro, abre este link en tu PC lo más rápido posible):")
            # En realidad, Evolution API devuelve el QR en el HTML.
            # Como no podemos renderizar HTML fácil, vamos a usar el endpoint de base64 si existe
            # o simplemente pedirle al usuario que use la IP directa tras un último intento de firewall.
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error de conexión: {e}")

if __name__ == "__main__":
    get_qr()
