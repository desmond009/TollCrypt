#!/bin/bash

# Quick deployment script for Top-Up Wallet System
# This script will help you set up and deploy the contracts

echo "🚀 Top-Up Wallet System Quick Deployment"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "contracts/foundry.toml" ]; then
    echo "❌ Error: Please run this script from the TollChain root directory"
    exit 1
fi

echo ""
echo "📋 Step 1: Set up environment variables"
echo "You need to provide:"
echo "1. Your private key (0x...)"
echo "2. RPC URL for Sepolia testnet"
echo ""

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

# Set environment variables
export PRIVATE_KEY=$PRIVATE_KEY
export RPC_URL=$RPC_URL

echo ""
echo "✅ Environment variables set"
echo "🔑 Private key: ${PRIVATE_KEY:0:10}..."
echo "🌐 RPC URL: $RPC_URL"

echo ""
echo "📋 Step 2: Compiling contracts..."
cd contracts

forge build
if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

echo "✅ Contracts compiled successfully"

echo ""
echo "📋 Step 3: Running tests..."
forge test --match-contract TopUpWalletSystemTest -vv

if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

echo "✅ Tests passed"

echo ""
echo "📋 Step 4: Deploying contracts..."

# Deploy without verification first (to avoid the fork-url issue)
forge script script/DeployTopUpWalletSystem.s.sol --rpc-url $RPC_URL --broadcast

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo "✅ Deployment successful!"

echo ""
echo "📋 Step 5: Contract verification (optional)"
echo -n "🔍 Do you want to verify contracts on Etherscan? (y/n): "
read VERIFY_CHOICE

if [ "$VERIFY_CHOICE" = "y" ] || [ "$VERIFY_CHOICE" = "Y" ]; then
    echo -n "🔍 Enter your Etherscan API key: "
    read ETHERSCAN_API_KEY
    
    if [ -n "$ETHERSCAN_API_KEY" ]; then
        export ETHERSCAN_API_KEY=$ETHERSCAN_API_KEY
        echo "🔍 Verifying contracts..."
        forge verify-contract --chain-id 11155111 --num-of-optimizations 200 --watch --etherscan-api-key $ETHERSCAN_API_KEY $(grep "TopUpWalletFactory deployed at:" -A 1 | tail -1 | cut -d: -f2 | tr -d ' ') src/TopUpWalletFactory.sol:TopUpWalletFactory
        forge verify-contract --chain-id 11155111 --num-of-optimizations 200 --watch --etherscan-api-key $ETHERSCAN_API_KEY $(grep "TollCollection deployed at:" -A 1 | tail -1 | cut -d: -f2 | tr -d ' ') src/TollCollection.sol:TollCollection
    fi
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the contract addresses from the output above"
echo "2. Update your .env files with the new addresses"
echo "3. Copy contract ABIs to your frontend and backend"
echo "4. Restart your applications"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT_GUIDE.md"
