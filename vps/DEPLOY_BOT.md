# Despliegue seguro del bot WhatsApp

Este procedimiento se ejecuta **en el VPS**, dentro del directorio que ya contiene `docker-compose.yml`, `Dockerfile.bot` y el `.env` real del bot.

## 1. No sobrescribir `.env`

El archivo `.env` del VPS contiene las credenciales reales de Meta/Evolution, WispHub y otros servicios. La reconstrucción usa `vps/.env.example` solo como referencia. No copie `.env.example` sobre el `.env` productivo.

Variables especialmente importantes:

- `WHATSAPP_PROVIDER`
- `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `META_VERIFY_TOKEN`, `META_APP_SECRET` cuando se usa Meta
- `EVO_API_KEY` e `INSTANCE_NAME` cuando se usa Evolution
- `WISPHUB_API_KEY`
- `ADMIN_REPORT_NUMBER=584120330315`
- URLs de `PAYMENT_PROXY_URL`, `PROMISE_PROXY_URL`, `PROMISE_RESTRICTIONS_URL` y `TICKET_PROXY_URL`

## 2. Respaldar la versión productiva actual

**Hacer este respaldo antes de copiar los archivos nuevos.**

```bash
stamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p ".bot-backups/$stamp"
for file in bot_logic.py bot_entry.py bot_presentation.py bot_flows.py Dockerfile.bot requirements-bot.txt set_webhook.py get_qr.py reset_whatsapp.sh; do
  cp -a "$file" ".bot-backups/$stamp/" 2>/dev/null || true
done
echo "Backup: .bot-backups/$stamp"
```

El `.env` productivo no se reemplaza ni se copia desde GitHub.

## 3. Copiar los archivos de la reconstrucción

Actualizar en el directorio VPS, como mínimo:

- `bot_logic.py`
- `bot_entry.py`
- `bot_presentation.py`
- `bot_flows.py`
- `requirements-bot.txt`
- `Dockerfile.bot`
- `test_bot_flows.py`
- `test_bot_conversation.py`
- `test_bot_integrations.py`
- `test_bot_presentation.py`
- `validate_bot_env.py`
- `set_webhook.py`
- `get_qr.py`
- `reset_whatsapp.sh`
- `deploy_bot_local.sh`

Mantener el `.env` existente.

## 4. Ejecutar preflight sin reiniciar

```bash
chmod +x deploy_bot_local.sh reset_whatsapp.sh
./deploy_bot_local.sh check
```

El modo `check`:

1. valida sintaxis Python y shell;
2. ejecuta las pruebas de flujos, conversación, integraciones y presentación;
3. construye la imagen `bot_backend` usando `bot_presentation:app`;
4. levanta un contenedor temporal con el mismo `.env`;
5. comprueba en modo de solo lectura WispHub, BCV y adaptadores del portal;
6. **no reinicia** el bot productivo.

No continuar si este paso falla.

## 5. Desplegar el backend reconstruido

```bash
./deploy_bot_local.sh deploy
```

El script crea un respaldo local, reinicia únicamente `bot_backend` —sin bajar Evolution, PostgreSQL ni Redis— y espera que `GET /webhook` devuelva la versión `4.0-bot-10-opciones`.

## 6. Verificación inicial

```bash
docker compose ps bot_backend
docker compose logs --tail=150 bot_backend
curl -fsS http://127.0.0.1:5000/webhook
```

La respuesta de salud debe contener:

```text
4.0-bot-10-opciones
```

## 7. Prueba punta a punta recomendada

Usar un cliente de prueba y validar, en este orden:

1. `HOLA` muestra la bienvenida; al elegir `1` pide el **usuario asignado en WiFi Rapidito**.
2. Un usuario válido muestra `¡Te encontré!`, el estado y luego las 10 opciones.
3. `1` consulta deuda y muestra `25 × BCV` con formato venezolano cuando exista una factura pendiente.
4. `3` muestra los datos Banesco históricos, sin agregar la tasa BCV a esa pantalla.
5. `9` muestra únicamente Activo/Suspendido y no crea ticket.
6. Crear un ticket de prueba en Sin Internet/Lento/Intermitente y confirmar MAC + número real WispHub.
7. Crear una Falla Masiva y confirmar que **no solicita ni reporta MAC**.
8. Probar Cambio de Clave y confirmar número real de ticket y reporte interno.
9. Probar Promesa de Pago con una factura preparada: monto, fecha máxima, confirmación, reactivación y reporte.
10. Probar Reportar Pago con una operación bancaria de prueba válida: banco, teléfono, referencia, monto, fecha, referencia enmascarada y validación Banesco.
11. Confirmar que una validación negativa vaya a revisión manual y no marque la factura pagada.
12. Confirmar que los reportes administrativos lleguen al número configurado.

## Rollback

Si el health check falla, revisar logs y restaurar el respaldo creado antes del despliegue.

Ejemplo:

```bash
cp .bot-backups/AAAAMMDD-HHMMSS/bot_logic.py ./bot_logic.py
cp .bot-backups/AAAAMMDD-HHMMSS/bot_entry.py ./bot_entry.py 2>/dev/null || true
cp .bot-backups/AAAAMMDD-HHMMSS/bot_presentation.py ./bot_presentation.py 2>/dev/null || true
cp .bot-backups/AAAAMMDD-HHMMSS/bot_flows.py ./bot_flows.py 2>/dev/null || true
cp .bot-backups/AAAAMMDD-HHMMSS/Dockerfile.bot ./Dockerfile.bot 2>/dev/null || true
docker compose build bot_backend
docker compose up -d --no-deps bot_backend
```

No se debe fusionar la reconstrucción a `main` hasta completar satisfactoriamente la prueba punta a punta en el VPS.
