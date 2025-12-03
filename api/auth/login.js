const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Configuração de usuário hardcoded (Vercel não suporta persistência de arquivos)
const USER_CONFIG = {
    username: 'admin',
    password: '$2a$10$kCsbEp7oIi1uW.LBK.JfIe3sW/R7qaG1ZDCF5KYhgKfdtkxC0molK', // "admin"
    name: 'Administrador',
    role: 'Administrador do Sistema',
    permissions: ['read', 'write', 'admin']
};

const JWT_SECRET = process.env.JWT_SECRET || 'sentinela_secret_key_2025';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';

module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            message: 'Método não permitido' 
        });
    }

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

        // Verificar usuário (apenas admin é permitido)
        if (sanitizedUsername !== 'admin') {
            return res.status(401).json({ 
                success: false, 
                message: 'Credenciais inválidas' 
            });
        }

        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, USER_CONFIG.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Credenciais inválidas' 
            });
        }

        // Gerar token JWT
        const tokenPayload = {
            username: USER_CONFIG.username,
            name: USER_CONFIG.name,
            role: USER_CONFIG.role,
            permissions: USER_CONFIG.permissions
        };

        const tokenExpire = rememberMe ? '7d' : JWT_EXPIRE;
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: tokenExpire });

        // Configurar cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
        };

        // No Vercel, cookies via Set-Cookie header
        const cookieValue = `authToken=${token}; HttpOnly; ${cookieOptions.secure ? 'Secure;' : ''} SameSite=Strict; Max-Age=${Math.floor(cookieOptions.maxAge / 1000)}; Path=/`;
        res.setHeader('Set-Cookie', cookieValue);

        return res.status(200).json({
            success: true,
            message: 'Login realizado com sucesso',
            user: {
                username: USER_CONFIG.username,
                name: USER_CONFIG.name,
                role: USER_CONFIG.role
            },
            token
        });

    } catch (error) {
        console.error('Erro no login:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
};
