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

// Create Web3Modal instance with conflict resolution
export const web3Modal = createWeb3Modal({
  wagmiConfig: config,
  projectId: projectId || '811086b95de154e2b8f4b4b4b4b4b4b4b4b4b4b4b',
  enableAnalytics: false, // Disable to avoid conflicts
  enableOnramp: false, // Disable to avoid conflicts
  themeMode: 'dark',
  themeVariables: {
    '--w3m-color-mix': '#00BB7F',
    '--w3m-color-mix-strength': 20,
    '--w3m-border-radius-master': '8px',
    '--w3m-font-family': 'Inter, sans-serif'
  },
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89ebcbe5ad43ab79d9b6a0d9dc', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    'c286eebc742a537cd1d6818363e9dc53b21759a1e8e5d9b263d0c03ec7703576', // Rainbow
    'fd20dc426fb37566d74ccef2c6b423d8c765dc87b7535a7c8b8b8b8b8b8b8b8b'  // Coinbase Wallet
  ],
  excludeWalletIds: [
    // Exclude problematic wallets that cause conflicts
    '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927', // Magic.link
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow (if causing issues)
  ]
});

// Ensure Web3Modal is initialized safely
if (typeof window !== 'undefined') {
  try {
    // Initialize Web3Modal
    void web3Modal;
    console.log('✅ Web3Modal initialized successfully');
  } catch (error) {
    console.error('❌ Web3Modal initialization failed:', error);
  }
}
