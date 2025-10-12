import React from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';

export const WalletConnect: React.FC = () => {
  const { open } = useWeb3Modal();

  return (
    <div className="space-y-4">
      <button
        onClick={() => open()}
        className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
        </svg>
        Connect Wallet
      </button>
      
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          Connect with MetaMask, WalletConnect, Coinbase Wallet, or other supported wallets
        </p>
      </div>
    </div>
  );
};