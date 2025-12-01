const mqtt = require('mqtt');
require('dotenv').config();

const config = {
    host: 'bdffc9a5bf6e4bf28591393206fc27e0.s1.eu.hivemq.cloud',
    port: 8883,
    protocol: 'mqtts',
    username: 'sentinela',
    password: 'Sentinela123'
};

const mqttUrl = `${config.protocol}://${config.host}:${config.port}`;

console.log('🔌 Conectando ao HiveMQ Cloud...');
console.log(`📡 Broker: ${config.host}:${config.port}\n`);

const client = mqtt.connect(mqttUrl, {
    username: config.username,
    password: config.password,
    rejectUnauthorized: true
});

client.on('connect', async () => {
    console.log('✅ Conectado ao HiveMQ Cloud!\n');
    
    console.log('🎨 TESTE 1: Valores ÓTIMOS (Verde Escuro - 90-100%)');
    console.log('='.repeat(60));
    await enviarDados('latency', 30, 'ms');    // 30ms = 100%
    await enviarDados('voltage', 220, 'V');    // 220V = 100%
    await enviarDados('rms', 125, 'V');        // 125V = 100%
    console.log('\n⏳ Aguarde 5 segundos para ver as barras VERDES ESCURAS...\n');
    await sleep(5000);
    
    console.log('🎨 TESTE 2: Valores BONS (Verde Claro - 75-89%)');
    console.log('='.repeat(60));
    await enviarDados('latency', 60, 'ms');    // 60ms = 80%
    await enviarDados('voltage', 207, 'V');    // 207V = 80%
    await enviarDados('rms', 117, 'V');        // 117V = 80%
    console.log('\n⏳ Aguarde 5 segundos para ver as barras VERDES CLARAS...\n');
    await sleep(5000);
    
    console.log('🎨 TESTE 3: Valores ATENÇÃO (Amarelo - 50-74%)');
    console.log('='.repeat(60));
    await enviarDados('latency', 120, 'ms');   // 120ms = 60%
    await enviarDados('voltage', 202, 'V');    // 202V = 60%
    await enviarDados('rms', 112, 'V');        // 112V = 60%
    console.log('\n⏳ Aguarde 5 segundos para ver as barras AMARELAS...\n');
    await sleep(5000);
    
    console.log('🎨 TESTE 4: Valores PREOCUPANTE (Laranja - 30-49%)');
    console.log('='.repeat(60));
    await enviarDados('latency', 250, 'ms');   // 250ms = 30%
    await enviarDados('voltage', 195, 'V');    // 195V = 30%
    await enviarDados('rms', 105, 'V');        // 105V = 30%
    console.log('\n⏳ Aguarde 5 segundos para ver as barras LARANJAS...\n');
    await sleep(5000);
    
    console.log('🎨 TESTE 5: Valores CRÍTICOS (Vermelho - 0-29%)');
    console.log('='.repeat(60));
    await enviarDados('latency', 450, 'ms');   // 450ms = 10% VERMELHO
    await enviarDados('voltage', 170, 'V');    // 170V = 10% VERMELHO (fora de 190-250)
    await enviarDados('rms', 90, 'V');         // 90V = 10% VERMELHO (fora de 100-150)
    console.log('\n⏳ Aguarde 3 segundos...\n');
    await sleep(3000);
    
    console.log('🔴 TESTE 6: Valores EXTREMAMENTE CRÍTICOS (Vermelho 10%)');
    console.log('='.repeat(60));
    await enviarDados('latency', 600, 'ms');   // 600ms = 10% VERMELHO EXTREMO
    await enviarDados('voltage', 100, 'V');    // 100V = 10% VERMELHO EXTREMO
    await enviarDados('rms', 40, 'V');         // 40V = 10% VERMELHO EXTREMO
    console.log('\n🔴 Veja as barras BEM VERMELHAS agora!\n');
    await sleep(3000);
    
    console.log('='.repeat(60));
    console.log('✅ Teste de cores concluído!');
    console.log('🌐 Veja o dashboard em: http://localhost:3000/dashboard.html');
    console.log('='.repeat(60));
    
    client.end();
    process.exit(0);
});

client.on('error', (err) => {
    console.error('❌ Erro de conexão:', err.message);
    process.exit(1);
});

async function enviarDados(type, value, unit) {
    const data = {
        type: type,
        value: value,
        unit: unit,
        timestamp: new Date().toISOString()
    };
    
    client.publish('sentinela/sync', JSON.stringify(data));
    console.log(`✅ ${type.toUpperCase()}: ${value}${unit} enviado`);
    await sleep(500);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
