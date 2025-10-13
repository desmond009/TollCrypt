# Smart Contract Deployment Guide

This guide will help you deploy the new top-up wallet system contracts to the Sepolia testnet.

## Prerequisites

1. **Install Foundry** (if not already installed):
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Get Sepolia ETH** for deployment:
   - Use [Sepolia Faucet](https://sepoliafaucet.com/)
   - Or [Alchemy Faucet](https://sepoliafaucet.com/)

3. **Set up environment variables**:
   ```bash
   export PRIVATE_KEY="your_private_key_here"
   export RPC_URL="https://sepolia.infura.io/v3/your_project_id"
   ```

## Deployment Options

### Option 1: Deploy Complete New System (Recommended)

This deploys all contracts fresh with the new top-up wallet system.

```bash
# Navigate to contracts directory
cd contracts

# Deploy the complete system
forge script script/DeployTopUpWalletSystem.s.sol --rpc-url $RPC_URL --broadcast --verify
```

### Option 2: Deploy Only New Contracts (If TollCollection Already Exists)

If you already have a deployed TollCollection contract, you can deploy just the new contracts and integrate them.

```bash
# Deploy only TopUpWalletFactory
forge script script/DeployTopUpWalletFactoryOnly.s.sol --rpc-url $RPC_URL --broadcast --verify
```

## Step-by-Step Deployment Process

### 1. Prepare Environment

Create a `.env` file in the contracts directory:

```bash
# .env file
PRIVATE_KEY=0x1234567890abcdef...
RPC_URL=https://sepolia.infura.io/v3/your_project_id
PAYMENT_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000  # Use address(0) for ETH
INITIAL_TOLL_RATE=1000000000000000  # 0.001 ETH in wei
ETHERSCAN_API_KEY=your_etherscan_api_key  # For contract verification
```

### 2. Compile Contracts

```bash
cd contracts
forge build
```

### 3. Run Tests (Optional but Recommended)

```bash
forge test --match-contract TopUpWalletSystemTest -vv
```

### 4. Deploy Contracts

```bash
# Deploy to Sepolia testnet
forge script script/DeployTopUpWalletSystem.s.sol --rpc-url $RPC_URL --broadcast --verify

# Or deploy to local testnet for testing
forge script script/DeployTopUpWalletSystem.s.sol --rpc-url http://localhost:8545 --broadcast
```

### 5. Verify Deployment

After deployment, you'll see output like this:

```
=== Deployment Summary ===
TopUpWalletFactory: 0x1234567890abcdef...
TollCollection: 0xabcdef1234567890...
Payment Token: 0x0000000000000000000000000000000000000000
Initial Toll Rate: 1000000000000000
Addresses written to deployed-addresses.env
```

## Integration with Existing System

### 1. Update Backend Environment Variables

Add these to your backend `.env` file:

```bash
# Top-up Wallet System
TOPUP_WALLET_FACTORY_ADDRESS=0x1234567890abcdef...
TOLL_COLLECTION_CONTRACT_ADDRESS=0xabcdef1234567890...
FACTORY_PRIVATE_KEY=0x1234567890abcdef...  # Same as deployment key
TOLL_COLLECTION_PRIVATE_KEY=0x1234567890abcdef...  # Same as deployment key
RPC_URL=https://sepolia.infura.io/v3/your_project_id
```

### 2. Update Frontend Environment Variables

Add these to your frontend `.env` file:

```bash
# Top-up Wallet System
REACT_APP_TOPUP_WALLET_FACTORY_ADDRESS=0x1234567890abcdef...
REACT_APP_TOLL_COLLECTION_CONTRACT_ADDRESS=0xabcdef1234567890...
REACT_APP_RPC_URL=https://sepolia.infura.io/v3/your_project_id
```

### 3. Update Contract ABIs

Copy the generated ABIs to your frontend and backend:

```bash
# Copy ABIs to frontend
cp contracts/out/TopUpWallet.sol/TopUpWallet.json frontend/src/contracts/
cp contracts/out/TopUpWalletFactory.sol/TopUpWalletFactory.json frontend/src/contracts/
cp contracts/out/TollCollection.sol/TollCollection.json frontend/src/contracts/

# Copy ABIs to backend
cp contracts/out/TopUpWallet.sol/TopUpWallet.json backend/src/contracts/
cp contracts/out/TopUpWalletFactory.sol/TopUpWalletFactory.json backend/src/contracts/
cp contracts/out/TollCollection.sol/TollCollection.json backend/src/contracts/
```

## Testing the Deployment

### 1. Test Contract Deployment

```bash
# Run the test suite
forge test --match-contract TopUpWalletSystemTest -vv

# Test specific functions
forge test --match-test testDeployTopUpWallet -vv
```

### 2. Test Frontend Integration

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm start
   ```

3. Connect your wallet and test the top-up wallet creation

### 3. Test API Endpoints

```bash
# Test wallet creation
curl -X POST http://localhost:3001/api/topup-wallet/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token"

# Test wallet info
curl -X GET http://localhost:3001/api/topup-wallet/info \
  -H "Authorization: Bearer your_jwt_token"
```

## Troubleshooting

### Common Issues

1. **Insufficient Gas**: Increase gas limit
   ```bash
   forge script script/DeployTopUpWalletSystem.s.sol --rpc-url $RPC_URL --broadcast --gas-limit 10000000
   ```

2. **Contract Verification Failed**: Check Etherscan API key
   ```bash
   forge verify-contract --chain-id 11155111 --num-of-optimizations 200 --watch --etherscan-api-key $ETHERSCAN_API_KEY 0x1234567890abcdef... src/TopUpWallet.sol:TopUpWallet
   ```

3. **RPC Connection Issues**: Try different RPC providers
   - Infura: `https://sepolia.infura.io/v3/your_project_id`
   - Alchemy: `https://eth-sepolia.g.alchemy.com/v2/your_api_key`
   - Ankr: `https://rpc.ankr.com/eth_sepolia`

### Verification Commands

```bash
# Verify TopUpWalletFactory
forge verify-contract --chain-id 11155111 --num-of-optimizations 200 --watch --etherscan-api-key $ETHERSCAN_API_KEY 0x1234567890abcdef... src/TopUpWalletFactory.sol:TopUpWalletFactory

# Verify TollCollection
forge verify-contract --chain-id 11155111 --num-of-optimizations 200 --watch --etherscan-api-key $ETHERSCAN_API_KEY 0xabcdef1234567890... src/TollCollection.sol:TollCollection
```

## Production Deployment

For production deployment on mainnet:

1. **Use a secure private key** (not your personal wallet)
2. **Set appropriate gas prices**:
   ```bash
   forge script script/DeployTopUpWalletSystem.s.sol --rpc-url $RPC_URL --broadcast --gas-price 20000000000
   ```
3. **Use a real payment token** (USDC, DAI, etc.)
4. **Set appropriate toll rates** for your use case
5. **Test thoroughly** on testnets first

## Monitoring

After deployment, monitor your contracts:

1. **Check contract interactions** on Etherscan
2. **Monitor gas usage** and optimize if needed
3. **Set up alerts** for important contract events
4. **Regular security audits** of the contracts

## Next Steps

After successful deployment:

1. **Update your application** with the new contract addresses
2. **Test all functionality** thoroughly
3. **Deploy to production** when ready
4. **Monitor and maintain** the contracts

For any issues or questions, refer to the contract documentation or test files for examples.
