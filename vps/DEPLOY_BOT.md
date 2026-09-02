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
cp -a bot_logic.py ".bot-backups/$stamp/" 2>/dev/null || true
cp -a bot_flows.py ".bot-backups/$stamp/" 2>/dev/null || true
cp -a set_webhook.py get_qr.py reset_whatsapp.sh ".bot-backups/$stamp/" 2>/dev/null || true
echo "Backup: .bot-backups/$stamp"
```

El `.env` productivo no se reemplaza ni se copia desde GitHub.

## 3. Copiar los archivos de la reconstrucción

Actualizar en el directorio VPS, como mínimo:

- `bot_logic.py`
- `bot_flows.py`
- `test_bot_flows.py`
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
2. ejecuta las pruebas unitarias de los flujos;
3. construye la imagen `bot_backend`;
4. levanta un contenedor temporal con el mismo `.env`;
5. comprueba en modo de solo lectura WispHub, BCV y adaptadores del portal;
6. **no reinicia** el bot productivo.

No continuar si este paso falla.

## 5. Desplegar el backend reconstruido

```bash
./deploy_bot_local.sh deploy
```

El script reinicia únicamente `bot_backend`, sin bajar Evolution, PostgreSQL ni Redis, y espera que `GET /webhook` devuelva la versión `4.0-bot-10-opciones`.

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

1. `MENU` muestra las 10 opciones.
2. `1` consulta deuda y muestra `25 × BCV` cuando exista una factura pendiente.
3. `3` muestra los datos Banesco correctos.
4. `9` muestra Activo/Suspendido sin crear ticket.
5. Crear un ticket de prueba en una de las fallas y confirmar que WispHub devuelve el número real.
6. Probar Cambio de Clave y confirmar reporte interno.
7. Probar Promesa de Pago solo con una factura preparada para prueba.
8. Probar Reportar Pago únicamente con una operación bancaria de prueba válida; confirmar que una validación negativa no marque la factura pagada.
9. Confirmar que los reportes administrativos lleguen al número configurado.

## Rollback

Si el health check falla, revisar logs y restaurar el respaldo creado **antes** de copiar la reconstrucción.

Ejemplo:

```bash
cp .bot-backups/AAAAMMDD-HHMMSS/bot_logic.py ./bot_logic.py
cp .bot-backups/AAAAMMDD-HHMMSS/bot_flows.py ./bot_flows.py 2>/dev/null || true
docker compose build bot_backend
docker compose up -d --no-deps bot_backend
```

No se debe fusionar la reconstrucción a `main` hasta completar satisfactoriamente la prueba punta a punta en el VPS.
