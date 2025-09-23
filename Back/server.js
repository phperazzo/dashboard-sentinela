require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const KafkaConsumer = require('./kafka-consumer');

class SentinelaBackend {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.kafkaConsumer = new KafkaConsumer();
        this.wsClients = new Set(); // Clientes WebSocket conectados
        this.server = null;
        this.wss = null;
        this.setupServerAndWebSocket();
        this.setupKafka();
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
                kafka: this.kafkaConsumer.isConnected ? 'connected' : 'disconnected',
                clients: this.wsClients.size
            });
        });

        // API para polling (fallback)
        this.app.get('/api/kafka-data', async (req, res) => {
            try {
                const messages = await this.kafkaConsumer.getRecentMessages(10);
                res.json({
                    success: true,
                    messages: messages,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // API para informações do Kafka
        this.app.get('/api/kafka-info', (req, res) => {
            res.json({
                topics: [process.env.KAFKA_TOPIC_SYNC, process.env.KAFKA_TOPIC_ASYNC],
                connected: this.kafkaConsumer.isConnected,
                bootstrapServers: process.env.KAFKA_BOOTSTRAP_SERVERS
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
                kafka: this.kafkaConsumer.isConnected
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

    setupKafka() {
        // Configura callbacks do Kafka
        this.kafkaConsumer.onMessage((message) => {
            // Envia mensagem para todos os clientes WebSocket
            this.broadcastToWebSocket({
                type: 'kafka_message',
                data: message
            });
        });

        // Conecta ao Kafka
        this.connectToKafka();
    }

    async connectToKafka() {
        try {
            await this.kafkaConsumer.connect();
            this.broadcastToWebSocket({
                type: 'kafka_status',
                status: 'connected'
            });
        } catch (error) {
            console.error('❌ Falha ao conectar no Kafka:', error);
            
            // Tenta reconectar após 10 segundos
            setTimeout(() => {
                console.log('🔄 Tentando reconectar ao Kafka...');
                this.connectToKafka();
            }, 10000);
        }
    }

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
        
        // Desconecta do Kafka
        await this.kafkaConsumer.disconnect();
        
        process.exit(0);
    }
}

// Inicialização
const backend = new SentinelaBackend();

// Graceful shutdown
process.on('SIGINT', () => backend.shutdown());
process.on('SIGTERM', () => backend.shutdown());