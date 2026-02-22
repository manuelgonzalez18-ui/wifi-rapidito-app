import httpx
import os
import logging

# Configuración desde variables de entorno
KOMMO_SUBDOMAIN = os.getenv("KOMMO_SUBDOMAIN", "wifirapidito")
KOMMO_API_TOKEN = os.getenv("KOMMO_API_TOKEN", "") # Se debe configurar en el .env

BASE_URL = f"https://{KOMMO_SUBDOMAIN}.kommo.com/api/v4"

async def create_lead_with_contact(phone, name="Cliente Nuevo (WhatsApp)", lead_name="Interesado en Instalación"):
    """
    Crea un lead y un contacto asociado en Kommo usando el endpoint 'complex'.
    """
    if not KOMMO_API_TOKEN:
        logging.error("KOMMO_API_TOKEN no configurada.")
        return None

    headers = {
        "Authorization": f"Bearer {KOMMO_API_TOKEN}",
        "Content-Type": "application/json"
    }

    # Estructura para crear lead y contacto simultáneamente
    payload = [
        {
            "name": lead_name,
            "pipeline_id": None, # Opcional: especificar ID de embudo si se tiene
            "_embedded": {
                "contacts": [
                    {
                        "name": name,
                        "custom_fields_values": [
                            {
                                "field_code": "PHONE",
                                "values": [
                                    {
                                        "value": phone,
                                        "enum_code": "MOB"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        }
    ]

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{BASE_URL}/leads/complex", json=payload, headers=headers)
            if response.status_code in [200, 201]:
                data = response.json()
                logging.info(f"Lead creado exitosamente en Kommo: {data}")
                return data
            else:
                logging.error(f"Error al crear lead en Kommo: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logging.error(f"Excepción al conectar con Kommo: {e}")
            return None
