import React, { useState, useRef, useEffect } from 'react';
import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { WalletIcon } from '@heroicons/react/24/outline';

export const WalletConnector: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address: address,
  });
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!isConnected) {
    return (
      <button
        onClick={() => open()}
        className="btn-primary"
      >
        <WalletIcon className="w-5 h-5 mr-2" />
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center bg-gray-800 rounded-lg px-3 py-2 hover:bg-gray-700 transition-colors"
      >
        <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-orange-400 rounded-full mr-2"></div>
        <div className="text-right">
          <div className="text-sm font-medium text-white">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
          <div className="text-xs text-gray-400">
            {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0 ETH'}
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-400 ml-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-900 rounded-lg shadow-lg border border-gray-800 z-50">
          <div className="py-2">
            <div className="px-4 py-3 border-b border-gray-800">
              <div className="text-sm font-medium text-white">Wallet Connected</div>
              <div className="text-xs text-gray-400 font-mono mt-1">{address}</div>
              <div className="text-xs text-gray-400 mt-1">
                Balance: {balance ? `${parseFloat(balance.formatted).toFixed(6)} ${balance.symbol}` : '0 ETH'}
              </div>
            </div>
            <button
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
            >
              <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
              </svg>
              Disconnect Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
