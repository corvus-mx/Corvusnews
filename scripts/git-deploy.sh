#!/bin/bash

# Script para deployment automático - Corvus News
# Uso: ./scripts/git-deploy.sh "mensaje del commit"

set -e

echo "🦉 CORVUS NEWS - Deployment Automático"
echo "======================================"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Mensaje del commit
COMMIT_MSG="${1:-Actualización automática de noticias}"

echo "📝 Agregando archivos..."
git add .

echo "💾 Creando commit..."
git commit -m "$COMMIT_MSG" || echo "ℹ️  No hay cambios para commitear"

echo "🚀 Subiendo a repositorio..."
git push origin main

echo "✅ Deployment completado!"
echo ""
echo "🌐 Tu sitio se actualizará automáticamente en:"
echo "   - GitHub Pages (si está configurado)"
echo "   - Netlify (si está conectado)"
echo "   - Vercel (si está conectado)"
echo ""
echo "🎉 ¡Listo! Tu noticia ya está publicada."