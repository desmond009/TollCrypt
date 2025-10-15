import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { mainnet, polygon, polygonMumbai, sepolia } from 'wagmi/chains'

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

const metadata = {
  name: 'TollChain Admin',
  description: 'Blockchain-based toll collection system - Admin Portal',
  url: 'https://tollchain.com',
  icons: ['https://tollchain.com/icon.png']
}

const chains = [sepolia, mainnet, polygon, polygonMumbai] as const

export const config = defaultWagmiConfig({
  chains,
  projectId: projectId || '811086b95de154e2b8f4b4b4b4b4b4b4b4b4b4b4b',
  metadata,
  enableWalletConnect: !!projectId,
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: true
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
