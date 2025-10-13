#!/bin/bash

# Top-Up Wallet System Deployment Script
# This script helps you deploy the new smart contracts

echo "🚀 Top-Up Wallet System Deployment Script"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "contracts/foundry.toml" ]; then
    echo "❌ Error: Please run this script from the TollChain root directory"
    exit 1
fi

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo "❌ Error: Foundry is not installed. Please install it first:"
    echo "   curl -L https://foundry.paradigm.xyz | bash"
    echo "   foundryup"
    exit 1
fi

# Check environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable is not set"
    echo "   export PRIVATE_KEY=\"your_private_key_here\""
    exit 1
fi

if [ -z "$RPC_URL" ]; then
    echo "❌ Error: RPC_URL environment variable is not set"
    echo "   export RPC_URL=\"https://sepolia.infura.io/v3/your_project_id\""
    exit 1
fi

echo "✅ Environment variables set"
echo "📁 Working directory: $(pwd)"
echo "🔑 Using RPC: $RPC_URL"

# Navigate to contracts directory
cd contracts

echo ""
echo "🔨 Compiling contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

echo "✅ Contracts compiled successfully"

echo ""
echo "🧪 Running tests..."
forge test --match-contract TopUpWalletSystemTest -vv

if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

echo "✅ Tests passed"

echo ""
echo "🚀 Deploying contracts to Sepolia..."

# Check if we want to deploy to existing TollCollection or create new one
if [ -n "$EXISTING_TOLL_COLLECTION_ADDRESS" ]; then
    echo "📋 Deploying TopUpWalletFactory only (using existing TollCollection)"
    forge script script/DeployTopUpWalletFactoryOnly.s.sol --rpc-url $RPC_URL --broadcast
else
    echo "📋 Deploying complete system (new TollCollection + TopUpWalletFactory)"
    forge script script/DeployTopUpWalletSystem.s.sol --rpc-url $RPC_URL --broadcast
fi

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo "✅ Deployment successful!"

echo ""
echo "📋 Next steps:"
echo "1. Copy the contract addresses from the deployment output"
echo "2. Update your .env files with the new addresses:"
echo "   - Backend: TOPUP_WALLET_FACTORY_ADDRESS, TOLL_COLLECTION_CONTRACT_ADDRESS"
echo "   - Frontend: REACT_APP_TOPUP_WALLET_FACTORY_ADDRESS, REACT_APP_TOLL_COLLECTION_CONTRACT_ADDRESS"
echo "3. Copy the contract ABIs to your frontend and backend"
echo "4. Restart your applications"

echo ""
echo "🎉 Deployment complete! Your top-up wallet system is ready to use."
