# Top-Up Wallet System

This document describes the implementation of the smart contract-based top-up wallet system for the TollChain project.

## Overview

The top-up wallet system allows each user to have their own dedicated smart contract wallet that stores Sepolia ETH for toll payments. Each wallet has its own private/public key pair and requires user signature for authorization of transactions.

## Architecture

### Smart Contracts

1. **TopUpWallet.sol** - Individual smart contract wallet for each user
2. **TopUpWalletFactory.sol** - Factory contract to deploy new wallets
3. **TollCollection.sol** - Updated main contract to integrate with top-up wallets

### Backend Services

1. **TopUpWalletService** - Service to manage wallet creation and operations
2. **TopUpWalletRoutes** - API endpoints for wallet operations

### Frontend Components

1. **WalletTopUp** - Updated component to work with smart contract wallets
2. **TopUpWalletService** - Frontend service for API communication

## Key Features

### Smart Contract Wallets
- Each user gets their own smart contract wallet
- Each wallet has its own private/public key pair
- Wallets store Sepolia ETH for toll payments
- Signature-based authorization for all transactions

### Security Features
- User signature required for top-up transactions
- User signature required for withdrawal transactions
- Emergency withdrawal capability for wallet owners
- Pausable functionality for emergency situations

### Factory Pattern
- TopUpWalletFactory deploys new wallets for each user
- Batch deployment support for multiple users
- Automatic authorization of new wallets in TollCollection

## Smart Contract Functions

### TopUpWallet Contract

```solidity
// Initialize wallet with toll contract
function initialize(address _tollCollectionContract) external

// Top up wallet with ETH (requires signature)
function topUp(bytes memory signature) external payable

// Process toll payment to authorized toll contract
function processTollPayment(uint256 amount, string memory vehicleId, bytes32 zkProofHash) external

// Withdraw funds to owner's main wallet (requires signature)
function withdraw(uint256 amount, bytes memory signature) external

// Emergency withdrawal by owner
function emergencyWithdraw(uint256 amount) external

// Get wallet balance
function getBalance() external view returns (uint256)

// Get wallet statistics
function getWalletStats() external view returns (uint256, uint256, uint256, uint256)
```

### TopUpWalletFactory Contract

```solidity
// Deploy new wallet for user
function deployTopUpWallet(address user) external returns (address)

// Deploy multiple wallets in batch
function deployTopUpWalletsBatch(address[] calldata users) external returns (address[])

// Get user's wallet address
function getUserTopUpWallet(address user) external view returns (address)

// Check if user has wallet
function hasTopUpWallet(address user) external view returns (bool)
```

### TollCollection Contract (Updated)

```solidity
// Process toll payment from top-up wallet
function processTollPaymentFromTopUpWallet(string memory vehicleId, bytes32 zkProofHash, uint256 amount) external

// Get user's top-up wallet address
function getUserTopUpWallet(address user) external view returns (address)

// Check if user has top-up wallet
function hasUserTopUpWallet(address user) external view returns (bool)

// Get top-up wallet balance
function getUserTopUpWalletBalance(address user) external view returns (uint256)
```

## API Endpoints

### Backend Routes (`/api/topup-wallet`)

- `POST /create` - Create new top-up wallet
- `GET /info` - Get wallet information
- `GET /balance` - Get wallet balance
- `GET /exists` - Check if wallet exists
- `POST /topup` - Process top-up transaction
- `POST /payment` - Process toll payment
- `POST /withdraw` - Withdraw funds
- `GET /stats` - Get wallet statistics
- `POST /signature/topup` - Create top-up signature
- `POST /signature/withdraw` - Create withdrawal signature

## Frontend Integration

### WalletTopUp Component Updates

The WalletTopUp component now includes:

1. **Smart Contract Wallet Creation** - Button to create new wallet
2. **Wallet Information Display** - Shows wallet address and status
3. **Signature-Based Transactions** - All transactions require user signatures
4. **Real-time Balance Updates** - Shows smart contract wallet balance

### Key Features in UI

- Create wallet button for new users
- Display of smart contract wallet address
- Signature generation for transactions
- Error handling for wallet operations
- Real-time balance updates

## Deployment

### Prerequisites

1. Set up environment variables:
   ```bash
   PRIVATE_KEY=your_private_key
   PAYMENT_TOKEN_ADDRESS=token_address
   INITIAL_TOLL_RATE=1000000000000000  # 0.001 ETH in wei
   ```

2. Deploy contracts:
   ```bash
   forge script script/DeployTopUpWalletSystem.s.sol --rpc-url $RPC_URL --broadcast
   ```

### Environment Variables

Add these to your `.env` files:

```bash
# Backend
TOPUP_WALLET_FACTORY_ADDRESS=0x...
TOLL_COLLECTION_CONTRACT_ADDRESS=0x...
FACTORY_PRIVATE_KEY=0x...
TOLL_COLLECTION_PRIVATE_KEY=0x...

# Frontend
REACT_APP_TOPUP_WALLET_FACTORY_ADDRESS=0x...
REACT_APP_TOLL_COLLECTION_CONTRACT_ADDRESS=0x...
```

## Testing

Run the test suite:

```bash
forge test --match-contract TopUpWalletSystemTest -vv
```

## Security Considerations

1. **Private Key Management** - Private keys are stored in localStorage (for demo). In production, use secure key management systems.

2. **Signature Verification** - All transactions require valid signatures from the wallet owner.

3. **Access Control** - Only authorized contracts can interact with wallets.

4. **Emergency Functions** - Wallet owners can pause/unpause and perform emergency withdrawals.

## Usage Flow

1. **User Registration** - User connects their main wallet
2. **Wallet Creation** - System creates smart contract wallet for user
3. **Top-up Process** - User signs transaction to top up smart contract wallet
4. **Toll Payment** - Smart contract wallet automatically pays tolls
5. **Withdrawal** - User can withdraw funds back to main wallet with signature

## Future Enhancements

1. **Multi-signature Support** - Add multi-sig functionality for enhanced security
2. **Gas Optimization** - Optimize gas usage for batch operations
3. **Advanced Analytics** - Add detailed transaction analytics
4. **Integration with Other Chains** - Support for multiple blockchain networks
5. **Automated Top-up** - Automatic top-up when balance is low
