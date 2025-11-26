# 🔐 Sistema de Login - Sentinela Dashboard

## 📋 Credenciais de Acesso

### 👨‍💼 **Usuário Padrão**
- **Usuário:** `admin`  
- **Senha:** `admin` (padrão)
- **Permissões:** Acesso completo ao sistema

> 💡 **Primeira vez?** Use as credenciais padrão e altere a senha nas configurações do dashboard!

---

## 🚀 Como Acessar

1. **Abra o navegador** em: `http://localhost:3000/login.html`
2. **Digite as credenciais** de um dos usuários acima
3. **Clique em "Entrar"**
4. **Será redirecionado** para o dashboard principal

---

## 🔒 Recursos de Segurança

### ✅ **Implementados:**
- **Autenticação JWT** com cookies seguros
- **Senhas hash** com bcrypt (salt rounds: 10)
- **Proteção de rotas** - dashboard só acessível após login
- **Sessão persistente** com opção "Lembrar-me" (7 dias)
- **Logout automático** quando token expira
- **Validação** de campos obrigatórios
- **Feedback visual** de erro/loading

### 🛡️ **Funcionalidades:**
- **Toggle de senha** (mostrar/ocultar)
- **Validação de token** automática
- **Redirecionamento** automático se já logado
- **Limpar cookies** no logout
- **Middleware de proteção** nos arquivos estáticos

---

## 📁 Estrutura de Arquivos

```
📦 dashboard-sentinela/
├── 🔐 login.html          # Tela de login
├── 📊 dashboard.html      # Dashboard protegido  
├── 🏠 home.html          # Página inicial (redireciona)
├── 🎨 styles.css         # Estilos globais
├── ⚙️ script.js          # JavaScript do dashboard
└── 📂 Back/
    ├── 🖥️ server.js       # Servidor com autenticação
    ├── 🔑 .env            # Variáveis de ambiente
    └── 🔐 generate-passwords.js # Gerador de hashes
```

---

## ⚙️ Configurações do Servidor

### 🌐 **URLs Disponíveis:**
- `http://localhost:3000/` → Redireciona para login
- `http://localhost:3000/login.html` → Tela de login 
- `http://localhost:3000/dashboard.html` → Dashboard (protegido)

### 🔌 **API Endpoints:**
- `POST /api/auth/login` → Fazer login
- `GET /api/auth/check` → Verificar autenticação
- `POST /api/auth/logout` → Fazer logout
- `GET /api/user/profile` → Dados do usuário (protegido)

### 🔐 **Segurança JWT:**
- **Secret:** Configurável via `.env`
- **Expiração:** 24h (padrão) ou 7d (lembrar-me)
- **Cookie:** HttpOnly, Secure (em produção), SameSite

---

## 🧪 Testando o Sistema

### 1. **Login Bem-sucedido:**
```bash
# Teste via curl
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### 2. **Verificar Autenticação:**
```bash
curl -X GET http://localhost:3000/api/auth/check \
  -b "authToken=SEU_TOKEN_AQUI"
```

### 3. **Logout:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b "authToken=SEU_TOKEN_AQUI"
```

---

## 🔧 Personalizações Futuras

### 💾 **Banco de Dados:**
- Substituir array `USERS` por banco de dados
- Implementar registro de novos usuários
- Sistema de recuperação de senha
- Log de acessos e auditoria

### 🛡️ **Segurança Avançada:**
- Rate limiting para login
- Captcha após tentativas falhadas  
- Autenticação 2FA
- Políticas de senha mais rigorosas
- Timeout de sessão por inatividade

### 👥 **Gestão de Usuários:**
- Interface de administração
- Perfis e permissões granulares
- Grupos de usuários
- Aprovação de cadastros

---

## 📝 Notas Importantes

⚠️ **Em Produção:**
- Altere `JWT_SECRET` no arquivo `.env`
- Use HTTPS (configure `NODE_ENV=production`)
- Implemente rate limiting
- Configure backup dos dados de usuários
- Monitore tentativas de acesso suspeitas

✅ **Sistema Pronto para Uso!**
O dashboard agora possui autenticação completa e segura! 🎉