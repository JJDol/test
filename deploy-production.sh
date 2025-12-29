#!/bin/bash

echo "🚀 Deploying to Vercel PRODUCTION with optimized timeout configuration..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "npm i -g vercel"
    exit 1
fi

# Deploy to production specifically
echo "📦 Building and deploying to PRODUCTION..."
vercel --prod

echo "✅ Production deployment complete!"
echo ""
echo "🔧 Configuration applied:"
echo "   - Function timeout: 600 seconds (10 minutes) - ONLY in PRODUCTION"
echo "   - Memory allocation: 4GB"
echo "   - Region: US East (iad1)"
echo "   - Compression: Minimal for faster processing"
echo ""
echo "⚠️  IMPORTANT: Preview deployments are limited to 10 seconds!"
echo "   Use PRODUCTION deployment for document generation."
echo ""
echo "📊 Monitor your deployment at: https://vercel.com/dashboard" 