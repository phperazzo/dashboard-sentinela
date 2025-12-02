#!/bin/bash
# Script para iniciar o Dashboard Sentinela

echo "🚀 Iniciando Dashboard Sentinela..."
echo ""

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

# Iniciar servidor
echo "🔧 Iniciando servidor backend..."
echo "📍 Servidor estará disponível em: http://localhost:3000"
echo "🔐 Login padrão: admin / admin"
echo ""
echo "Pressione Ctrl+C para parar o servidor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

node Back/server.js
