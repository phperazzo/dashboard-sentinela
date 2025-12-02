# 🧹 Limpeza para Deploy no Vercel

## Opções de Limpeza

### Opção 1: Manter Tudo (Usar .vercelignore)
O `.vercelignore` já está configurado para ignorar os arquivos desnecessários.
O Vercel não vai fazer upload do backend, scripts, etc.

**Vantagens:**
- ✅ Mantém o código completo no Git
- ✅ Pode rodar localmente
- ✅ Só ignora no deploy

**Deploy:**
```bash
vercel --prod
```

### Opção 2: Remover Arquivos (Limpeza Total)
Execute o script de limpeza para remover fisicamente os arquivos.

**⚠️ ATENÇÃO:** Isso remove permanentemente os arquivos!

```bash
chmod +x cleanup-for-vercel.sh
./cleanup-for-vercel.sh
```

**O que será removido:**
- ❌ Back/ (backend completo)
- ❌ api/ (APIs serverless)
- ❌ certs/ (certificados)
- ❌ node_modules/
- ❌ Scripts .sh
- ❌ package.json
- ❌ Arquivos de log

**O que permanece:**
- ✅ login.html
- ✅ dashboard.html
- ✅ settings.html
- ✅ reports.html
- ✅ apis.html
- ✅ home.html
- ✅ index.html
- ✅ styles.css
- ✅ script.js
- ✅ sw.js
- ✅ config.json
- ✅ vercel.json
- ✅ Documentação (.md)

## 🚀 Deploy no Vercel

Após escolher uma opção:

```bash
# Instalar Vercel CLI (se não tiver)
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## 📝 Notas Importantes

1. **Frontend Estático:** O Vercel vai servir apenas HTML/CSS/JS
2. **Sem Backend:** APIs não funcionarão (WebSocket, MQTT, etc)
3. **Layout Visual:** O visual/design funcionará perfeitamente
4. **Dados Mockados:** Configure dados de exemplo no JavaScript

## 🔄 Recomendação

**Use Opção 1** se você quer:
- Manter o código completo no repositório
- Poder rodar localmente com backend
- Fazer deploy apenas do frontend

**Use Opção 2** se você quer:
- Um repositório mais limpo
- Apenas frontend (sem backend)
- Menor tamanho de repositório
