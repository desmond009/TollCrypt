#!/bin/bash

# Environment Setup Script for Top-Up Wallet System
# This script helps you set up the environment variables needed for deployment

echo "🔧 Top-Up Wallet System Environment Setup"
echo "========================================"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    touch .env
fi

echo ""
echo "Please provide the following information:"

# Get private key
echo -n "🔑 Enter your private key (0x...): "
read PRIVATE_KEY

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Private key is required"
    exit 1
fi

# Get RPC URL
echo -n "🌐 Enter your RPC URL (e.g., https://sepolia.infura.io/v3/...): "
read RPC_URL

if [ -z "$RPC_URL" ]; then
    echo "❌ RPC URL is required"
    exit 1
fi

# Get Etherscan API key (optional)
echo -n "🔍 Enter your Etherscan API key (optional, for contract verification): "
read ETHERSCAN_API_KEY

# Get existing TollCollection address (optional)
echo -n "📋 Enter existing TollCollection address (optional, leave empty for new deployment): "
read EXISTING_TOLL_COLLECTION_ADDRESS

# Write to .env file
echo "📝 Writing environment variables to .env file..."

cat > .env << EOF
# Deployment Configuration
PRIVATE_KEY=$PRIVATE_KEY
RPC_URL=$RPC_URL
ETHERSCAN_API_KEY=$ETHERSCAN_API_KEY
EXISTING_TOLL_COLLECTION_ADDRESS=$EXISTING_TOLL_COLLECTION_ADDRESS

# Contract Configuration
PAYMENT_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
INITIAL_TOLL_RATE=1000000000000000
EOF

echo "✅ Environment variables saved to .env file"

# Set environment variables for current session
export PRIVATE_KEY=$PRIVATE_KEY
export RPC_URL=$RPC_URL
export ETHERSCAN_API_KEY=$ETHERSCAN_API_KEY
export EXISTING_TOLL_COLLECTION_ADDRESS=$EXISTING_TOLL_COLLECTION_ADDRESS

echo ""
echo "🚀 You can now run the deployment script:"
echo "   ./deploy.sh"
echo ""
echo "Or deploy manually:"
echo "   cd contracts"
echo "   forge script script/DeployTopUpWalletSystem.s.sol --rpc-url \$RPC_URL --broadcast --verify"
