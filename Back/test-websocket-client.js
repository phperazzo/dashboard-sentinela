#!/usr/bin/env node

/**
 * Cliente WebSocket de teste para verificar se dados estão sendo transmitidos
 */

const WebSocket = require('ws');

console.log('🔌 Conectando ao WebSocket do servidor...\n');

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
    console.log('✅ Conectado ao WebSocket!\n');
    console.log('📡 Aguardando dados...\n');
    console.log('='.repeat(60));
});

ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📥 Dados recebidos:', JSON.stringify(message, null, 2));
    console.log('='.repeat(60));
});

ws.on('error', (error) => {
    console.error('❌ Erro WebSocket:', error.message);
});

ws.on('close', () => {
    console.log('\n❌ Conexão WebSocket fechada');
    process.exit(0);
});

// Manter o processo ativo
console.log('💡 Dica: Execute o script test-new-format.js em outro terminal para enviar dados\n');
console.log('Pressione Ctrl+C para sair\n');
