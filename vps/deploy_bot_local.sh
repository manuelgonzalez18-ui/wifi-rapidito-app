#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-deploy}"
HEALTH_URL="${BOT_LOCAL_HEALTH_URL:-http://127.0.0.1:5000/webhook}"

if [[ ! -f docker-compose.yml || ! -f Dockerfile.bot || ! -f .env ]]; then
  echo "❌ Ejecuta este script desde el directorio VPS que contiene docker-compose.yml, Dockerfile.bot y .env."
  exit 1
fi

if [[ "$MODE" != "deploy" && "$MODE" != "check" ]]; then
  echo "Uso: ./deploy_bot_local.sh [check|deploy]"
  exit 1
fi

echo "🔎 Validando sintaxis local..."
python3 -m py_compile bot_flows.py bot_logic.py validate_bot_env.py
python3 -m unittest test_bot_flows.py
bash -n reset_whatsapp.sh

echo "🐳 Construyendo imagen del bot..."
docker compose build bot_backend

echo "🔐 Ejecutando preflight desde el mismo entorno del contenedor..."
docker compose run --rm --no-deps bot_backend python validate_bot_env.py --network

if [[ "$MODE" == "check" ]]; then
  echo "✅ Check completado. No se reinició el bot."
  exit 0
fi

echo "🚀 Reiniciando únicamente bot_backend..."
docker compose up -d --no-deps bot_backend

for attempt in {1..20}; do
  if curl -fsS "$HEALTH_URL" | grep -q '4.0-bot-10-opciones'; then
    echo "✅ Bot levantado y versión 4.0 verificada."
    docker compose ps bot_backend
    exit 0
  fi
  sleep 2
done

echo "❌ El bot no respondió con la versión esperada."
echo "Últimos logs:"
docker compose logs --tail=120 bot_backend || true
echo "Restaura el respaldo realizado antes de copiar esta versión y reconstruye bot_backend."
exit 1
