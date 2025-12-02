#!/bin/bash
# Script para limpar arquivos desnecessários do projeto

echo "🧹 Limpando arquivos desnecessários do projeto..."
echo ""

# Remover todos os arquivos de teste do Back/
echo "🗑️  Removendo arquivos de teste..."
rm -f Back/test-*.js
rm -f Back/kafka-consumer.js
rm -f Back/send-test-kafka.js
rm -f Back/generate-passwords.js
rm -f Back/cookies.txt
rm -f Back/server.log

# Remover logs da raiz
echo "🗑️  Removendo logs..."
rm -f server.log
rm -f server.pid

# Remover scripts desnecessários da raiz
echo "🗑️  Removendo scripts antigos..."
rm -f restart-server.sh
rm -f mttq-test.jsw

# Remover certificados se existirem
echo "🗑️  Removendo certificados..."
rm -rf certs/

# Remover pasta api/ se existir (não é usada)
echo "🗑️  Removendo pasta api/..."
rm -rf api/

echo ""
echo "✅ Arquivos desnecessários removidos!"
echo ""
echo "📋 Arquivos removidos:"
echo "   ❌ Back/test-*.js (todos os testes)"
echo "   ❌ Back/kafka-consumer.js"
echo "   ❌ Back/send-test-kafka.js"
echo "   ❌ Back/generate-passwords.js"
echo "   ❌ Back/cookies.txt"
echo "   ❌ Back/server.log"
echo "   ❌ server.log, server.pid"
echo "   ❌ restart-server.sh"
echo "   ❌ mttq-test.jsw"
echo "   ❌ certs/"
echo "   ❌ api/"
echo ""
echo "🔧 Próximo passo: Limpar dependências do package.json"
echo "   Execute: npm install (após atualizar package.json)"
