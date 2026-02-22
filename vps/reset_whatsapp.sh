#!/bin/bash
echo "🛑 Deteniendo contenedores..."
docker compose down

echo "🧹 Limpiando rastro de sesiones antiguas..."
rm -rf evolution_instances
mkdir evolution_instances
chmod -R 777 evolution_instances

echo "🚀 Iniciando contenedores limpios..."
docker compose up -d

echo "⏳ Esperando a que el motor despierte (10s)..."
sleep 10

echo "🆕 Re-creando instancia 'rapidito_bot'..."
curl -X POST -H "apikey: rapidito_key_2026" -H "Content-Type: application/json" \
-d '{"instanceName": "rapidito_bot", "token": "rapidito_key_2026"}' \
http://127.0.0.1:8080/instance/create

echo "✅ ¡RESETEO COMPLETADO!"
echo "Ahora puedes generar un nuevo QR con: python3 generar_qr_fijo.py"
