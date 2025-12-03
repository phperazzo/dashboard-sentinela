# 🚀 GUIA RÁPIDO - Deploy Vercel Corrigido

## ✅ Problemas Corrigidos

### 1. **Tela preta / Download de arquivo**
- ✅ `.vercelignore` corrigido - não ignora mais `api/` e `package.json`
- ✅ `vercel.json` atualizado com configuração `version 2` e `builds`
- ✅ Headers Content-Type configurados para HTML, CSS e JS

### 2. **API 404**
- ✅ Serverless functions criadas em `/api/auth/`
- ✅ Routes configuradas corretamente no `vercel.json`

## 📦 Arquivos Importantes

```
/api/auth/
  ├── login.js    ✅ (POST /api/auth/login)
  ├── check.js    ✅ (GET /api/auth/check)
  └── logout.js   ✅ (POST /api/auth/logout)

vercel.json       ✅ (Configuração completa)
.vercelignore     ✅ (Não ignora mais api/ e package.json)
package.json      ✅ (Dependências: bcryptjs, jsonwebtoken)
```

## 🚀 Como Fazer Deploy

### Opção 1: Via GitHub (Recomendado)

```bash
# 1. Commit e push
git add .
git commit -m "Fix: Corrigir Vercel - adicionar builds e routes"
git push

# 2. No Vercel Dashboard:
# - Vá em vercel.com/dashboard
# - O deploy será automático após o push
```

### Opção 2: Via Vercel CLI

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy de produção
vercel --prod
```

## 🧪 Testar Localmente

```bash
# Instalar Vercel CLI
npm i -g vercel

# Simular ambiente Vercel
vercel dev
```

Acesse: http://localhost:3000

## 🔐 Credenciais

- **Usuário:** `admin`
- **Senha:** `admin`

## 🔍 O Que Mudou

### **vercel.json**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [...],
  "headers": [...]
}
```

**Antes:** Usava apenas `rewrites` (não funciona bem com HTML)  
**Agora:** Usa `version 2` com `builds` e `routes` (correto)

### **.vercelignore**
```diff
- api/              # ❌ REMOVI - precisa das serverless functions
- package.json      # ❌ REMOVI - precisa das dependências
```

## ⚠️ Importante

Depois do deploy no Vercel, você terá:
- ✅ **Login funcionando** (API serverless)
- ✅ **Interface visual** completa
- ✅ **Páginas HTML** renderizando corretamente
- ❌ **WebSocket/MQTT** não funciona (limitação do Vercel)

## 🐛 Solução de Problemas

### Ainda aparece tela preta?
1. Limpe o cache do navegador (Ctrl+Shift+Del)
2. Tente modo anônimo
3. Verifique os logs no Vercel Dashboard

### Erro 404 nas APIs?
1. Verifique se a pasta `/api/auth/` existe no deploy
2. Veja os logs de build no Vercel
3. Rode `vercel dev` localmente para testar

### Download ao invés de abrir?
- Já foi corrigido com os headers Content-Type no `vercel.json`
- Faça um novo deploy para aplicar as mudanças

## ✅ Checklist Final

- [x] `vercel.json` com `version 2`, `builds` e `routes`
- [x] `.vercelignore` NÃO ignora `api/` e `package.json`
- [x] Pasta `/api/auth/` com 3 arquivos `.js`
- [x] Headers Content-Type configurados
- [x] `package.json` com bcryptjs e jsonwebtoken

Está tudo pronto! Faça o deploy agora! 🚀
