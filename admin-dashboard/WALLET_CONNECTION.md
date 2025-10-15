# Wallet Connection Implementation

This document describes the wallet connection implementation for the TollChain Admin Dashboard.

## Features

### 1. Multi-Wallet Support
- **Web3Modal Integration**: Supports multiple wallet providers including MetaMask, WalletConnect, Coinbase Wallet, and other injected wallets
- **Universal Wallet Access**: Users can connect any wallet that supports EIP-6963 standard

### 2. Dual Authentication System
- **Wallet Connection**: Required for blockchain interactions
- **Email/Password Login**: Required for admin access control
- **Combined Security**: Both wallet and email authentication must be completed

### 3. UI Components

#### WalletConnector Component
- **Location**: Top-right corner of the application
- **States**: 
  - Disconnected: Shows "Connect Wallet" button
  - Connected: Shows wallet address, balance, and disconnect option
- **Features**: Dropdown with wallet details and disconnect functionality

#### Login Component
- **Layout**: Centered login form with wallet connector in header
- **Requirements**: Both wallet connection and email/password authentication
- **Status Indicators**: Visual feedback for wallet connection status

## Configuration

### Environment Variables
```bash
REACT_APP_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### Supported Networks
- Sepolia (Testnet)
- Mainnet
- Polygon
- Polygon Mumbai

## Usage

1. **Connect Wallet**: Click "Connect Wallet" in the top-right corner
2. **Select Wallet Provider**: Choose from available wallet options
3. **Authorize Connection**: Approve the connection in your wallet
4. **Login with Email**: Enter admin credentials
5. **Access Dashboard**: Both authentications required for access

## Technical Implementation

### Dependencies
- `@web3modal/wagmi`: Web3Modal integration
- `wagmi`: React hooks for Ethereum
- `viem`: TypeScript interface for Ethereum
- `@tanstack/react-query`: Data fetching and caching

### Key Files
- `src/config/wagmi.ts`: Wagmi configuration
- `src/config/appkit.ts`: Web3Modal setup
- `src/components/WalletConnector.tsx`: Wallet connection component
- `src/components/Login.tsx`: Updated login with wallet requirement
- `src/components/Header.tsx`: Header with wallet connector

## Security Features

- **Wallet Verification**: Ensures wallet is connected before login
- **Address Validation**: Validates wallet address format
- **Session Management**: Maintains both wallet and admin sessions
- **Network Validation**: Ensures correct network connection

## Error Handling

- **Connection Errors**: Clear error messages for wallet connection issues
- **Network Errors**: Validation for correct network selection
- **Authentication Errors**: Separate error handling for wallet vs email auth
- **Fallback UI**: Graceful degradation when wallet is not available

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Support**: iOS Safari, Chrome Mobile
- **Wallet Extensions**: MetaMask, Coinbase Wallet, etc.
- **Hardware Wallets**: Ledger, Trezor (via wallet extensions)
