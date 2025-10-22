import React, { useState, useRef, useEffect } from 'react';
import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { WalletIcon } from '@heroicons/react/24/outline';
import { walletErrorHandler } from '../utils/walletErrorHandler';
import { browserExtensionHelper } from '../utils/browserExtensionHelper';

export const WalletConnector: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address: address,
  });
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();
  const [showDropdown, setShowDropdown] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Monitor wallet connection errors
  useEffect(() => {
    const checkForErrors = () => {
      const errorStats = walletErrorHandler.getErrorStats();
      if (errorStats.unresolvedErrors > 0) {
        const lastError = walletErrorHandler.getLastError();
        if (lastError && !lastError.resolved) {
          setConnectionError(lastError.message);
        }
      } else {
        setConnectionError(null);
      }
    };

    // Check for errors every 5 seconds
    const interval = setInterval(checkForErrors, 5000);
    checkForErrors(); // Initial check

    return () => clearInterval(interval);
  }, []);

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

  const handleConnect = async () => {
    try {
      setConnectionError(null);
      
      // Check for extension conflicts before connecting
      const conflictReport = browserExtensionHelper.detectAndReportConflicts();
      if (conflictReport.detectedConflicts.length > 0) {
        console.warn('⚠️ Extension conflicts detected before wallet connection');
        browserExtensionHelper.logError({
          message: 'Extension conflicts detected during wallet connection',
          timestamp: new Date().toISOString()
        });
      }
      
      await open();
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      
      // Log the error for analysis
      browserExtensionHelper.logError(error);
      
      setConnectionError(error.message || 'Failed to connect wallet');
    }
  };

  const handleDisconnect = () => {
    try {
      disconnect();
      setShowDropdown(false);
      setConnectionError(null);
    } catch (error: any) {
      console.error('Wallet disconnection error:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-end">
        <button
          onClick={handleConnect}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <WalletIcon className="w-5 h-5 mr-2" />
          Connect Wallet
        </button>
        {connectionError && (
          <div className="mt-2 text-xs text-red-400 max-w-xs text-right">
            {connectionError}
            <button
              onClick={() => browserExtensionHelper.showConflictResolutionModal()}
              className="block mt-1 text-yellow-400 hover:text-yellow-300 underline"
            >
              Need help with extension conflicts?
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 hover:bg-gray-700 transition-colors shadow-sm"
      >
        <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-orange-400 rounded-full mr-2"></div>
        <div className="text-right">
          <div className="text-sm font-medium text-white">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
          <div className="text-xs text-gray-300">
            {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0 ETH'}
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-300 ml-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-600 z-50">
          <div className="py-2">
            <div className="px-4 py-3 border-b border-gray-600">
              <div className="text-sm font-medium text-white">Wallet Connected</div>
              <div className="text-xs text-gray-300 font-mono mt-1">{address}</div>
              <div className="text-xs text-gray-300 mt-1">
                Balance: {balance ? `${parseFloat(balance.formatted).toFixed(6)} ${balance.symbol}` : '0 ETH'}
              </div>
            </div>
            <button
              onClick={handleDisconnect}
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
