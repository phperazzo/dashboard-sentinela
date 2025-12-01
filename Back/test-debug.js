const mqtt = require('mqtt');

const client = mqtt.connect('mqtts://bdffc9a5bf6e4bf28591393206fc27e0.s1.eu.hivemq.cloud:8883', {
    username: 'sentinela',
    password: 'Sentinela123',
    rejectUnauthorized: true
});

client.on('connect', async () => {
    console.log('✅ Conectado!');
    console.log('🔴 ENVIANDO VALORES QUE DEVEM DAR 10% (VERMELHO):\n');
    
    // Valores que retornam 10%
    await enviar('latency', 600, 'ms');   // > 400ms = 10%
    await enviar('voltage', 100, 'V');    // fora de 190-250 = 10%
    await enviar('rms', 40, 'V');         // fora de 100-150 = 10%
    
    console.log('\n✅ Enviado! Valores deveriam mostrar 10% (VERMELHO)');
    client.end();
    process.exit(0);
});

async function enviar(type, value, unit) {
    const data = { type, value, unit, timestamp: new Date().toISOString() };
    client.publish('sentinela/sync', JSON.stringify(data));
    console.log(`📤 ${type}: ${value}${unit}`);
    await new Promise(r => setTimeout(r, 500));
}
