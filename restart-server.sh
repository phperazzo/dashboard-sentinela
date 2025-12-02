#!/bin/bash
echo "🔄 Parando servidor..."
pkill -f "node server.js" 2>/dev/null || true
sleep 2
echo "🚀 Iniciando servidor..."
cd /workspaces/dashboard-sentinela/Back && npm start
