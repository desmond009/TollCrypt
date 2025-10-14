#!/bin/bash

# Development Backend Startup Script
# This script ensures the backend runs with proper environment variables for development

echo "🚀 Starting TollChain Backend in Development Mode..."

# Navigate to backend directory first
cd backend

# Load the existing .env file
if [ -f .env ]; then
    echo "📄 Loading existing .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found, using default values..."
    export NODE_ENV=development
    export MOCK_BLOCKCHAIN=true
    export JWT_SECRET=development-secret-change-in-production
    export PORT=3001
    export RPC_URL=https://rpc.sepolia.eth.gateway.fm
    export TOPUP_WALLET_FACTORY_ADDRESS=0x0000000000000000000000000000000000000000
    export TOPUP_TOLL_COLLECTION_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
    export FACTORY_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
    export TOLL_COLLECTION_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
    export FRONTEND_URL=http://localhost:3000
    export MONGODB_URI=mongodb://localhost:27017/tollchain
fi

# Ensure mock blockchain mode is enabled for development
export MOCK_BLOCKCHAIN=true

echo "✅ Environment variables loaded"
echo "🔧 Mock blockchain mode enabled"
echo "🌐 Backend will run on port ${PORT:-3001}"
echo "🔗 Frontend URL: ${FRONTEND_URL:-http://localhost:3000}"
echo "🏭 TopUp Factory: ${TOPUP_WALLET_FACTORY_ADDRESS}"
echo "💰 Toll Collection: ${TOPUP_TOLL_COLLECTION_CONTRACT_ADDRESS}"

# Start the server
npm run dev
