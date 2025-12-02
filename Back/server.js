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
        // Armazenamento de eventos críticos assíncronos (strings: energia caiu, rede caiu, etc)
        this.criticalEvents = [];
        // Armazenamento de dados síncronos periódicos
        this.syncData = {
            latency: [],      // Latência da rede (ms)
            rms: []           // RMS (Root Mean Square) - corrente
        };
        // Armazenamento de todas as leituras
        this.allReadings = [];
        this.setupMiddleware();
        this.setupAuthRoutes();
        this.setupDataRoutes();
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
            max: 300, // máximo 300 requests por IP (aumentado para suportar polling)
            message: {
                success: false,
                message: 'Muitas requisições. Tente novamente em 15 minutos.'
            },
            skip: (req) => {
                // Exceção para APIs de leitura (não modificam dados)
                return req.path.startsWith('/api/readings/') || req.path.startsWith('/api/data/');
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
            res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' fonts.googleapis.com cdnjs.cloudflare.com; font-src 'self' fonts.gstatic.com cdnjs.cloudflare.com; img-src 'self' data:; connect-src 'self' ws: wss: cdn.jsdelivr.net");
            next();
        });
        
        // Servir arquivos estáticos com autenticação
        this.app.use('/login.html', express.static('../login.html'));
        this.app.use('/dashboard.html', express.static('../dashboard.html'));
        this.app.use('/settings.html', this.authenticateToken, express.static('../settings.html'));
        this.app.use('/styles.css', express.static('../styles.css'));
        this.app.use('/script.js', express.static('../script.js'));
        
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

    // [ADD] Rotas para dados e relatórios
    setupDataRoutes() {
        // ----------------- APIs dos dados históricos (Gabriel) -----------------
        
        // lista completa síncrona
        this.app.get('/apisincrono', async (req, res) => {
            try {
                const fetch = (await import('node-fetch')).default;
                const response = await fetch('https://sentinela-0ar2.onrender.com/sincrono');
                const data = await response.json();
                res.json(data);
            } catch (error) {
                res.status(500).json({ error: 'Erro ao buscar dados' });
            }
        });

        this.app.get('/apisincronomedia0', async (req, res) => {
            try {
                const fetch = (await import('node-fetch')).default;
                const response = await fetch('https://sentinela-0ar2.onrender.com/sincrono/media/0');
                const data = await response.json(); // float
                res.json(String(data));             // devolve como string
            } catch (error) {
                res.status(500).json({ error: 'Erro ao buscar média 0 (Rms)' });
            }
        });

        this.app.get('/apisincronomedia1', async (req, res) => {
            try {
                const fetch = (await import('node-fetch')).default;
                const response = await fetch('https://sentinela-0ar2.onrender.com/sincrono/media/1');
                const data = await response.json(); // float
                res.json(String(data));             // devolve como string
            } catch (error) {
                res.status(500).json({ error: 'Erro ao buscar média 1 (Ms)' });
            }
        });

        // específicos: 0 e 1
        this.app.get('/apisincronoespecificos0', async (req, res) => {
            try {
                const fetch = (await import('node-fetch')).default;
                const response = await fetch('https://sentinela-0ar2.onrender.com/sincrono/especificos/0');
                const data = await response.json();
                res.json(data);
            } catch (error) {
                res.status(500).json({ error: 'Erro ao buscar dados específicos 0' });
            }
        });

        this.app.get('/apisincronoespecificos1', async (req, res) => {
            try {
                const fetch = (await import('node-fetch')).default;
                const response = await fetch('https://sentinela-0ar2.onrender.com/sincrono/especificos/1');
                const data = await response.json();
                res.json(data);
            } catch (error) {
                res.status(500).json({ error: 'Erro ao buscar dados específicos 1' });
            }
        });
        
        // ----------------- Rotas existentes -----------------

        // A) Endpoint: todas as leituras periódicas (síncronas)
        this.app.get('/api/readings/all', this.authenticateToken, (req, res) => {
            res.json({
                success: true,
                syncData: {
                    latency: this.syncData.latency,
                    rms: this.syncData.rms
                },
                allReadings: this.allReadings,
                count: this.allReadings.length,
                timestamp: new Date().toISOString()
            });
        });

        // B) Endpoint: leituras filtradas por tipo (latency, voltage, rms)
        this.app.get('/api/readings/filter/:type', this.authenticateToken, (req, res) => {
            const { type } = req.params;
            const validTypes = ['latency', 'voltage', 'rms', 'latencia', 'voltagem'];
            
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo inválido. Use: latency, voltage, rms'
                });
            }

            const filtered = this.allReadings.filter(reading => 
                reading.type === type || 
                (type === 'latencia' && reading.type === 'latency') ||
                (type === 'voltagem' && reading.type === 'voltage')
            );
            
            res.json({
                success: true,
                type,
                data: filtered,
                count: filtered.length
            });
        });

        // C) Endpoint: médias dos dados síncronos (latência, voltagem, RMS)
        this.app.get('/api/readings/averages', this.authenticateToken, (req, res) => {
            const averages = this.calculateAverages();
            res.json({
                success: true,
                data: averages,
                timestamp: new Date().toISOString()
            });
        });

        // D) Endpoint: eventos críticos assíncronos (strings)
        this.app.get('/api/events/critical', this.authenticateToken, (req, res) => {
            res.json({
                success: true,
                data: this.criticalEvents,
                count: this.criticalEvents.length,
                timestamp: new Date().toISOString()
            });
        });

        // E) Endpoint: dados síncronos separados por tipo
        this.app.get('/api/data/sync', this.authenticateToken, (req, res) => {
            res.json({
                success: true,
                data: {
                    latency: this.syncData.latency,
                    voltage: this.syncData.voltage,
                    rms: this.syncData.rms
                },
                counts: {
                    latency: this.syncData.latency.length,
                    voltage: this.syncData.voltage.length,
                    rms: this.syncData.rms.length
                },
                timestamp: new Date().toISOString()
            });
        });
    }

    // Função para calcular médias dos dados síncronos
    calculateAverages() {
        const result = {};

        // Média de latência
        if (this.syncData.latency.length > 0) {
            const latencyValues = this.syncData.latency.map(d => d.value);
            result.latency = {
                avg: (latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length).toFixed(2),
                min: Math.min(...latencyValues),
                max: Math.max(...latencyValues),
                count: latencyValues.length,
                unit: 'ms'
            };
        }

        // Média de RMS
        if (this.syncData.rms.length > 0) {
            const rmsValues = this.syncData.rms.map(d => d.value);
            result.rms = {
                avg: (rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length).toFixed(2),
                min: Math.min(...rmsValues),
                max: Math.max(...rmsValues),
                count: rmsValues.length,
                unit: this.syncData.rms[0].unit || ''
            };
        }

        return result;
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

        // Usar mqtts:// para conexão TLS (porta 8883)
        const protocol = mqttConfig.protocol || 'mqtt';
        const mqttUrl = `${protocol}://${mqttConfig.host}:${mqttConfig.port}`;
        const mqttOptions = {
            username: mqttConfig.username,
            password: mqttConfig.password,
            keepalive: mqttConfig.keepalive || 60,
            clean: mqttConfig.clean_session !== false,
            rejectUnauthorized: true // Validar certificado SSL
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
            console.log(`\n🔔 EVENTO MESSAGE DISPARADO! Tópico: ${topic}`);
            let payload;
            try {
                const messageStr = message.toString();
                console.log(`📨 Mensagem bruta do tópico '${topic}':`, messageStr);
                
                // Validar tamanho máximo da mensagem
                if (messageStr.length > 10000) {
                    console.warn('Mensagem MQTT muito grande, ignorando');
                    return;
                }
                
                // Tentar fazer parse como JSON primeiro
                try {
                    const parsed = JSON.parse(messageStr);
                    console.log('✅ Parsed como JSON:', parsed, 'tipo:', typeof parsed);
                    
                    // Se for um número ou string, converter para objeto
                    if (typeof parsed === 'number') {
                        if (topic.includes('rms')) {
                            payload = { type: 'rms', value: parsed, unit: 'V' };
                        } else if (topic.includes('latencia') || topic.includes('ms')) {
                            payload = { type: 'latency', value: parsed, unit: 'ms' };
                        } else {
                            payload = { value: parsed };
                        }
                    } else if (typeof parsed === 'object' && parsed !== null) {
                        payload = parsed;
                    } else {
                        // String ou outro tipo primitivo
                        payload = { message: String(parsed) };
                    }
                } catch (jsonError) {
                    // Se não for JSON válido, tratar como valor numérico direto
                    const numValue = parseFloat(messageStr);
                    console.log('🔢 Tentando parsear como número:', numValue, 'isNaN:', isNaN(numValue));
                    if (!isNaN(numValue)) {
                        // Determinar tipo baseado no tópico
                        if (topic.includes('rms')) {
                            payload = { type: 'rms', value: numValue, unit: 'V' };
                        } else if (topic.includes('latencia') || topic.includes('ms')) {
                            payload = { type: 'latency', value: numValue, unit: 'ms' };
                        } else if (topic.includes('alerta')) {
                            payload = { message: messageStr, timestamp: new Date().toISOString() };
                        } else {
                            // Valor genérico
                            payload = { value: numValue };
                        }
                        console.log('✅ Payload criado:', payload);
                    } else {
                        // Mensagem de texto simples
                        payload = { message: messageStr };
                    }
                }
                
                // Validar estrutura básica
                if (typeof payload !== 'object' || payload === null) {
                    throw new Error('Payload inválido');
                }
            } catch (e) {
                console.warn('Mensagem MQTT inválida:', e.message);
                return; // Ignorar mensagens inválidas
            }
            console.log(`📥 MQTT recebido do tópico '${topic}':`, payload);
            
            // [ADD] Processar e armazenar dados recebidos
            this.processMQTTMessage(topic, payload);
            
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

    async setupExternalAPI() {
        const fs = require('fs');
        const path = require('path');
        let config;
        try {
            const configPath = path.resolve(__dirname, '..', 'config.json');
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (err) {
            console.error('Erro ao ler config.json para API externa:', err);
            return;
        }

        const apiConfig = config.api;
        if (!apiConfig) {
            console.warn('⚠️ Configuração de API externa não encontrada');
            return;
        }

        console.log('🌐 Configurando polling da API externa...');
        
        // Função para buscar dados da API
        const fetchExternalData = async () => {
            try {
                const fetch = (await import('node-fetch')).default;
                
                // Buscar dados do /sincrono
                const sincronoResponse = await fetch(`${apiConfig.baseUrl}/sincrono`);
                const sincronoData = await sincronoResponse.json();
                
                if (Array.isArray(sincronoData) && sincronoData.length > 0) {
                    // Processar os últimos dados recebidos
                    sincronoData.slice(-10).forEach(item => {
                        const reading = {
                            value: item.valorEvento,
                            unit: item.unidade,
                            timestamp: item.horaEvento,
                            type: item.evento === 1 ? 'rms' : 'latency',
                            source: 'api'
                        };
                        
                        if (item.evento === 1) {
                            this.syncData.rms.push(reading);
                            if (this.syncData.rms.length > 100) this.syncData.rms.shift();
                        } else {
                            this.syncData.latency.push(reading);
                            if (this.syncData.latency.length > 100) this.syncData.latency.shift();
                        }
                    });
                    
                    console.log(`📊 API Externa: ${sincronoData.length} leituras processadas`);
                    
                    // Broadcast para clientes WebSocket
                    this.broadcastToWebSocket({
                        type: 'api_data',
                        data: { count: sincronoData.length }
                    });
                }
            } catch (error) {
                console.error('❌ Erro ao buscar dados da API externa:', error.message);
            }
        };

        // Buscar dados imediatamente
        await fetchExternalData();
        
        // Configurar polling a cada 10 segundos
        setInterval(fetchExternalData, 10000);
        console.log('✅ Polling da API externa ativado (10s)');
    }

    initializeServer() {
        this.port = process.env.PORT || 3000;
        this.wsClients = new Set(); // Clientes WebSocket conectados
        this.server = null;
        this.wss = null;
        this.setupServerAndWebSocket();
        this.setupMQTT();
        this.setupExternalAPI();
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
        console.log('📤 Broadcasting WebSocket:', message.type, this.wsClients.size, 'clientes');
        this.wsClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
    }

    // [ADD] Processar mensagens MQTT e armazenar dados
    processMQTTMessage(topic, payload) {
        const timestamp = new Date().toISOString();
        const config = this.loadMQTTConfig();
        
        // Determinar tipo baseado no tópico ou payload
        const isAlertTopic = topic.includes('alerta') || topic === config?.topics?.alerta;
        const isRMSTopic = topic.includes('rms') || topic === config?.topics?.rms;
        const isMSTopic = topic.includes('ms') || topic === config?.topics?.ms;
        
        // Também aceitar tópicos antigos para retrocompatibilidade
        const isAsyncTopic = topic === config?.topics?.async;
        const isSyncTopic = topic === config?.topics?.sync;

        // Processar dados SÍNCRONOS (periódicos): latência e RMS
        // Latência da rede (tópico sistema/ms)
        if (payload.type === 'latency' || payload.type === 'latencia') {
            const latencyData = {
                value: payload.value,
                unit: payload.unit || 'ms',
                timestamp,
                type: 'latency'
            };
            this.syncData.latency.push(latencyData);
            this.allReadings.push(latencyData);
            
            // Manter apenas últimas 500 leituras
            if (this.syncData.latency.length > 500) {
                this.syncData.latency.shift();
            }
            console.log('✅ Dados de latência armazenados:', latencyData);
        }

        // RMS (Root Mean Square) - corrente - tópico sistema/rms
        else if (payload.type === 'rms') {
            const rmsData = {
                value: payload.value,
                unit: payload.unit || 'V',
                timestamp,
                type: 'rms'
            };
            this.syncData.rms.push(rmsData);
            this.allReadings.push(rmsData);
            
            if (this.syncData.rms.length > 500) {
                this.syncData.rms.shift();
            }
            console.log('✅ Dados de RMS armazenados:', rmsData);
        }

        // Processar eventos ASSÍNCRONOS (strings): "energia caiu", "rede caiu", "energia voltou", "rede voltou"
        if (isAsyncTopic || isAlertTopic) {
            const eventMessage = payload.message || payload.event || payload.description || '';
            
            // Categorizar baseado no conteúdo da mensagem
            let category = 'other';
            const msgLower = eventMessage.toLowerCase();
            
            if (msgLower.includes('energia caiu') || msgLower.includes('power outage')) {
                category = 'power_outage';
            } else if (msgLower.includes('rede caiu') || msgLower.includes('network outage')) {
                category = 'network_outage';
            } else if (msgLower.includes('energia voltou') || msgLower.includes('power restored')) {
                category = 'power_restored';
            } else if (msgLower.includes('rede voltou') || msgLower.includes('network restored')) {
                category = 'network_restored';
            }
            
            // Adicionar evento crítico
            this.addCriticalEvent({
                category,
                message: eventMessage,
                timestamp
            });
        }

        // Broadcast para WebSocket (tempo real)
        this.broadcastToWebSocket({
            topic,
            payload,
            timestamp
        });
    }

    // Adicionar evento crítico
    addCriticalEvent(event) {
        this.criticalEvents.push(event);
        
        // Manter apenas últimos 500 eventos
        if (this.criticalEvents.length > 500) {
            this.criticalEvents.shift();
        }

        // Broadcast evento crítico para clientes conectados
        this.broadcastToWebSocket({
            type: 'critical_event',
            event
        });
        
        console.log(`⚠️ Evento crítico: ${event.category} - ${event.message}`);
    }

    // [ADD] Carregar configuração MQTT
    loadMQTTConfig() {
        try {
            const fs = require('fs');
            const path = require('path');
            const configPath = path.resolve(__dirname, '..', 'config.json');
            return JSON.parse(fs.readFileSync(configPath, 'utf8')).mqtt;
        } catch (err) {
            return null;
        }
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