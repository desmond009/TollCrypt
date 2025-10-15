import { createWeb3Modal } from '@web3modal/wagmi/react'
import { config } from './wagmi'

// Create the modal
createWeb3Modal({
  wagmiConfig: config,
  projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || '811086b95de154e2b8f4b4b4b4b4b4b4b4b4b4b4b',
  enableAnalytics: true,
  enableOnramp: true,
  themeMode: 'light',
  themeVariables: {
    '--w3m-color-mix': '#6366f1',
    '--w3m-color-mix-strength': 40
  }
})
