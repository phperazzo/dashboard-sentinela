#!/usr/bin/env node

/**
 * Script de teste para o NOVO FORMATO de dados
 * 
 * DADOS SÍNCRONOS (periódicos):
 * - Latência da rede (ms)
 * - Voltagem da energia (V) 
 * - RMS (Root Mean Square)
 * 
 * DADOS ASSÍNCRONOS (eventos em string):
 * - "energia caiu"
 * - "rede caiu"
 * - "energia voltou"
 * - "rede voltou"
 */

const mqtt = require('mqtt');

// Configuração HiveMQ Cloud
const options = {
    host: 'bdffc9a5bf6e4bf28591393206fc27e0.s1.eu.hivemq.cloud',
    port: 8883,
    protocol: 'mqtts',
    username: 'sentinela',
    password: 'Sentinela123',
    rejectUnauthorized: true
};

console.log('🔌 Conectando ao HiveMQ Cloud...');
console.log(`📡 Broker: ${options.host}:${options.port}\n`);

const client = mqtt.connect(options);

client.on('connect', () => {
    console.log('✅ Conectado ao HiveMQ Cloud!\n');
    
    const topicSync = 'sentinela/sync';
    const topicAsync = 'sentinela/async';
    
    console.log('📤 Enviando dados no NOVO FORMATO...\n');
    console.log('=' .repeat(60));
    
    // 1. DADOS SÍNCRONOS - Latência
    setTimeout(() => {
        const latencia = {
            type: 'latency',
            value: 35,
            unit: 'ms',
            timestamp: new Date().toISOString()
        };
        
        client.publish(topicSync, JSON.stringify(latencia));
        console.log('✅ [SÍNCRONO] Latência enviada:', latencia);
    }, 500);
    
    // 2. DADOS SÍNCRONOS - Voltagem
    setTimeout(() => {
        const voltagem = {
            type: 'voltage',
            value: 220.5,
            unit: 'V',
            timestamp: new Date().toISOString()
        };
        
        client.publish(topicSync, JSON.stringify(voltagem));
        console.log('✅ [SÍNCRONO] Voltagem enviada:', voltagem);
    }, 1000);
    
    // 3. DADOS SÍNCRONOS - RMS
    setTimeout(() => {
        const rms = {
            type: 'rms',
            value: 127.3,
            unit: 'V',
            timestamp: new Date().toISOString()
        };
        
        client.publish(topicSync, JSON.stringify(rms));
        console.log('✅ [SÍNCRONO] RMS enviado:', rms);
    }, 1500);
    
    // 4. EVENTO ASSÍNCRONO - Energia caiu
    setTimeout(() => {
        const evento = {
            message: 'energia caiu',
            timestamp: new Date().toISOString()
        };
        
        client.publish(topicAsync, JSON.stringify(evento));
        console.log('🚨 [ASSÍNCRONO] Evento enviado:', evento);
    }, 2000);
    
    // 5. MAIS DADOS SÍNCRONOS
    setTimeout(() => {
        const latencia2 = {
            type: 'latency',
            value: 42,
            unit: 'ms',
            timestamp: new Date().toISOString()
        };
        
        client.publish(topicSync, JSON.stringify(latencia2));
        console.log('✅ [SÍNCRONO] Latência enviada:', latencia2);
    }, 2500);
    
    // 6. EVENTO ASSÍNCRONO - Rede caiu
    setTimeout(() => {
        const evento = {
            message: 'rede caiu',
            timestamp: new Date().toISOString()
        };
        
        client.publish(topicAsync, JSON.stringify(evento));
        console.log('🚨 [ASSÍNCRONO] Evento enviado:', evento);
    }, 3000);
    
    // 7. DADOS SÍNCRONOS - Voltagem 2
    setTimeout(() => {
        const voltagem2 = {
            type: 'voltage',
            value: 218.3,
            unit: 'V',
            timestamp: new Date().toISOString()
        };
        
        client.publish(topicSync, JSON.stringify(voltagem2));
        console.log('✅ [SÍNCRONO] Voltagem enviada:', voltagem2);
    }, 3500);
    
    // 8. EVENTO ASSÍNCRONO - Energia voltou
    setTimeout(() => {
        const evento = {
            message: 'energia voltou',
            timestamp: new Date().toISOString()
        };
        
        client.publish(topicAsync, JSON.stringify(evento));
        console.log('🚨 [ASSÍNCRONO] Evento enviado:', evento);
    }, 4000);
    
    // 9. DADOS SÍNCRONOS - RMS 2
    setTimeout(() => {
        const rms2 = {
            type: 'rms',
            value: 125.8,
            unit: 'V',
            timestamp: new Date().toISOString()
        };
        
        client.publish(topicSync, JSON.stringify(rms2));
        console.log('✅ [SÍNCRONO] RMS enviado:', rms2);
    }, 4500);
    
    // 10. EVENTO ASSÍNCRONO - Rede voltou
    setTimeout(() => {
        const evento = {
            message: 'rede voltou',
            timestamp: new Date().toISOString()
        };
        
        client.publish(topicAsync, JSON.stringify(evento));
        console.log('🚨 [ASSÍNCRONO] Evento enviado:', evento);
    }, 5000);
    
    // Finalizar
    setTimeout(() => {
        console.log('\n' + '='.repeat(60));
        console.log('✅ Todos os dados foram enviados!');
        console.log('\n📊 Resumo:');
        console.log('   - Dados síncronos: 6 (latência x2, voltagem x2, RMS x2)');
        console.log('   - Eventos assíncronos: 4 (energia caiu/voltou, rede caiu/voltou)');
        console.log('\n🌐 Verifique o dashboard em: http://localhost:3000/dashboard.html');
        console.log('🔍 Teste as APIs:');
        console.log('   - GET /api/readings/all (todas as leituras)');
        console.log('   - GET /api/readings/averages (médias)');
        console.log('   - GET /api/events/critical (eventos)');
        console.log('   - GET /api/data/sync (dados síncronos)');
        console.log('');
        
        client.end();
        process.exit(0);
    }, 6000);
});

client.on('error', (error) => {
    console.error('❌ Erro de conexão MQTT:', error.message);
    process.exit(1);
});
