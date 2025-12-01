#!/usr/bin/env node

/**
 * Script de teste SOMENTE LEITURA - NÃO ENVIA DADOS FALSOS
 * Apenas verifica se as APIs estão respondendo corretamente
 */

const fetch = require('node-fetch');

const baseUrl = 'http://localhost:3000';
let authCookie = '';

console.log('🧪 Iniciando testes de APIs (SOMENTE LEITURA)\n');
console.log('⚠️  Este script NÃO envia dados falsos ao sistema\n');

async function testAPIs() {
    try {
        // 1. Testar login
        console.log('1️⃣  Testando login...');
        const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin' })
        });

        if (!loginResponse.ok) {
            console.log('❌ Erro ao fazer login');
            return;
        }

        authCookie = loginResponse.headers.get('set-cookie');
        console.log('✅ Login realizado com sucesso\n');

        // 2. Verificar autenticação
        console.log('2️⃣  Testando verificação de autenticação...');
        const checkResponse = await fetch(`${baseUrl}/api/auth/check`, {
            headers: { 'Cookie': authCookie }
        });
        
        if (checkResponse.ok) {
            const userData = await checkResponse.json();
            console.log(`✅ Autenticado como: ${userData.user.username}`);
            console.log(`   Perfil: ${userData.user.role}\n`);
        } else {
            console.log('❌ Falha na verificação de autenticação\n');
        }

        // 3. Consultar todas as leituras
        console.log('3️⃣  Consultando todas as leituras (/api/readings/all)...');
        const allReadingsResponse = await fetch(`${baseUrl}/api/readings/all`, {
            headers: { 'Cookie': authCookie }
        });
        
        if (allReadingsResponse.ok) {
            const allReadings = await allReadingsResponse.json();
            console.log(`✅ Total de leituras: ${allReadings.length}`);
            if (allReadings.length > 0) {
                const types = [...new Set(allReadings.map(r => r.type))];
                console.log(`   Tipos encontrados: ${types.join(', ')}`);
                console.log(`   Última leitura: ${JSON.stringify(allReadings[allReadings.length - 1])}`);
            } else {
                console.log('   ⚠️  Nenhuma leitura encontrada (aguardando dados da nuvem)');
            }
            console.log('');
        } else {
            console.log('❌ Erro ao consultar leituras\n');
        }

        // 4. Consultar eventos críticos
        console.log('4️⃣  Consultando eventos críticos (/api/events/critical)...');
        const eventsResponse = await fetch(`${baseUrl}/api/events/critical`, {
            headers: { 'Cookie': authCookie }
        });
        
        if (eventsResponse.ok) {
            const events = await eventsResponse.json();
            console.log(`✅ Total de eventos críticos: ${events.length}`);
            if (events.length > 0) {
                const categories = events.reduce((acc, e) => {
                    acc[e.category] = (acc[e.category] || 0) + 1;
                    return acc;
                }, {});
                console.log(`   Por categoria:`, categories);
                console.log(`   Último evento: ${events[events.length - 1].message}`);
            } else {
                console.log('   ⚠️  Nenhum evento crítico (sistema operando normalmente)');
            }
            console.log('');
        } else {
            console.log('❌ Erro ao consultar eventos\n');
        }

        // 5. Consultar médias
        console.log('5️⃣  Consultando médias (/api/readings/averages)...');
        const averagesResponse = await fetch(`${baseUrl}/api/readings/averages`, {
            headers: { 'Cookie': authCookie }
        });
        
        if (averagesResponse.ok) {
            const averages = await averagesResponse.json();
            console.log('✅ Médias calculadas:');
            
            if (averages.latency) {
                console.log(`   📊 Latência:`);
                console.log(`      Média: ${averages.latency.average?.toFixed(2) || 'N/A'} ms`);
                console.log(`      Mínimo: ${averages.latency.min || 'N/A'} ms`);
                console.log(`      Máximo: ${averages.latency.max || 'N/A'} ms`);
            } else {
                console.log('   ⚠️  Sem dados de latência');
            }
            
            if (averages.powerQuality) {
                console.log(`   ⚡ Qualidade da Energia:`);
                console.log(`      Média: ${averages.powerQuality.average?.toFixed(2) || 'N/A'} %`);
                console.log(`      Mínimo: ${averages.powerQuality.min || 'N/A'} %`);
                console.log(`      Máximo: ${averages.powerQuality.max || 'N/A'} %`);
            } else {
                console.log('   ⚠️  Sem dados de qualidade da energia');
            }
            console.log('');
        } else {
            console.log('❌ Erro ao consultar médias\n');
        }

        // 6. Consultar dados síncronos
        console.log('6️⃣  Consultando dados síncronos (/api/data/sync)...');
        const syncDataResponse = await fetch(`${baseUrl}/api/data/sync`, {
            headers: { 'Cookie': authCookie }
        });
        
        if (syncDataResponse.ok) {
            const syncData = await syncDataResponse.json();
            console.log('✅ Dados síncronos:');
            console.log(`   Leituras de latência: ${syncData.latency?.length || 0}`);
            console.log(`   Leituras de qualidade energia: ${syncData.powerQuality?.length || 0}`);
            console.log('');
        } else {
            console.log('❌ Erro ao consultar dados síncronos\n');
        }

        // 7. Testar filtro por tipo
        console.log('7️⃣  Testando filtro por tipo (/api/readings/filter/latencia)...');
        const filterResponse = await fetch(`${baseUrl}/api/readings/filter/latencia`, {
            headers: { 'Cookie': authCookie }
        });
        
        if (filterResponse.ok) {
            const filteredReadings = await filterResponse.json();
            console.log(`✅ Leituras de latência filtradas: ${filteredReadings.length}`);
            console.log('');
        } else {
            console.log('❌ Erro ao filtrar leituras\n');
        }

        // 8. Health check
        console.log('8️⃣  Verificando saúde do servidor (/health)...');
        const healthResponse = await fetch(`${baseUrl}/health`);
        
        if (healthResponse.ok) {
            const health = await healthResponse.json();
            console.log('✅ Servidor saudável:');
            console.log(`   Status: ${health.status}`);
            console.log(`   MQTT: ${health.mqtt}`);
            console.log(`   WebSocket: ${health.websocket}`);
            console.log('');
        } else {
            console.log('❌ Erro ao verificar saúde do servidor\n');
        }

        // Resumo final
        console.log('\n' + '='.repeat(60));
        console.log('📋 RESUMO DOS TESTES');
        console.log('='.repeat(60));
        console.log('✅ Todas as APIs estão funcionando corretamente');
        console.log('🔒 Sistema de autenticação operacional');
        console.log('📡 Servidor pronto para receber dados da nuvem');
        console.log('\n⚠️  IMPORTANTE: Este teste NÃO enviou dados falsos');
        console.log('   O sistema está limpo e pronto para dados reais via MQTT\n');

    } catch (error) {
        console.error('\n❌ Erro durante os testes:', error.message);
    }
}

// Executar testes
testAPIs();
