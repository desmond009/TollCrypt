import React from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { WalletConnect } from './WalletConnect';

export const Header: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold text-primary-600">
              TollChain
            </h1>
            <span className="ml-2 text-sm text-gray-500">
              Blockchain Toll Collection
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Connected:</span>
                  <span className="ml-1 font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <WalletConnect />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
