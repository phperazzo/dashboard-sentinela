# Deploy no Vercel - Dashboard Sentinela

## ✅ Problemas Corrigidos

### 1. Página inicial corrigida
- ✅ Agora o Vercel abre `login.html` como página inicial (não mais `index.html`)
- ✅ `index.html` foi renomeado para `index.html.backup` (não é mais usado)

### 2. API de autenticação funcionando
- ✅ Criadas serverless functions em `/api/auth/`:
  - `login.js` - Autenticação de usuário
  - `check.js` - Verificação de token
  - `logout.js` - Logout de usuário
- ✅ As rotas `/api/auth/login`, `/api/auth/check` e `/api/auth/logout` agora funcionam no Vercel

### 3. Configuração atualizada
- ✅ `vercel.json` atualizado com rewrites corretos
- ✅ Headers CORS configurados para as APIs
- ✅ `package.json` atualizado com todas as dependências necessárias

## 🚀 Como fazer deploy

### Opção 1: Via Vercel CLI (Recomendado)

```bash
# 1. Instalar Vercel CLI (se não tiver)
npm i -g vercel

# 2. Fazer login no Vercel
vercel login

# 3. Deploy
vercel --prod
```

### Opção 2: Via GitHub + Vercel Dashboard

1. Faça commit e push das alterações:
```bash
git add .
git commit -m "Corrigir deploy Vercel: adicionar API serverless e corrigir roteamento"
git push
```

2. Vá em https://vercel.com/dashboard
3. Importe seu repositório
4. Configure e faça deploy

## 🔐 Credenciais de Login

- **Usuário:** `admin`
- **Senha:** `admin`

## ⚠️ Limitações do Vercel

O Vercel não suporta:
- ❌ WebSocket (comunicação em tempo real)
- ❌ MQTT (conexões persistentes)
- ❌ Processos em background

Por isso, no Vercel você terá acesso a:
- ✅ Tela de login funcional
- ✅ Interface visual do dashboard
- ✅ Layout e design
- ❌ Dados em tempo real (MQTT/WebSocket não funciona)

## 💡 Para funcionalidade completa

Se você precisa de:
- Dados em tempo real via WebSocket
- Conexão MQTT com sensores
- Atualizações automáticas

Recomendamos hospedar em:
- **Render.com** (suporta WebSocket) - https://render.com
- **Railway.app** - https://railway.app
- **Fly.io** - https://fly.io
- VPS tradicional (DigitalOcean, AWS EC2, etc)

## 📁 Estrutura de arquivos criados

```
/api/
  /auth/
    login.js       # Serverless function para login
    check.js       # Serverless function para verificar token
    logout.js      # Serverless function para logout

vercel.json        # Configuração do Vercel (atualizada)
package.json       # Dependências (atualizada)
```

## 🧪 Testar localmente

```bash
# Instalar Vercel CLI
npm i -g vercel

# Rodar ambiente Vercel local
vercel dev
```

Isso vai simular o ambiente do Vercel na sua máquina local.

## ✅ Checklist antes do deploy

- [x] `index.html` renomeado/removido
- [x] API serverless criada em `/api/auth/`
- [x] `vercel.json` configurado corretamente
- [x] `package.json` com todas as dependências
- [x] Credenciais de login definidas

## 🐛 Solução de problemas

### "404 Not Found" nas rotas /api/auth/*
- Verifique se a pasta `/api/auth/` existe
- Verifique se os arquivos `.js` estão lá
- Rode `vercel dev` localmente para testar

### "Credenciais inválidas" no login
- Use **admin** / **admin**
- Verifique o console do navegador para erros
- Verifique os logs do Vercel

### Página em branco
- Verifique se o deploy terminou com sucesso
- Verifique os logs no dashboard do Vercel
- Limpe o cache do navegador
