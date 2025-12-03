const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sentinela_secret_key_2025';

module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            message: 'Método não permitido' 
        });
    }

    try {
        // Obter token do cookie ou header
        let token = null;
        
        // Tentar obter do cookie
        if (req.cookies && req.cookies.authToken) {
            token = req.cookies.authToken;
        }
        
        // Se não tiver no cookie, tentar do header Authorization
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                authenticated: false,
                message: 'Token não fornecido'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, JWT_SECRET);

        return res.status(200).json({
            success: true,
            authenticated: true,
            user: {
                username: decoded.username,
                name: decoded.name,
                role: decoded.role,
                permissions: decoded.permissions
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                authenticated: false,
                message: 'Token inválido'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                authenticated: false,
                message: 'Token expirado'
            });
        }

        console.error('Erro ao verificar token:', error);
        return res.status(500).json({
            success: false,
            authenticated: false,
            message: 'Erro interno do servidor'
        });
    }
};
