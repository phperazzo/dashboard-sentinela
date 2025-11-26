const WebSocket = require('ws');

// Conectar ao WebSocket do servidor
const ws = new WebSocket('ws://localhost:3000');

ws.on('open', function open() {
    console.log('🔗 Conectado ao WebSocket do servidor');
    
    // Simular dados de sensores a cada 2 segundos
    setInterval(() => {
        // Dados simulados para um data center
        const sensores = [
            {
                deviceId: 'sentinela-datacenter-01',
                sensor: 'temperatura',
                reading: {
                    value: 22 + (Math.random() * 8), // 22-30°C
                    unit: '°C'
                },
                timestamp_unix: Math.floor(Date.now() / 1000)
            },
            {
                deviceId: 'sentinela-datacenter-01', 
                sensor: 'umidade',
                reading: {
                    value: 45 + (Math.random() * 30), // 45-75%
                    unit: '%'
                },
                timestamp_unix: Math.floor(Date.now() / 1000)
            },
            {
                deviceId: 'sentinela-datacenter-01',
                sensor: 'tensao',
                reading: {
                    value: 215 + (Math.random() * 15), // 215-230V
                    unit: 'V'
                },
                timestamp_unix: Math.floor(Date.now() / 1000)
            },
            {
                deviceId: 'sentinela-datacenter-01',
                sensor: 'rede',
                reading: {
                    value: Math.random() > 0.1 ? 'ON' : 'OFF', // 90% online
                    unit: ''
                },
                timestamp_unix: Math.floor(Date.now() / 1000)
            },
            {
                deviceId: 'sentinela-datacenter-01',
                sensor: 'energia',
                reading: {
                    value: Math.random() > 0.05 ? 'ON' : 'OFF', // 95% energia
                    unit: ''
                },
                timestamp_unix: Math.floor(Date.now() / 1000)
            }
        ];

        // Enviar cada sensor como uma mensagem separada
        sensores.forEach((sensorData, index) => {
            setTimeout(() => {
                const message = {
                    type: 'mqtt_message',
                    data: sensorData
                };
                
                ws.send(JSON.stringify(message));
                console.log(`📡 Enviado: ${sensorData.sensor} = ${sensorData.reading.value}${sensorData.reading.unit}`);
            }, index * 200); // Espacar por 200ms entre sensores
        });

    }, 3000); // A cada 3 segundos
});

ws.on('message', function message(data) {
    console.log('📨 Recebido do servidor:', data.toString());
});

ws.on('error', function error(err) {
    console.error('❌ Erro no WebSocket:', err);
});

ws.on('close', function close() {
    console.log('🔌 Conexão WebSocket fechada');
});

console.log('🚀 Simulador de sensores iniciado...');
console.log('📊 Enviando dados para ws://localhost:3000');
console.log('⌨️  Pressione Ctrl+C para parar');