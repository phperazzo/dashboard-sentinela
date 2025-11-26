const mqtt = require('mqtt');
require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
// ...existing code...

// Sistema de usuário único (arquivo para persistir a senha)
const fs = require('fs');
const path = require('path');
const USER_CONFIG_FILE = path.join(__dirname, 'user-config.json');

// Criar arquivo de configuração se não existir
function initUserConfig() {
    if (!fs.existsSync(USER_CONFIG_FILE)) {
        const defaultUser = {
            username: 'admin',
            password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // "admin"
            name: 'Administrador',
            role: 'Administrador do Sistema',
            lastPasswordChange: new Date().toISOString(),
            permissions: ['read', 'write', 'admin']
        };
        fs.writeFileSync(USER_CONFIG_FILE, JSON.stringify(defaultUser, null, 2));
        console.log('📁 Arquivo de configuração de usuário criado');
    }
}

// Ler configuração do usuário
function getUserConfig() {
    try {
        const data = fs.readFileSync(USER_CONFIG_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erro ao ler configuração do usuário:', error);
        initUserConfig();
        return getUserConfig();
    }
}

// Salvar configuração do usuário
function saveUserConfig(userConfig) {
    try {
        fs.writeFileSync(USER_CONFIG_FILE, JSON.stringify(userConfig, null, 2));
        return true;
    } catch (error) {
        console.error('Erro ao salvar configuração do usuário:', error);
        return false;
    }
}

// Inicializar configuração
initUserConfig();

const JWT_SECRET = process.env.JWT_SECRET || 'sentinela_secret_key_2025';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';

class SentinelaBackend {
    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupAuthRoutes();
        this.initializeServer();
    }

    setupMiddleware() {
        // Configurar trust proxy para ambientes de desenvolvimento
        this.app.set('trust proxy', 1);

        // Rate limiting para proteção contra ataques de força bruta
        const loginLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 5, // máximo 5 tentativas por IP
            message: {
                success: false,
                message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
            },
            standardHeaders: true,
            legacyHeaders: false,
            skip: (req, res) => {
                // Pular rate limiting se não há header X-Forwarded-For
                return !req.headers['x-forwarded-for'] && req.ip === '127.0.0.1';
            }
        });

        // Rate limiting geral
        const generalLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100, // máximo 100 requests por IP
            message: {
                success: false,
                message: 'Muitas requisições. Tente novamente em 15 minutos.'
            }
        });

        this.app.use(generalLimiter);
        this.app.use('/api/auth/login', loginLimiter);

        // CORS com credenciais
        this.app.use(cors({
            origin: ['http://localhost:8000', 'http://localhost:3000', 'http://127.0.0.1:8000'],
            credentials: true
        }));
        
        // Limitar tamanho do body para evitar ataques
        this.app.use(express.json({ limit: '10kb' }));
        this.app.use(cookieParser());

        // Headers de segurança
        this.app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com cdnjs.cloudflare.com; font-src 'self' fonts.gstatic.com cdnjs.cloudflare.com; img-src 'self' data:; connect-src 'self'");
            next();
        });
        
        // Servir arquivos estáticos com autenticação
        this.app.use('/login.html', express.static('../login.html'));
        this.app.use('/dashboard.html', this.authenticateToken, express.static('../dashboard.html'));
        this.app.use('/settings.html', this.authenticateToken, express.static('../settings.html'));
        this.app.use('/styles.css', express.static('../styles.css'));
        this.app.use('/script.js', this.authenticateToken, express.static('../script.js'));
        
        // Redirecionar root para login
        this.app.get('/', (req, res) => {
            res.redirect('/login.html');
        });
    }

    setupAuthRoutes() {
        // Login
        this.app.post('/api/auth/login', async (req, res) => {
            try {
                const { username, password, rememberMe } = req.body;

                // Validação rigorosa de entrada
                if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Credenciais inválidas' 
                    });
                }

                // Limitar tamanho dos campos
                if (username.length > 50 || password.length > 100) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Credenciais inválidas' 
                    });
                }

                // Sanitizar entrada
                const sanitizedUsername = username.trim().toLowerCase();

                // Adicionar delay para mitigar ataques de timing
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 100));

                // Encontrar usuário (apenas admin é permitido)
                const userConfig = getUserConfig();
                if (sanitizedUsername !== 'admin') {
                    return res.status(401).json({ 
                        success: false, 
                        message: 'Credenciais inválidas' 
                    });
                }

                // Verificar senha
                const isValidPassword = await bcrypt.compare(password, userConfig.password);
                if (!isValidPassword) {
                    return res.status(401).json({ 
                        success: false, 
                        message: 'Credenciais inválidas' 
                    });
                }

                // Gerar token JWT
                const tokenPayload = {
                    username: userConfig.username,
                    name: userConfig.name,
                    role: userConfig.role,
                    permissions: userConfig.permissions
                };

                const tokenExpire = rememberMe ? '7d' : JWT_EXPIRE;
                const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: tokenExpire });

                // Configurar cookie
                const cookieOptions = {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 7 dias ou 24h
                };

                res.cookie('authToken', token, cookieOptions);

                res.json({
                    success: true,
                    message: 'Login realizado com sucesso',
                    user: {
                        username: userConfig.username,
                        name: userConfig.name,
                        role: userConfig.role
                    },
                    token
                });

                console.log(`✅ Login realizado: ${userConfig.username} (${userConfig.name})`);

            } catch (error) {
                console.error('Erro no login:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Erro interno do servidor' 
                });
            }
        });

        // Verificar autenticação
        this.app.get('/api/auth/check', this.authenticateToken, (req, res) => {
            res.json({
                success: true,
                authenticated: true,
                user: req.user
            });
        });

        // Logout
        this.app.post('/api/auth/logout', (req, res) => {
            res.clearCookie('authToken');
            res.json({
                success: true,
                message: 'Logout realizado com sucesso'
            });
        });

        // Rota protegida para informações do usuário
        this.app.get('/api/user/profile', this.authenticateToken, (req, res) => {
            const userConfig = getUserConfig();
            res.json({
                success: true,
                user: {
                    username: userConfig.username,
                    name: userConfig.name,
                    role: userConfig.role,
                    lastPasswordChange: userConfig.lastPasswordChange
                }
            });
        });

        // Alterar senha
        this.app.post('/api/user/change-password', this.authenticateToken, async (req, res) => {
            try {
                const { currentPassword, newPassword } = req.body;

                if (!currentPassword || !newPassword) {
                    return res.status(400).json({
                        success: false,
                        message: 'Senha atual e nova senha são obrigatórias'
                    });
                }

                if (newPassword.length < 4) {
                    return res.status(400).json({
                        success: false,
                        message: 'A nova senha deve ter pelo menos 4 caracteres'
                    });
                }

                const userConfig = getUserConfig();

                // Verificar senha atual
                const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userConfig.password);
                if (!isCurrentPasswordValid) {
                    return res.status(401).json({
                        success: false,
                        message: 'Senha atual incorreta'
                    });
                }

                // Gerar hash da nova senha
                const newPasswordHash = await bcrypt.hash(newPassword, 10);

                // Atualizar configuração
                userConfig.password = newPasswordHash;
                userConfig.lastPasswordChange = new Date().toISOString();

                // Salvar no arquivo
                const saved = saveUserConfig(userConfig);
                if (!saved) {
                    return res.status(500).json({
                        success: false,
                        message: 'Erro ao salvar nova senha'
                    });
                }

                res.json({
                    success: true,
                    message: 'Senha alterada com sucesso',
                    lastPasswordChange: userConfig.lastPasswordChange
                });

                console.log('🔐 Senha alterada com sucesso');

            } catch (error) {
                console.error('Erro ao alterar senha:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro interno do servidor'
                });
            }
        });
    }

    // Middleware de autenticação
    authenticateToken(req, res, next) {
        // Tentar pegar token do cookie primeiro, depois do header
        const token = req.cookies.authToken || req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token de acesso necessário' 
            });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            console.error('Token inválido:', error.message);
            res.clearCookie('authToken');
            return res.status(403).json({ 
                success: false, 
                message: 'Token inválido' 
            });
        }
    }

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
                const messageStr = message.toString();
                // Validar tamanho máximo da mensagem
                if (messageStr.length > 10000) {
                    console.warn('Mensagem MQTT muito grande, ignorando');
                    return;
                }
                payload = JSON.parse(messageStr);
                // Validar estrutura básica
                if (typeof payload !== 'object' || payload === null) {
                    throw new Error('Payload inválido');
                }
            } catch (e) {
                console.warn('Mensagem MQTT inválida:', e.message);
                return; // Ignorar mensagens inválidas
            }
            console.log(`📥 MQTT recebido do tópico '${topic}':`, payload);
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

    initializeServer() {
        this.port = process.env.PORT || 3000;
        this.wsClients = new Set(); // Clientes WebSocket conectados
        this.server = null;
        this.wss = null;
        this.setupServerAndWebSocket();
        this.setupMQTT();
    }

    setupServerAndWebSocket() {
        // Middlewares adicionais já foram configurados em setupMiddleware()

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
        this.wss = new WebSocket.Server({ 
            server,
            maxClients: 10, // Limite de conexões
            clientTracking: true
        });
        this.wss.on('connection', (ws, req) => {
            // Rate limiting simples
            if (this.wsClients.size >= 10) {
                ws.close(1013, 'Muitas conexões');
                return;
            }
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

    // Não há mais Kafka, apenas MQTT

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