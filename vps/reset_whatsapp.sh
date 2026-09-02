#!/usr/bin/env bash
set -euo pipefail

EVO_API_URL="${EVO_API_URL:-http://127.0.0.1:8080}"
EVO_API_KEY="${EVO_API_KEY:-}"
INSTANCE_NAME="${INSTANCE_NAME:-rapidito_bot}"

if [[ -z "$EVO_API_KEY" ]]; then
  echo "❌ EVO_API_KEY no está configurada. Se cancela el reseteo."
  exit 1
fi

echo "🛑 Deteniendo contenedores..."
docker compose down

echo "🧹 Limpiando rastro de sesiones antiguas..."
rm -rf evolution_instances
mkdir -p evolution_instances
chmod 700 evolution_instances

echo "🚀 Iniciando contenedores limpios..."
docker compose up -d

echo "⏳ Esperando a que Evolution API esté disponible..."
for attempt in {1..30}; do
  if curl -fsS -H "apikey: $EVO_API_KEY" "$EVO_API_URL/instance/fetchInstances" >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    echo "❌ Evolution API no respondió a tiempo."
    exit 1
  fi
  sleep 2
done

echo "🆕 Re-creando instancia '$INSTANCE_NAME'..."
curl -fsS -X POST \
  -H "apikey: $EVO_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"instanceName\":\"$INSTANCE_NAME\",\"token\":\"$EVO_API_KEY\"}" \
  "$EVO_API_URL/instance/create"

echo
echo "✅ Reseteo completado."
echo "Para configurar el webhook ejecuta: python3 set_webhook.py"
echo "Para consultar el QR ejecuta: python3 get_qr.py"
