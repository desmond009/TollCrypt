import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { useSession } from '../services/sessionManager';

type AppStep = 'wallet' | 'auth' | 'register' | 'topup' | 'payment' | 'dashboard' | 'profile' | 'toll-deduction';

interface HeaderProps {
  onNavigate?: (step: AppStep) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address: address,
  });
  const { disconnect } = useDisconnect();
  const { getSessionStatus } = useSession();
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const walletDropdownRef = useRef<HTMLDivElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);
  
  const sessionStatus = getSessionStatus();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (walletDropdownRef.current && !walletDropdownRef.current.contains(event.target as Node)) {
        setShowWalletDropdown(false);
      }
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(event.target as Node)) {
        setShowMenuDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
                <div className="text-xs text-gray-400">Sepolia</div>
                {/* Session Status Indicators */}
                <div className="flex items-center space-x-2 mt-1">
                  {sessionStatus.isAuthenticated ? (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
                      <span className="text-xs text-blue-400">Auth</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></div>
                      <span className="text-xs text-yellow-400">Need Auth</span>
                    </div>
                  )}
                  {sessionStatus.hasVehicles && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                      <span className="text-xs text-green-400">Vehicles</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="relative" ref={walletDropdownRef}>
                <button 
                  onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                  className="flex items-center bg-gray-800 rounded-full px-3 py-2 hover:bg-gray-700 transition-colors"
                >
                  <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-orange-400 rounded-full mr-2"></div>
                  <span className="text-white text-sm font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                  <svg className="w-4 h-4 text-gray-400 ml-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
                
                {showWalletDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
                    <div className="py-2">
                      <div className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
                        <div className="font-medium">Wallet Address</div>
                        <div className="font-mono text-xs">{address}</div>
                      </div>
                      <button
                        onClick={() => {
                          disconnect();
                          setShowWalletDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
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
              
              <div className="relative" ref={menuDropdownRef}>
                <button 
                  onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                  className="bg-gray-800 rounded-lg px-3 py-2 flex items-center hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-white text-sm">Menu</span>
                </button>
                
                {showMenuDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
                    <div className="py-2">
                      <button 
                        onClick={() => {
                          onNavigate?.('profile');
                          setShowMenuDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                      >
                        <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                        </svg>
                        Profile
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors">
                        <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                        </svg>
                        Settings
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors">
                        <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                        </svg>
                        Help & Support
                      </button>
                      <div className="border-t border-gray-700 my-1"></div>
                      <button 
                        onClick={() => {
                          disconnect();
                          setShowMenuDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
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
