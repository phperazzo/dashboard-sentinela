const mqtt = require('mqtt');
require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
// ...existing code...

class SentinelaBackend {
    async setupMQTT() {
        // Lê config.json para pegar dados do broker
        const fs = require('fs');
        const path = require('path');
        let config;
        try {
            const configPath = path.resolve(__dirname, '..', 'config.json');
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (err) {
            console.error('Erro ao ler config.json:', err);
            return;
        }

        const mqttConfig = config.mqtt;
        if (!mqttConfig) {
            console.error('Configuração MQTT não encontrada no config.json');
            return;
        }

        const mqttUrl = `mqtt://${mqttConfig.host}:${mqttConfig.port}`;
        const mqttOptions = {
            username: mqttConfig.username,
            password: mqttConfig.password,
            keepalive: mqttConfig.keepalive || 60,
            clean: mqttConfig.clean_session !== false
        };

        this.mqttClient = mqtt.connect(mqttUrl, mqttOptions);

        this.mqttClient.on('connect', () => {
            console.log('✅ Conectado ao broker MQTT:', mqttUrl);
            // Subscreve nos tópicos definidos no config.json
            const topics = Object.values(mqttConfig.topics || { sync: 'sentinela/sync', async: 'sentinela/async' });
            topics.forEach(topic => {
                this.mqttClient.subscribe(topic, (err) => {
                    if (err) console.error('Erro ao subscrever tópico MQTT:', topic, err);
                    else console.log('🟢 Subscreveu tópico:', topic);
                });
            });
        });

        this.mqttClient.on('message', (topic, message) => {
            let payload;
            try {
                payload = JSON.parse(message.toString());
            } catch (e) {
                payload = { raw: message.toString() };
            }
            this.broadcastToWebSocket({
                type: 'mqtt_message',
                topic,
                data: payload
            });
        });

        this.mqttClient.on('error', (err) => {
            console.error('Erro MQTT:', err);
        });
    }
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.wsClients = new Set(); // Clientes WebSocket conectados
        this.server = null;
        this.wss = null;
        this.setupServerAndWebSocket();
        this.setupMQTT();
    }

    setupServerAndWebSocket() {
        // Middlewares
        this.app.use(cors());
        this.app.use(express.json());

        // Servir arquivos estáticos do diretório raiz do projeto
        const path = require('path');
        this.app.use(express.static(path.resolve(__dirname, '..')));

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                mqtt: this.mqttClient ? 'connected' : 'disconnected',
                clients: this.wsClients.size
            });
        });

        // API para polling (fallback)
        this.app.get('/api/mqtt-data', (req, res) => {
            // Para simplicidade, não implementa cache, apenas status
            res.json({
                success: true,
                status: this.mqttClient ? 'connected' : 'disconnected',
                timestamp: new Date().toISOString()
            });
        });

        // Inicia servidor HTTPS se certificados existirem, senão HTTP
        const fs = require('fs');
        let server;
        if (process.env.WSS_KEY && process.env.WSS_CERT) {
            try {
                const keyPath = path.resolve(__dirname, '..', process.env.WSS_KEY);
                const certPath = path.resolve(__dirname, '..', process.env.WSS_CERT);
                console.log('[DEBUG] Lendo chave SSL:', keyPath);
                console.log('[DEBUG] Lendo certificado SSL:', certPath);
                const key = fs.readFileSync(keyPath);
                const cert = fs.readFileSync(certPath);
                server = require('https').createServer({ key, cert }, this.app);
                server.listen(this.port, '0.0.0.0', () => {
                    console.log('🔒 Servidor HTTPS+WSS rodando na porta', this.port, 'em 0.0.0.0');
                });
            } catch (e) {
                console.error('[ERRO CRÍTICO] Falha ao iniciar HTTPS/WSS:', e);
                process.exit(1);
            }
        } else {
            console.log('[AVISO] Variáveis WSS_KEY/WSS_CERT não definidas. Iniciando apenas HTTP.');
            server = this.app.listen(this.port, '0.0.0.0', () => {
                console.log(`🚀 Servidor HTTP rodando na porta ${this.port} em 0.0.0.0`);
            });
        }
        this.server = server;

        // WebSocket seguro (WSS) ou normal (WS) na mesma porta do HTTP(S)
        this.wss = new WebSocket.Server({ server });
        this.wss.on('connection', (ws) => {
            console.log('✅ Novo cliente WebSocket conectado');
            this.wsClients.add(ws);

            // Envia status inicial
            ws.send(JSON.stringify({
                type: 'connection',
                status: 'connected',
                mqtt: this.mqttClient ? 'connected' : 'disconnected'
            }));

            ws.on('close', () => {
                console.log('❌ Cliente WebSocket desconectado');
                this.wsClients.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('Erro WebSocket:', error);
                this.wsClients.delete(ws);
            });
        });
    }

    // Removido: setupWebSocket()

    // Removido: setupKafka e connectToKafka

    broadcastToWebSocket(message) {
        const messageString = JSON.stringify(message);
        this.wsClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
    }

    // Graceful shutdown
    async shutdown() {
        console.log('🛑 Desligando servidor...');
        
        // Fecha conexões WebSocket
        this.wsClients.forEach(client => client.close());
        this.wss.close();
        
    // ...existing code...
        
        process.exit(0);
    }
}

// Inicialização
const backend = new SentinelaBackend();

// Graceful shutdown
process.on('SIGINT', () => backend.shutdown());
process.on('SIGTERM', () => backend.shutdown());