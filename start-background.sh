#!/bin/bash
# Script para iniciar o Dashboard Sentinela em background

echo "🚀 Iniciando Dashboard Sentinela em background..."

# Verificar se node está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale Node.js."
    exit 1
fi

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Parar processo anterior se existir
if [ -f "server.pid" ]; then
    OLD_PID=$(cat server.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "⚠️  Parando servidor anterior (PID: $OLD_PID)..."
        kill $OLD_PID
        sleep 2
    fi
    rm server.pid
fi

# Iniciar servidor em background
echo "🔧 Iniciando servidor backend em background..."
nohup node Back/server.js > server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > server.pid

echo ""
echo "✅ Servidor iniciado!"
echo "📍 URL: http://localhost:3000"
echo "🔐 Login: admin / admin"
echo "📋 PID: $SERVER_PID"
echo "📄 Logs: tail -f server.log"
echo "🛑 Parar: kill $SERVER_PID (ou use stop.sh)"
echo ""
