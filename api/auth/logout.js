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
        // Limpar cookie
        res.setHeader('Set-Cookie', 'authToken=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/');

        return res.status(200).json({
            success: true,
            message: 'Logout realizado com sucesso'
        });

    } catch (error) {
        console.error('Erro no logout:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
};
