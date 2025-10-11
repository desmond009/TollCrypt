import React from 'react';
import { useAccount, useBalance } from 'wagmi';

export const Header: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address: address,
  });

  return (
    <header className="bg-black border-b border-gray-800 px-4 py-4">
      <div className="flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center">
          <div className="w-8 h-8 bg-yellow-400 rounded-lg mr-3 flex items-center justify-center">
            <span className="text-black font-bold text-sm">TC</span>
          </div>
          <h1 className="text-xl font-bold text-white">
            Toll Chain
          </h1>
        </div>
        
        {/* Wallet Info */}
        <div className="flex items-center space-x-3">
          {isConnected ? (
            <>
              <div className="text-right">
                <div className="text-sm text-white">
                  {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0 ETH'}
                </div>
                <div className="text-xs text-gray-400">Base Sepolia</div>
              </div>
              
              <div className="flex items-center bg-gray-800 rounded-full px-3 py-2">
                <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-orange-400 rounded-full mr-2"></div>
                <span className="text-white text-sm font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <svg className="w-4 h-4 text-gray-400 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </div>
              
              <button className="bg-gray-800 rounded-lg px-3 py-2 flex items-center">
                <svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                </svg>
                <span className="text-white text-sm">Menu</span>
              </button>
            </>
          ) : (
            <div className="text-sm text-gray-400">
              Connect Wallet
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
