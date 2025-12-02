#!/bin/bash
# Script para parar o Dashboard Sentinela

if [ ! -f "server.pid" ]; then
    echo "❌ Arquivo server.pid não encontrado. Servidor não está rodando?"
    exit 1
fi

PID=$(cat server.pid)

if ps -p $PID > /dev/null 2>&1; then
    echo "🛑 Parando servidor (PID: $PID)..."
    kill $PID
    sleep 2
    
    if ps -p $PID > /dev/null 2>&1; then
        echo "⚠️  Servidor não respondeu, forçando parada..."
        kill -9 $PID
    fi
    
    rm server.pid
    echo "✅ Servidor parado com sucesso!"
else
    echo "⚠️  Processo $PID não está rodando."
    rm server.pid
fi
