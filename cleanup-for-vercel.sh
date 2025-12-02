#!/bin/bash
# Script para limpar projeto e preparar para deploy no Vercel (apenas frontend)

echo "🧹 Limpando projeto para deploy no Vercel..."
echo ""

# Remover backend completo
echo "📦 Removendo backend..."
rm -rf Back/

# Remover API serverless (não funciona sem backend)
echo "📦 Removendo API..."
rm -rf api/

# Remover certificados
echo "🔐 Removendo certificados..."
rm -rf certs/

# Remover node_modules (não necessário para frontend estático)
echo "📦 Removendo node_modules..."
rm -rf node_modules/

# Remover scripts de servidor
echo "📜 Removendo scripts de servidor..."
rm -f start.sh start-background.sh stop.sh restart-server.sh

# Remover arquivos de teste e debug
echo "🧪 Removendo arquivos de teste..."
rm -f mttq-test.jsw

# Remover logs e PIDs
echo "📋 Removendo logs..."
rm -f server.log server.pid

# Remover package.json da raiz (dependências do backend)
echo "📦 Removendo package.json da raiz..."
rm -f package.json package-lock.json

# Remover .env
echo "🔒 Removendo .env..."
rm -f .env

# Manter apenas arquivos essenciais do frontend
echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "📁 Arquivos mantidos:"
echo "   - *.html (páginas)"
echo "   - styles.css (estilos)"
echo "   - script.js (scripts)"
echo "   - sw.js (service worker)"
echo "   - config.json (configuração)"
echo "   - vercel.json (config Vercel)"
echo "   - *.md (documentação)"
echo ""
echo "🚀 Pronto para deploy no Vercel!"
echo "   Execute: vercel --prod"
