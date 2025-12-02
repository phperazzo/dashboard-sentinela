# Guia de Deploy no Vercel - Dashboard Sentinela

## ⚠️ IMPORTANTE: Limitações do Vercel

O Vercel tem limitações importantes que afetam este projeto:

1. **WebSocket não é suportado** - Seu projeto usa WebSocket para comunicação em tempo real
2. **MQTT não funciona** - Conexões MQTT persistentes não funcionam em serverless
3. **Processos em background** - Não pode manter processos rodando continuamente

## 🔧 Soluções

### Opção 1: Deploy Estático (RECOMENDADO para testes visuais)

Se você só quer testar o layout/visual do dashboard:

1. **Remover chamadas de API** temporariamente dos arquivos HTML
2. **Usar dados mockados** em JavaScript
3. **Deploy apenas do frontend**

**Passos:**

```bash
# 1. Criar arquivo vercel.json simplificado
cat > vercel.json << 'EOF'
{
  "rewrites": [
    { "source": "/", "destination": "/login.html" }
  ]
}
EOF

# 2. Deploy
vercel --prod
```

### Opção 2: Hospedar em Plataforma com Suporte a WebSocket

Para funcionalidade completa, use uma destas plataformas:

#### **Render.com** (RECOMENDADO)
- ✅ Suporta WebSocket
- ✅ Suporta processos contínuos
- ✅ Tier gratuito disponível

**Deploy no Render:**
1. Crie conta em https://render.com
2. New > Web Service
3. Conecte seu repositório GitHub
4. Configure:
   - Build Command: `npm install`
   - Start Command: `node Back/server.js`
   - Environment: `Node`

#### **Railway.app**
- ✅ Suporta WebSocket
- ✅ Suporta MQTT
- ✅ Fácil de usar

**Deploy no Railway:**
1. Crie conta em https://railway.app
2. New Project > Deploy from GitHub
3. Selecione o repositório
4. Configure variável de ambiente: `PORT=3000`

#### **Fly.io**
- ✅ Suporta WebSocket
- ✅ Suporta processos contínuos
- ✅ Deploy via Docker

### Opção 3: Separar Frontend e Backend

**Frontend no Vercel** + **Backend no Render/Railway**

1. Deploy o backend (Back/) no Render/Railway
2. Deploy o frontend (HTML/CSS/JS) no Vercel
3. Configure CORS no backend para aceitar domínio do Vercel
4. Atualize URLs de API no frontend para apontar para backend

## 🎨 Se o Problema é Visual/CSS no Vercel

Se você já fez deploy no Vercel e o layout está quebrado:

### Problemas Comuns:

1. **Caminhos de arquivos CSS/JS**
   - Verifique se os caminhos são relativos corretos
   - Use `/styles.css` em vez de `styles.css`

2. **Content Security Policy**
   - Verifique headers CSP no HTML

3. **Cache do Browser**
   - Limpe o cache (Ctrl+Shift+R)
   - Teste em navegador privado

### Solução Rápida:

Atualize os caminhos nos HTMLs:

```html
<!-- De: -->
<link rel="stylesheet" href="styles.css">
<script src="script.js"></script>

<!-- Para: -->
<link rel="stylesheet" href="/styles.css">
<script src="/script.js"></script>
```

## 📝 Configuração Atual do Projeto

Seu projeto tem:
- ✅ Backend Node.js em `/Back/server.js`
- ✅ Frontend HTML/CSS/JS na raiz
- ✅ WebSocket para tempo real
- ✅ MQTT para IoT
- ✅ Autenticação JWT

**Status:** Não compatível com Vercel sem modificações significativas

## 🚀 Próximos Passos Recomendados

1. **Para testar layout:** Siga Opção 1 (Deploy Estático)
2. **Para app funcional:** Use Render.com (Opção 2)
3. **Para produção:** Separe frontend/backend (Opção 3)

## 🛠️ Comandos Úteis

```bash
# Testar localmente
npm install
node Back/server.js

# Ver em http://localhost:3000

# Deploy no Vercel (apenas frontend)
vercel

# Deploy no Render
# (use a interface web)
```

## ❓ Precisa de Ajuda?

Me diga qual opção você prefere e posso ajustar o código!
