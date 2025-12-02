#!/bin/bash
# Script completo para limpar projeto

echo "🧹 LIMPEZA COMPLETA DO PROJETO DASHBOARD SENTINELA"
echo "=================================================="
echo ""

# Contador de arquivos removidos
COUNT=0

# Função para remover arquivo e contar
remove_file() {
    if [ -f "$1" ]; then
        rm -f "$1"
        echo "   ✓ Removido: $1"
        ((COUNT++))
    fi
}

# Função para remover diretório e contar
remove_dir() {
    if [ -d "$1" ]; then
        rm -rf "$1"
        echo "   ✓ Removido: $1"
        ((COUNT++))
    fi
}

echo "1️⃣  Removendo arquivos de teste..."
remove_file "Back/test-apis-only.js"
remove_file "Back/test-colors.js"
remove_file "Back/test-critical-events.js"
remove_file "Back/test-debug.js"
remove_file "Back/test-extreme.js"
remove_file "Back/test-mqtt-hivemq.js"
remove_file "Back/test-new-format.js"
remove_file "Back/test-websocket-client.js"
remove_file "Back/test-websocket.js"

echo ""
echo "2️⃣  Removendo arquivos relacionados ao Kafka..."
remove_file "Back/kafka-consumer.js"
remove_file "Back/send-test-kafka.js"

echo ""
echo "3️⃣  Removendo arquivos temporários..."
remove_file "Back/generate-passwords.js"
remove_file "Back/cookies.txt"
remove_file "Back/server.log"
remove_file "server.log"
remove_file "server.pid"
remove_file "cookies.txt"

echo ""
echo "4️⃣  Removendo scripts desnecessários..."
remove_file "restart-server.sh"
remove_file "mttq-test.jsw"

echo ""
echo "5️⃣  Removendo diretórios desnecessários..."
remove_dir "certs"
remove_dir "api"

echo ""
echo "6️⃣  Removendo node_modules para reinstalar limpo..."
remove_dir "node_modules"
remove_dir "Back/node_modules"
remove_file "package-lock.json"
remove_file "Back/package-lock.json"

echo ""
echo "=================================================="
echo "✅ Limpeza concluída!"
echo "📊 Total de itens removidos: $COUNT"
echo ""
echo "🔧 Próximos passos:"
echo "   1. Reinstalar dependências limpas:"
echo "      cd /workspaces/dashboard-sentinela"
echo "      npm install"
echo "      cd Back && npm install && cd .."
echo ""
echo "   2. Testar o servidor:"
echo "      node Back/server.js"
echo ""
echo "   3. Fazer commit das mudanças:"
echo "      git add ."
echo "      git commit -m 'chore: remove arquivos desnecessários e dependências do Kafka'"
echo ""
echo "📋 Mudanças principais:"
echo "   ✓ Removido kafkajs do package.json"
echo "   ✓ Removidos todos os arquivos de teste"
echo "   ✓ Removidos arquivos relacionados ao Kafka"
echo "   ✓ Removidos logs e arquivos temporários"
echo "   ✓ Removidos certificados e API desnecessária"
echo ""
