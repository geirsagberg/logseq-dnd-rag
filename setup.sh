#!/bin/bash

echo "🎲 Logseq D&D RAG Setup"
echo ""

if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install it first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install it first:"
    echo "   https://www.docker.com/get-started"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your API keys:"
    echo "   - OPENAI_API_KEY"
    echo "   - ANTHROPIC_API_KEY"
    echo "   - LOGSEQ_PATH"
    echo ""
    read -p "Press Enter when ready to continue..."
fi

echo "🐳 Starting Qdrant..."
docker compose up -d

echo ""
echo "⏳ Waiting for Qdrant to be ready..."
sleep 3

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. bun sync full      # Index your Logseq notes"
echo "  2. bun query \"test\"   # Query your knowledge base"
echo ""
