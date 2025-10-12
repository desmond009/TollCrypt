import { createWeb3Modal } from '@web3modal/wagmi/react'
import { config } from './wagmi'

// Get project ID from environment variables
const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID;

// Check if project ID is properly configured
if (!projectId || projectId === 'your_walletconnect_project_id' || projectId === 'your-project-id') {
  console.warn(
    '⚠️ WalletConnect Project ID not configured properly. ' +
    'Please set REACT_APP_WALLETCONNECT_PROJECT_ID in your .env file. ' +
    'Get your project ID from https://cloud.walletconnect.com/'
  );
}

// Create Web3Modal instance
export const web3Modal = createWeb3Modal({
  wagmiConfig: config,
  projectId: projectId || '811086b95de154e2b8f4b4b4b4b4b4b4b4b4b4b4b',
  enableAnalytics: !!projectId,
  enableOnramp: !!projectId,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-color-mix': '#00BB7F',
    '--w3m-color-mix-strength': 20
  },
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89ebcbe5ad43ab79d9b6a0d9dc', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    'c286eebc742a537cd1d6818363e9dc53b21759a1e8e5d9b263d0c03ec7703576', // Rainbow
    'fd20dc426fb37566d74ccef2c6b423d8c765dc87b7535a7c8b8b8b8b8b8b8b8b'  // Coinbase Wallet
  ]
});

// Ensure Web3Modal is initialized
if (typeof window !== 'undefined') {
  web3Modal;
}
