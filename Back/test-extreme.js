const mqtt = require('mqtt');

const client = mqtt.connect('mqtts://bdffc9a5bf6e4bf28591393206fc27e0.s1.eu.hivemq.cloud:8883', {
    username: 'sentinela',
    password: 'Sentinela123'
});

client.on('connect', async () => {
    console.log('🔴 TESTE VERMELHO - Valores = 5%:\n');
    
    await enviar('latency', 1000, 'ms');  
    await enviar('voltage', 50, 'V');     
    await enviar('rms', 10, 'V');         
    
    console.log('\n🔴 Agora SIM deve estar VERMELHO FORTE!');
    client.end();
});

async function enviar(type, value, unit) {
    client.publish('sentinela/sync', JSON.stringify({ type, value, unit, timestamp: new Date().toISOString() }));
    console.log(`${type}: ${value}${unit} (deve dar ~10%)`);
    await new Promise(r => setTimeout(r, 500));
}
