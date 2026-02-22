from fastapi import FastAPI, Request
import httpx
import os
import logging
from kommo_service import create_lead_with_contact

app = FastAPI()

# Configuración de Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- CONFIGURACIÓN ---
EVO_API_URL = os.getenv("EVO_API_URL", "http://evolution_api:8080")
EVO_API_KEY = os.getenv("EVO_API_KEY", "rapidito_key_2026")
INSTANCE_NAME = os.getenv("INSTANCE_NAME", "rapidito_bot")

# CONFIGURACIÓN WISPHUB (Actualizado según soporte)
WISPHUB_API_URL = "https://api.wisphub.app/api"
WISPHUB_API_KEY = "OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s"

# --- ALMACENAMIENTO DE ESTADOS (En memoria para simplicidad) ---
user_states = {}

# --- MENÚS Y RESPUESTAS ---
MENU_BIENVENIDA = """
👋 *¡Hola! Bienvenido al Asistente Virtual de WiFi Rapidito.* 🚀

Para brindarte una atención personalizada, por favor indícanos:

1️⃣ *Ya soy cliente*
2️⃣ *Aún no soy cliente*

_Responde con el número de tu opción._
"""

MENU_CLIENTE = """
✅ *Panel de Clientes WiFi Rapidito* 
¿En qué podemos ayudarte hoy? Ingresa el número de tu opción:

1️⃣ 💰 *Reportar un Pago* (Mensualidad)
2️⃣ 🤝 *Promesa de Pago* (Solicitar o Reportar)
3️⃣ 📄 *Descargar Factura* (Último PDF)
4️⃣ 🛠️ *Soporte Técnico* (Reportar una Falla)

_O escribe *'VOLVER'* para regresar al inicio._
"""

RESPUESTA_PAGO = """
💰 *Reportar un Pago*

Es muy sencillo:
1. Ingresa a www.wifirapidito.com o abre nuestra App.
2. Inicia sesión con tus credenciales.
3. Selecciona *'Reportar Pagos'*.
4. Carga la imagen de tu comprobante y listo.

¡Nuestro equipo lo validará a la brevedad! 🚀
"""

RESPUESTA_PROMESA = """
🤝 *Gestión de Promesas*

1. Ingresa a www.wifirapidito.com o abre nuestra App.
2. Ve a la sección *'Reportar Pagos Promesa'*.
3. Carga tu imagen o solicita una nueva extensión.

*Nota:* Recuerda que las promesas tienen validez limitada.
"""

RESPUESTA_FACTURA = """
📄 *Descarga de Factura*

1. Ingresa a www.wifirapidito.com o nuestra App.
2. En la parte inferior de tu pantalla, presiona el botón *'Docs'*.
3. Allí podrás ver y descargar tu última factura en PDF.
"""

RESPUESTA_SOPORTE = """
🛠️ *Soporte Técnico / Falla*

Para darte la atención más rápida, gestionamos fallas vía tickets:
1. Ingresa a www.wifirapidito.com o nuestra App.
2. Selecciona *'Soporte Técnico'* o *'Crear Ticket'*.
3. Completa el formulario con el detalle de tu solicitud.

Un técnico especializado revisará tu caso a la brevedad. 👨‍💻
"""

MENSAJE_PROSPECTO = """
🌐 *Información Especializada*

Actualmente contamos con cobertura en:
📍 *Sotillo, Ciudad Brión, Las González, Las Martínez, Prado Largo, Gamelotal, Bosque de Curiepe* y próximamente en más comunidades del municipio Brión.

💰 *Oferta de Instalación:*
El costo es de **65$** e incluye el **primer mes de servicio GRATIS**. 🎁

¿Deseas contratar el servicio? Responde **'ME INTERESA'** para suministrarte los datos bancarios.
"""

async def enviar_whatsapp(numero, texto):
    url = f"{EVO_API_URL}/message/sendText/{INSTANCE_NAME}"
    headers = {"apikey": EVO_API_KEY}
    payload = {
        "number": numero,
        "text": texto,
        "delay": 500,
        "linkPreview": True
    }
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json=payload, headers=headers)
        except Exception as e:
            print(f"Error enviando mensaje: {e}")

@app.get("/webhook")
async def health_check():
    return {"status": "ok", "message": "Webhook receiver is active"}

@app.post("/webhook")
async def recibir_mensaje(request: Request):
    data = await request.json()
    print(f"DEBUG: Webhook recibido: {data}")
    
    if data.get('event') == 'messages.upsert':
        try:
            msg_data = data['data']
            if msg_data['key']['fromMe']:
                return {"status": "ignored"}
                
            numero_cliente = msg_data['key']['remoteJid']
            mensaje = ""
            message = msg_data.get('message', {})
            
            if 'conversation' in message:
                mensaje = message['conversation']
            elif 'extendedTextMessage' in message:
                mensaje = message['extendedTextMessage'].get('text', '')
            
            mensaje = mensaje.strip().lower()
            state = user_states.get(numero_cliente, "START")

            # --- LÓGICA DE NAVEGACIÓN ---
            if any(word in mensaje for word in ["hola", "buenas", "inicio", "menu", "volver"]):
                user_states[numero_cliente] = "START"
                await enviar_whatsapp(numero_cliente, MENU_BIENVENIDA)
                
            elif state == "START":
                if mensaje == "1":
                    user_states[numero_cliente] = "CLIENT"
                    await enviar_whatsapp(numero_cliente, MENU_CLIENTE)
                elif mensaje == "2":
                    user_states[numero_cliente] = "PROSPECT"
                    await enviar_whatsapp(numero_cliente, MENSAJE_PROSPECTO)
                else:
                    await enviar_whatsapp(numero_cliente, "Escribe *'MENU'* para ver las opciones.")

            elif state == "CLIENT":
                if mensaje == "1":
                    await enviar_whatsapp(numero_cliente, RESPUESTA_PAGO)
                elif mensaje == "2":
                    await enviar_whatsapp(numero_cliente, RESPUESTA_PROMESA)
                elif mensaje == "3":
                    await enviar_whatsapp(numero_cliente, RESPUESTA_FACTURA)
                elif mensaje == "4":
                    await enviar_whatsapp(numero_cliente, RESPUESTA_SOPORTE)
                else:
                    await enviar_whatsapp(numero_cliente, "Opción no válida. Responde con el número (1-4) o escribe *'VOLVER'*.")

            elif state == "PROSPECT":
                if "interesa" in mensaje:
                    # Intentar crear lead en Kommo
                    # El número viene como '584121234567@s.whatsapp.net' o similar
                    phone_clean = numero_cliente.split('@')[0]
                    await create_lead_with_contact(phone_clean)
                    
                    await enviar_whatsapp(numero_cliente, "🚀 *¡Genial!* En breve un asesor te enviará los datos bancarios para coordinar tu instalación.")
                else:
                    await enviar_whatsapp(numero_cliente, "Escribe *'VOLVER'* para regresar al menú principal.")

        except Exception as e:
            print(f"Error procesando mensaje: {e}")
    
    return {"status": "processed"}
