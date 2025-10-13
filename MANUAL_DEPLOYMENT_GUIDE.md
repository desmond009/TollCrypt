# Manual Smart Contract Deployment Guide

## ❌ Current Status: Contracts NOT Deployed

The smart contracts are **NOT fully deployed** to the blockchain. The previous attempts failed due to RPC rate limiting issues.

## 🔧 Manual Deployment Options

### Option 1: Use the Automated Script (Recommended)

```bash
# Run the manual deployment script
cd /Users/vijender/Documents/TollChain
./manual-deploy.sh
```

### Option 2: Manual Step-by-Step Deployment

If the automated script doesn't work, follow these steps manually:

#### Step 1: Navigate to contracts directory
```bash
cd /Users/vijender/Documents/TollChain/contracts
source .env
```

#### Step 2: Deploy MockUSDC
```bash
forge create src/MockUSDC.sol:MockUSDC \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --constructor-args "USD Coin" "USDC"
```

**Wait 30 seconds before next step**

#### Step 3: Deploy AnonAadhaarVerifier
```bash
forge create src/AnonAadhaarVerifier.sol:AnonAadhaarVerifier \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --constructor-args "0x7361360D60BE09274EccfebAb510753cA894a7d7"
```

**Wait 30 seconds before next step**

#### Step 4: Deploy TopUpWalletFactory
```bash
forge create src/TopUpWalletFactory.sol:TopUpWalletFactory \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --constructor-args "0x0000000000000000000000000000000000000000"
```

**Wait 30 seconds before next step**

#### Step 5: Deploy TollCollection
```bash
forge create src/TollCollection.sol:TollCollection \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --constructor-args "0xe199d737d625db8b38a622f3c7083effe682c340" "1000000000000000" "0x0000000000000000000000000000000000000000"
```

### Option 3: Use Different RPC Endpoint

If you're still getting rate limit errors, try using a different RPC endpoint:

```bash
# Use a different RPC URL
export RPC_URL="https://rpc.sepolia.eth.gateway.fm"
# or
export RPC_URL="https://sepolia.drpc.org"
```

Then run the deployment commands again.

## 📋 What You Need

1. **Private Key**: Your deployer wallet private key (without 0x prefix)
2. **RPC URL**: Sepolia testnet RPC endpoint
3. **ETH Balance**: At least 0.01 ETH for gas fees
4. **Patience**: Wait 30 seconds between deployments

## 🔍 Verification

After deployment, verify the contracts are deployed:

```bash
forge script script/VerifyDeployment.s.sol --rpc-url $RPC_URL
```

## 📝 Important Notes

- **Save the contract addresses** from each deployment output
- **Update your .env files** with the new addresses
- **Test the contracts** before using in production
- **Use testnet ETH only** - never use mainnet ETH for testing

## 🆘 Troubleshooting

### Rate Limit Error
- Wait 5-10 minutes between attempts
- Use a different RPC endpoint
- Deploy contracts one by one with delays

### Nonce Error
- Wait for pending transactions to be mined
- Use `--resume` flag if available

### Gas Estimation Error
- Increase gas limit manually
- Check your ETH balance

## 🎯 Expected Output

Each deployment should show:
```
Deployed to: 0x[CONTRACT_ADDRESS]
Transaction hash: 0x[TRANSACTION_HASH]
```

Save these addresses for your application!
