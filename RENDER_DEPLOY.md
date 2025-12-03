# 🚀 Deploy no Render.com - Dashboard Sentinela COMPLETO

## ✅ Por que Render.com?

- ✅ **WebSocket funciona** 
- ✅ **MQTT funciona**
- ✅ **Processos em background** funcionam
- ✅ **Grátis** (tier free disponível)
- ✅ **Deploy automático** via GitHub

## 📋 Passo a Passo

### 1. Criar conta no Render

Acesse: https://render.com e faça login com GitHub

### 2. Criar novo Web Service

1. Clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório: `phperazzo/dashboard-sentinela`
3. Configure:

```
Name: dashboard-sentinela
Region: Oregon (US West) ou Frankfurt (Europa)
Branch: main
Root Directory: (deixe vazio)
Runtime: Node
Build Command: cd Back && npm install
Start Command: cd Back && node server.js
Instance Type: Free
```

### 3. Variáveis de Ambiente

Clique em **"Advanced"** e adicione:

```bash
NODE_ENV=production
JWT_SECRET=sentinela_secret_key_2025_production
JWT_EXPIRE=24h

# MQTT (suas credenciais HiveMQ)
MQTT_BROKER=mqtts://bdffc9a5bf6e4bf28591393206fc27e0.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=seu_usuario
MQTT_PASSWORD=sua_senha

# Se tiver API externa
API_EXTERNAL_URL=sua_url_se_tiver
```

### 4. Deploy

Clique em **"Create Web Service"**

O Render vai:
- ✅ Clonar seu repositório
- ✅ Instalar dependências
- ✅ Iniciar o servidor
- ✅ Gerar uma URL pública (ex: `https://dashboard-sentinela.onrender.com`)

### 5. Acessar

Aguarde ~2-3 minutos e acesse a URL fornecida pelo Render.

**Login:**
- Usuário: `admin`
- Senha: `admin`

## 🔧 Configuração Automática

O Render detecta automaticamente que é um projeto Node.js.

### Arquivo opcional: `render.yaml`

Se quiser automação completa, crie na raiz:

```yaml
services:
  - type: web
    name: dashboard-sentinela
    env: node
    buildCommand: cd Back && npm install
    startCommand: cd Back && node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true
```

## 📊 Diferenças Render vs Vercel

| Recurso | Vercel | Render.com |
|---------|--------|------------|
| WebSocket | ❌ | ✅ |
| MQTT | ❌ | ✅ |
| Processos contínuos | ❌ | ✅ |
| Serverless | ✅ | ✅ |
| Custo Free | ✅ | ✅ |
| Deploy automático | ✅ | ✅ |

## ⚠️ Importante

### Tier Free do Render:

- ✅ 750 horas/mês grátis
- ⚠️ Dorme após 15 min inativo
- ⚠️ Demora ~30s para "acordar"
- ✅ SSL/HTTPS automático
- ✅ Deploy ilimitados

### Para evitar que durma:

Use um serviço de ping como:
- **UptimeRobot** (https://uptimerobot.com) - Grátis
- Faz ping a cada 5 minutos
- Mantém o servidor sempre ativo

## 🔄 Deploy Híbrido (Opcional)

Você pode manter:
- **Vercel** → Landing page / Documentação (modo demo)
- **Render** → Dashboard completo (dados reais)

## 🐛 Solução de Problemas

### Build falha?
- Verifique se o `Build Command` está correto
- Veja os logs de build no Render

### Servidor não inicia?
- Verifique o `Start Command`
- Veja os logs em tempo real no Render

### WebSocket não conecta?
- Certifique-se que o servidor está usando `0.0.0.0` e não `localhost`
- No `Back/server.js` deve ter: `server.listen(PORT, '0.0.0.0')`

## 📝 Checklist

- [ ] Conta criada no Render.com
- [ ] Repositório conectado
- [ ] Build command: `cd Back && npm install`
- [ ] Start command: `cd Back && node server.js`
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy iniciado
- [ ] URL acessível
- [ ] Login funcionando
- [ ] WebSocket conectando
- [ ] Dados MQTT chegando

## 🎯 Próximos Passos

Após deploy no Render:
1. Acesse a URL fornecida
2. Faça login com admin/admin
3. Verifique se WebSocket conecta
4. Verifique se dados MQTT aparecem
5. Configure UptimeRobot (opcional) para manter ativo

**Pronto! Dashboard 100% funcional! 🚀**
