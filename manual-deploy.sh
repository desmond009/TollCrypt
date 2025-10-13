#!/bin/bash

# Manual Smart Contract Deployment Script
# This script deploys contracts one by one to avoid rate limiting

echo "🚀 Manual Smart Contract Deployment Script"
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

# Navigate to contracts directory
cd contracts

# Load environment variables
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found in contracts directory"
    echo "   Please create .env file with PRIVATE_KEY and RPC_URL"
    exit 1
fi

source .env

# Check environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable is not set"
    exit 1
fi

if [ -z "$RPC_URL" ]; then
    echo "❌ Error: RPC_URL environment variable is not set"
    exit 1
fi

echo "✅ Environment variables loaded"
echo "📁 Working directory: $(pwd)"
echo "🔑 Using RPC: $RPC_URL"

# Compile contracts
echo ""
echo "🔨 Compiling contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

echo "✅ Contracts compiled successfully"

# Deploy contracts one by one with delays
echo ""
echo "🚀 Starting manual deployment..."

# Step 1: Deploy MockUSDC
echo ""
echo "📋 Step 1: Deploying MockUSDC..."
forge create src/MockUSDC.sol:MockUSDC \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --constructor-args "USD Coin" "USDC" \
    --delay 5

if [ $? -ne 0 ]; then
    echo "❌ MockUSDC deployment failed"
    exit 1
fi

echo "✅ MockUSDC deployed successfully"
echo "⏳ Waiting 30 seconds before next deployment..."
sleep 30

# Step 2: Deploy AnonAadhaarVerifier
echo ""
echo "📋 Step 2: Deploying AnonAadhaarVerifier..."
forge create src/AnonAadhaarVerifier.sol:AnonAadhaarVerifier \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --constructor-args "0x7361360D60BE09274EccfebAb510753cA894a7d7" \
    --delay 5

if [ $? -ne 0 ]; then
    echo "❌ AnonAadhaarVerifier deployment failed"
    exit 1
fi

echo "✅ AnonAadhaarVerifier deployed successfully"
echo "⏳ Waiting 30 seconds before next deployment..."
sleep 30

# Step 3: Deploy TopUpWalletFactory
echo ""
echo "📋 Step 3: Deploying TopUpWalletFactory..."
forge create src/TopUpWalletFactory.sol:TopUpWalletFactory \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --constructor-args "0x0000000000000000000000000000000000000000" \
    --delay 5

if [ $? -ne 0 ]; then
    echo "❌ TopUpWalletFactory deployment failed"
    exit 1
fi

echo "✅ TopUpWalletFactory deployed successfully"
echo "⏳ Waiting 30 seconds before next deployment..."
sleep 30

# Step 4: Deploy TollCollection
echo ""
echo "📋 Step 4: Deploying TollCollection..."
forge create src/TollCollection.sol:TollCollection \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --constructor-args "0xe199d737d625db8b38a622f3c7083effe682c340" "1000000000000000" "0x0000000000000000000000000000000000000000" \
    --delay 5

if [ $? -ne 0 ]; then
    echo "❌ TollCollection deployment failed"
    exit 1
fi

echo "✅ TollCollection deployed successfully"

echo ""
echo "🎉 All contracts deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the contract addresses from the deployment output above"
echo "2. Update your .env files with the new addresses"
echo "3. Test the contracts using the verification script"
echo ""
echo "🔧 To verify deployment, run:"
echo "   forge script script/VerifyDeployment.s.sol --rpc-url \$RPC_URL"
echo ""
echo "📝 Contract addresses will be displayed above. Save them for your application."
