const bcrypt = require('bcryptjs');

async function generatePasswordHash(password) {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log(`Senha: "${password}"`);
    console.log(`Hash: "${hash}"`);
    console.log('---');
}

async function main() {
    console.log('🔐 Gerador de Hash para Senhas - Sentinela\n');
    
    // Gerar hashes para senhas padrão
    await generatePasswordHash('admin123');
    await generatePasswordHash('operator123');
    await generatePasswordHash('password');
    
    console.log('✅ Use estes hashes no arquivo server.js para as senhas dos usuários.');
}

main().catch(console.error);