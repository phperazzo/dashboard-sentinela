# 🧹 Limpeza do Projeto - Resumo

## Arquivos que serão removidos:

### 📋 Arquivos de Teste (Back/)
- ❌ test-apis-only.js
- ❌ test-colors.js
- ❌ test-critical-events.js
- ❌ test-debug.js
- ❌ test-extreme.js
- ❌ test-mqtt-hivemq.js
- ❌ test-new-format.js
- ❌ test-websocket-client.js
- ❌ test-websocket.js

### 🔴 Kafka (não usado mais)
- ❌ Back/kafka-consumer.js
- ❌ Back/send-test-kafka.js
- ❌ kafkajs (removido do package.json)

### 🗑️ Arquivos Temporários
- ❌ Back/generate-passwords.js
- ❌ Back/cookies.txt
- ❌ Back/server.log
- ❌ server.log
- ❌ server.pid
- ❌ cookies.txt

### 📜 Scripts Desnecessários
- ❌ restart-server.sh
- ❌ mttq-test.jsw

### 📁 Diretórios
- ❌ certs/ (certificados)
- ❌ api/ (API serverless não usada)

## ✅ Arquivos Mantidos (Essenciais):

### Backend
- ✅ Back/server.js (servidor principal)
- ✅ Back/package.json (atualizado)
- ✅ Back/.env.example

### Frontend
- ✅ *.html (todas as páginas)
- ✅ styles.css
- ✅ script.js
- ✅ sw.js

### Configuração
- ✅ config.json
- ✅ vercel.json
- ✅ .gitignore
- ✅ .vercelignore

### Documentação
- ✅ README.md
- ✅ SECURITY.md
- ✅ LOGIN_CREDENTIALS.md
- ✅ VERIFICATION.md
- ✅ DEPLOY_VERCEL.md

### Scripts Úteis
- ✅ start.sh
- ✅ start-background.sh
- ✅ stop.sh
- ✅ quick-deploy.sh
- ✅ cleanup-for-vercel.sh

## 🚀 Como executar a limpeza:

```bash
chmod +x cleanup-project.sh
./cleanup-project.sh
```

## 📊 Mudanças no package.json:

### Antes:
```json
"dependencies": {
  "kafkajs": "^2.2.4",  ← REMOVIDO
  "mqtt": "^5.14.1",
  ...
}
```

### Depois:
```json
"dependencies": {
  "mqtt": "^5.14.1",
  ...
}
```

## ⚡ Benefícios:

1. **Projeto mais limpo** - Menos arquivos desnecessários
2. **Instalação mais rápida** - Menos dependências
3. **Menor tamanho** - Repositório mais leve
4. **Mais organizado** - Apenas código em uso
5. **Melhor deploy** - Menos confusão para o Vercel

## 📝 Próximos passos após limpeza:

```bash
# 1. Reinstalar dependências
npm install
cd Back && npm install && cd ..

# 2. Testar
node Back/server.js

# 3. Commit
git add .
git commit -m "chore: remove arquivos desnecessários e dependências do Kafka"
git push
```
