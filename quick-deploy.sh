#!/bin/bash
# Deploy rápido no Vercel (sem remover arquivos)

echo "🚀 Preparando deploy no Vercel..."
echo ""
echo "ℹ️  O .vercelignore já está configurado"
echo "ℹ️  O Vercel vai ignorar automaticamente:"
echo "   - Backend (Back/)"
echo "   - APIs (api/)"
echo "   - Node modules"
echo "   - Scripts"
echo ""
echo "📦 Fazendo deploy..."
echo ""

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI não encontrado"
    echo "📥 Instale com: npm i -g vercel"
    exit 1
fi

# Deploy
vercel --prod

echo ""
echo "✅ Deploy concluído!"
