#!/usr/bin/env node

/**
 * Script de teste para enviar dados ao HiveMQ Cloud
 * Envia dados de exemplo para testar a conexão MQTT
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
console.log(`📡 Broker: ${options.host}:${options.port}`);

const client = mqtt.connect(options);

client.on('connect', () => {
    console.log('✅ Conectado ao HiveMQ Cloud!\n');
    
    // Tópicos
    const topicSync = 'sentinela/sync';
    const topicAsync = 'sentinela/async';
    
    console.log('📤 Enviando dados de teste...\n');
    
    // 1. Enviar dados síncronos (leituras normais)
    const dadosSync = {
        type: 'temperature',
        value: 23.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
        device_id: 'sensor_001'
    };
    
    client.publish(topicSync, JSON.stringify(dadosSync), (err) => {
        if (err) {
            console.error('❌ Erro ao publicar dados síncronos:', err);
        } else {
            console.log('✅ Dados síncronos enviados:', dadosSync);
        }
    });
    
    // 2. Enviar mais leituras
    setTimeout(() => {
        const humidity = {
            type: 'humidity',
            value: 65.2,
            unit: '%',
            timestamp: new Date().toISOString(),
            device_id: 'sensor_001'
        };
        
        client.publish(topicSync, JSON.stringify(humidity), (err) => {
            if (!err) console.log('✅ Umidade enviada:', humidity);
        });
    }, 1000);
    
    setTimeout(() => {
        const voltage = {
            type: 'voltage',
            value: 220.5,
            unit: 'V',
            timestamp: new Date().toISOString(),
            device_id: 'sensor_001'
        };
        
        client.publish(topicSync, JSON.stringify(voltage), (err) => {
            if (!err) console.log('✅ Voltagem enviada:', voltage);
        });
    }, 2000);
    
    // 3. Enviar evento crítico (assíncrono)
    setTimeout(() => {
        const eventoCritico = {
            type: 'critical_event',
            category: 'network_outage',
            severity: 'high',
            message: 'Queda de rede detectada',
            timestamp: new Date().toISOString(),
            device_id: 'sensor_001'
        };
        
        client.publish(topicAsync, JSON.stringify(eventoCritico), (err) => {
            if (err) {
                console.error('❌ Erro ao publicar evento crítico:', err);
            } else {
                console.log('🚨 Evento crítico enviado:', eventoCritico);
            }
        });
    }, 3000);
    
    // 4. Enviar dados de latência
    setTimeout(() => {
        const latencia = {
            type: 'latency',
            value: 45,
            unit: 'ms',
            timestamp: new Date().toISOString(),
            device_id: 'sensor_001'
        };
        
        client.publish(topicSync, JSON.stringify(latencia), (err) => {
            if (!err) console.log('✅ Latência enviada:', latencia);
        });
    }, 4000);
    
    // 5. Enviar qualidade da energia
    setTimeout(() => {
        const powerQuality = {
            type: 'power_quality',
            value: 98.5,
            unit: '%',
            timestamp: new Date().toISOString(),
            device_id: 'sensor_001'
        };
        
        client.publish(topicSync, JSON.stringify(powerQuality), (err) => {
            if (!err) console.log('✅ Qualidade da energia enviada:', powerQuality);
        });
    }, 5000);
    
    // Desconectar após enviar tudo
    setTimeout(() => {
        console.log('\n✅ Todos os dados foram enviados!');
        console.log('📊 Verifique o dashboard em http://localhost:3000/dashboard.html');
        client.end();
        process.exit(0);
    }, 6000);
});

client.on('error', (error) => {
    console.error('❌ Erro de conexão MQTT:', error.message);
    process.exit(1);
});

client.on('offline', () => {
    console.log('⚠️  Cliente MQTT offline');
});

client.on('reconnect', () => {
    console.log('🔄 Reconectando ao broker MQTT...');
});
