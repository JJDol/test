#!/bin/bash

echo "🚀 Deploying to Vercel with optimized timeout configuration..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "npm i -g vercel"
    exit 1
fi

# Deploy with production settings
echo "📦 Building and deploying..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "🔧 Configuration applied:"
echo "   - Function timeout: 600 seconds (10 minutes)"
echo "   - Memory allocation: 4GB"
echo "   - Region: US East (iad1)"
echo "   - Compression: Minimal for faster processing"
echo ""
echo "📊 Monitor your deployment at: https://vercel.com/dashboard" 