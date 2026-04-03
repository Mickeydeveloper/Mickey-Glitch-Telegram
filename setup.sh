#!/bin/bash

# ============================================
#         BOT SETUP SCRIPT
# ============================================
# This script installs all required dependencies
# Run this in your container: bash setup.sh

echo "🤖 Setting up WhatsApp Bot..."
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please run this script from the bot directory (/home/container)"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "🚀 Starting bot..."
    echo "================================="
    node index.js
else
    echo "❌ Failed to install dependencies!"
    echo "Try running: npm install --unsafe-perm=true"
    exit 1
fi