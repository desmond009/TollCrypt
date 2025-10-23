import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useSession, VehicleInfo } from '../services/sessionManager';
import { VehicleRegistration } from './VehicleRegistration';
import { topUpWalletAPI, TopUpWalletInfo } from '../services/topUpWalletService';
import { walletPersistenceService } from '../services/walletPersistenceService';
import socketService from '../services/socketService';

type AppStep = 'wallet' | 'auth' | 'register' | 'topup' | 'payment' | 'dashboard' | 'profile';

interface UserProfileProps {
  onNavigate?: (step: AppStep) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onNavigate }) => {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { 
    getSession, 
    removeVehicle, 
    updateVehicle, 
    clearSession,
    getSessionStatus,
    addVehicle
  } = useSession();
  
  const [session, setSession] = useState(getSession());
  const [sessionStatus, setSessionStatus] = useState(getSessionStatus());
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [newVehicleType, setNewVehicleType] = useState('');
  const [topUpWalletInfo, setTopUpWalletInfo] = useState<TopUpWalletInfo | null>(null);
  const [hasTopUpWallet, setHasTopUpWallet] = useState<boolean>(false);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(true);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState<boolean>(false);
  const [lastBalanceUpdate, setLastBalanceUpdate] = useState<Date | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

  useEffect(() => {
    setSession(getSession());
    setSessionStatus(getSessionStatus());
  }, []);

  // Function to refresh wallet balance from blockchain (using direct RPC like WalletTopUp)
  const refreshWalletBalance = useCallback(async () => {
    if (!address || !hasTopUpWallet || !topUpWalletInfo) return;
    
    try {
      setIsRefreshingBalance(true);
      console.log('🔄 Refreshing top-up wallet balance from blockchain (direct RPC)...');
      
      // Try to get balance directly from blockchain using RPC (same as WalletTopUp)
      if (topUpWalletInfo.walletAddress && topUpWalletInfo.walletAddress !== '0x0000000000000000000000000000000000000000') {
        // Try multiple RPC endpoints for better reliability
        const rpcEndpoints = [
          process.env.REACT_APP_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
          'https://rpc.ankr.com/eth_sepolia'
        ].filter(Boolean); // Remove any undefined values
        
        for (const rpcUrl of rpcEndpoints as string[]) {
          try {
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [topUpWalletInfo.walletAddress, 'latest'],
                id: 1
              }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              
              if (data && data.result && !data.error) {
                const balanceInWei = parseInt(data.result, 16);
                const balanceInEth = balanceInWei / Math.pow(10, 18);
                const balanceString = balanceInEth.toString();
                
                console.log('✅ Balance refreshed from blockchain (direct RPC):', balanceInEth, 'ETH');
                setTopUpWalletInfo(prev => {
                  const updated = prev ? { ...prev, balance: balanceString } : null;
                  console.log('🔄 Updating state with direct RPC balance:', updated);
                  return updated;
                });
                setLastBalanceUpdate(new Date());
                return; // Success, exit early
              }
            }
          } catch (rpcError) {
            console.warn(`RPC endpoint ${rpcUrl} failed:`, rpcError);
            continue; // Try next endpoint
          }
        }
        
        console.warn('All RPC endpoints failed, falling back to API');
      }
      
      // Fallback to API if RPC fails
      console.log('🔄 Falling back to API for balance...');
      const balanceResponse = await topUpWalletAPI.getTopUpWalletBalance();
      console.log('✅ Balance refreshed from API (fallback):', balanceResponse.balance, 'ETH');
      setTopUpWalletInfo(prev => {
        const updated = prev ? { ...prev, balance: balanceResponse.balance } : null;
        console.log('🔄 Updating state with API balance:', updated);
        return updated;
      });
      setLastBalanceUpdate(new Date());
      
    } catch (error) {
      console.error('❌ Failed to refresh top-up wallet balance:', error);
      // Final fallback to API on error
      try {
        const balanceResponse = await topUpWalletAPI.getTopUpWalletBalance();
        setTopUpWalletInfo(prev => prev ? {
          ...prev,
          balance: balanceResponse.balance
        } : null);
        setLastBalanceUpdate(new Date());
        console.log('✅ Balance refreshed from API (final fallback):', balanceResponse.balance, 'ETH');
      } catch (apiError) {
        console.error('❌ API fallback also failed:', apiError);
      }
    } finally {
      setIsRefreshingBalance(false);
    }
  }, [address, hasTopUpWallet, topUpWalletInfo]);

  // Load top-up wallet information
  useEffect(() => {
    const loadTopUpWallet = async () => {
      if (!address || !sessionStatus.isAuthenticated) {
        setIsLoadingWallet(false);
        return;
      }

      try {
        setIsLoadingWallet(true);
        
        // Try to get wallet info using persistence service
        try {
          const walletInfo = await walletPersistenceService.getWalletWithFallback(address, false);
          if (walletInfo) {
            // Load wallet info first
            const initialWalletInfo = {
              walletAddress: walletInfo.walletAddress,
              privateKey: walletInfo.privateKey,
              publicKey: walletInfo.publicKey,
              balance: walletInfo.balance, // This might be stale
              isInitialized: true
            };
            
            setTopUpWalletInfo(initialWalletInfo);
            setHasTopUpWallet(true);
            setLastBalanceUpdate(new Date());
            console.log('Top-up wallet loaded successfully:', walletInfo.walletAddress);
            
            // Immediately refresh balance using direct RPC to get fresh data
            console.log('🔄 Refreshing balance immediately after wallet load...');
            try {
              const rpcEndpoints = [
                process.env.REACT_APP_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
                'https://rpc.ankr.com/eth_sepolia'
              ].filter(Boolean);
              
              for (const rpcUrl of rpcEndpoints as string[]) {
                try {
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 5000);
                  
                  const response = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      jsonrpc: '2.0',
                      method: 'eth_getBalance',
                      params: [walletInfo.walletAddress, 'latest'],
                      id: 1
                    }),
                    signal: controller.signal
                  });
                  
                  clearTimeout(timeoutId);
                  
                  if (response.ok) {
                    const data = await response.json();
                    if (data && data.result && !data.error) {
                      const balanceInWei = parseInt(data.result, 16);
                      const balanceInEth = balanceInWei / Math.pow(10, 18);
                      const balanceString = balanceInEth.toString();
                      
                      console.log('✅ Fresh balance loaded from blockchain:', balanceInEth, 'ETH');
                      setTopUpWalletInfo(prev => prev ? {
                        ...prev,
                        balance: balanceString
                      } : null);
                      setLastBalanceUpdate(new Date());
                      break; // Success, exit loop
                    }
                  }
                } catch (rpcError) {
                  console.warn(`RPC endpoint ${rpcUrl} failed during initial load:`, rpcError);
                  continue;
                }
              }
            } catch (balanceError) {
              console.warn('⚠️ Failed to refresh balance during initial load:', balanceError);
              // Keep the wallet info with potentially stale balance
            }
          } else {
            // If wallet doesn't exist, that's okay - user can create one later
            console.log('No top-up wallet found for user');
            setTopUpWalletInfo(null);
            setHasTopUpWallet(false);
          }
        } catch (error) {
          // If wallet doesn't exist, that's okay - user can create one later
          console.log('No top-up wallet found for user');
          setTopUpWalletInfo(null);
          setHasTopUpWallet(false);
        }
      } catch (error) {
        console.error('Error loading top-up wallet:', error);
        setTopUpWalletInfo(null);
        setHasTopUpWallet(false);
      } finally {
        setIsLoadingWallet(false);
      }
    };

    loadTopUpWallet();
  }, [address, sessionStatus.isAuthenticated]);

  // Set up real-time balance updates
  useEffect(() => {
    if (!address || !hasTopUpWallet) return;

    // Join user room for real-time updates
    socketService.joinUserRoom(address);

    // Listen for wallet balance updates
    const handleWalletBalanceUpdate = (data: any) => {
      console.log('Wallet balance update received:', data);
      if (data.userAddress === address && data.balance !== undefined) {
        setTopUpWalletInfo(prev => prev ? {
          ...prev,
          balance: data.balance
        } : null);
        setLastBalanceUpdate(new Date());
      }
    };

    // Listen for top-up transactions
    const handleTopUpCompleted = (data: any) => {
      console.log('Top-up completed, refreshing balance:', data);
      if (data.userAddress === address) {
        refreshWalletBalance();
      }
    };

    // Listen for toll payments
    const handleTollPaymentCompleted = (data: any) => {
      console.log('Toll payment completed, refreshing balance:', data);
      if (data.userAddress === address) {
        refreshWalletBalance();
      }
    };

    // Set up socket listeners
    socketService.on('wallet:balance:update', handleWalletBalanceUpdate);
    socketService.on('wallet:topup:completed', handleTopUpCompleted);
    socketService.on('toll:payment:completed', handleTollPaymentCompleted);

    // Check connection status
    const checkConnection = () => {
      const status = socketService.getConnectionStatus();
      setIsRealtimeConnected(status.isConnected);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    // Cleanup
    return () => {
      socketService.off('wallet:balance:update', handleWalletBalanceUpdate);
      socketService.off('wallet:topup:completed', handleTopUpCompleted);
      socketService.off('toll:payment:completed', handleTollPaymentCompleted);
      clearInterval(interval);
    };
  }, [address, hasTopUpWallet, refreshWalletBalance]);

  // Periodic balance refresh (every 30 seconds)
  useEffect(() => {
    if (!address || !hasTopUpWallet) return;

    const interval = setInterval(() => {
      refreshWalletBalance();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [address, hasTopUpWallet, refreshWalletBalance]);


  const handleRemoveVehicle = async (vehicleId: string) => {
    if (window.confirm(`Are you sure you want to remove vehicle ${vehicleId}?`)) {
      const success = removeVehicle(vehicleId);
      if (success) {
        setSession(getSession());
        setSessionStatus(getSessionStatus());
      }
    }
  };

  const handleUpdateVehicleType = async (vehicleId: string) => {
    if (!newVehicleType.trim()) return;
    
    const success = updateVehicle(vehicleId, { vehicleType: newVehicleType });
    if (success) {
      setSession(getSession());
      setSessionStatus(getSessionStatus());
      setEditingVehicle(null);
      setNewVehicleType('');
    }
  };

  const handleDisconnect = () => {
    clearSession();
    disconnect();
    // Force a page reload to reset the entire app state
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!session) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-4">User Profile</h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg width="100%" height="100%" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="#fbbf24"/>
              <rect x="6" y="8" width="8" height="12" fill="#f59e0b" rx="1"/>
              <rect x="7" y="9" width="6" height="10" fill="#d97706" rx="0.5"/>
              <rect x="4" y="20" width="24" height="4" fill="#6b7280"/>
              <rect x="4" y="22" width="24" height="1" fill="#9ca3af"/>
              <rect x="18" y="6" width="4" height="4" fill="#3b82f6" rx="0.5"/>
              <rect x="23" y="4" width="4" height="4" fill="#3b82f6" rx="0.5"/>
              <rect x="18" y="11" width="4" height="4" fill="#1d4ed8" rx="0.5"/>
              <rect x="23" y="9" width="4" height="4" fill="#1d4ed8" rx="0.5"/>
              <line x1="22" y1="8" x2="23" y2="8" stroke="#3b82f6" strokeWidth="0.5"/>
              <line x1="22" y1="13" x2="23" y2="13" stroke="#1d4ed8" strokeWidth="0.5"/>
            </svg>
          </div>
          <p className="text-gray-400 mb-4">No active session found</p>
          <p className="text-sm text-gray-500 mb-6">Please authenticate with Aadhaar to access your profile and manage your vehicles.</p>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                // Navigate to auth step
                onNavigate?.('auth');
              }}
              className="btn-primary w-full"
            >
              🔐 Start Aadhaar Authentication
            </button>
            
            <button
              onClick={handleDisconnect}
              className="btn-secondary w-full"
            >
              🔌 Disconnect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="card">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">User Profile</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span>Wallet Connected</span>
              </div>
              {sessionStatus.isAuthenticated && (
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                  <span>Authenticated</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear your session data? This will require you to authenticate again.')) {
                  clearSession();
                  setSession(getSession());
                  setSessionStatus(getSessionStatus());
                }
              }}
              className="btn-secondary"
            >
              Clear Session
            </button>
            <button
              onClick={handleDisconnect}
              className="btn-secondary"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Wallet Info */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-white">Wallet Information</h3>
            <div className="flex space-x-2">
              {hasTopUpWallet && topUpWalletInfo && (
                <button
                  onClick={refreshWalletBalance}
                  disabled={isRefreshingBalance}
                  className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded transition-colors flex items-center space-x-1"
                  title="Refresh balance from blockchain"
                >
                  <svg 
                    className={`w-3 h-3 ${isRefreshingBalance ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{isRefreshingBalance ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Address:</span>
              <span className="text-white font-mono text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Session Status:</span>
              <span className={`text-sm ${sessionStatus.sessionValid ? 'text-green-400' : 'text-red-400'}`}>
                {sessionStatus.sessionValid ? 'Active' : 'Expired'}
              </span>
            </div>
            {session.authTimestamp && (
              <div className="flex justify-between">
                <span className="text-gray-400">Last Auth:</span>
                <span className="text-white text-sm">
                  {formatDate(new Date(session.authTimestamp).toISOString())}
                </span>
              </div>
            )}
            
            {/* Top-up Wallet Information */}
            {isLoadingWallet ? (
              <div className="flex justify-between">
                <span className="text-gray-400">Top-up Wallet:</span>
                <span className="text-gray-500 text-sm">Loading...</span>
              </div>
            ) : hasTopUpWallet && topUpWalletInfo ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Top-up Wallet:</span>
                  <span className="text-white font-mono text-sm">
                    {topUpWalletInfo.walletAddress.slice(0, 6)}...{topUpWalletInfo.walletAddress.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400 text-sm font-semibold">
                      {parseFloat(topUpWalletInfo.balance).toFixed(4)} ETH
                    </span>
                    {isRefreshingBalance && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" title="Updating balance..."></div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400 text-sm">
                    {topUpWalletInfo.isInitialized ? 'Active' : 'Initializing'}
                  </span>
                </div>
                {lastBalanceUpdate && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Updated:</span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs ${Date.now() - lastBalanceUpdate.getTime() > 60000 ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {lastBalanceUpdate.toLocaleTimeString()}
                        {Date.now() - lastBalanceUpdate.getTime() > 60000 && ' (stale)'}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-400' : 'bg-red-400'}`} 
                           title={isRealtimeConnected ? 'Real-time updates active' : 'Real-time updates offline'}></div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between">
                <span className="text-gray-400">Top-up Wallet:</span>
                <span className="text-yellow-400 text-sm">Not Created</span>
              </div>
            )}
          </div>
          
          {/* Top-up Button */}
          <div className="border-t border-gray-700 pt-4">
            <button
              onClick={() => onNavigate?.('topup')}
              disabled={!sessionStatus.hasVehicles || isLoadingWallet}
              className={`w-full flex items-center justify-center space-x-2 ${
                sessionStatus.hasVehicles && !isLoadingWallet
                  ? 'btn-primary' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
              }`}
              title={
                !sessionStatus.hasVehicles 
                  ? 'Please register a vehicle first to enable wallet top-up' 
                  : isLoadingWallet 
                    ? 'Loading wallet information...' 
                    : ''
              }
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>
                {isLoadingWallet ? 'Loading...' : hasTopUpWallet ? 'Top-up Wallet' : 'Create & Top-up Wallet'}
              </span>
            </button>
            {!sessionStatus.hasVehicles && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Register a vehicle to enable wallet top-up functionality
              </p>
            )}
            {isLoadingWallet && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Loading wallet information...
              </p>
            )}
          </div>
        </div>

        {/* Authentication Status */}
        {sessionStatus.needsAuth && (
          <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <div>
                <p className="text-yellow-300 font-semibold">Authentication Required</p>
                <p className="text-yellow-400 text-sm">
                  Your authentication has expired. Please re-authenticate to access secure features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Anon-Aadhaar Authentication Section */}
        {sessionStatus.needsAuth && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">🔐 Anon-Aadhaar Authentication</h3>
            <p className="text-gray-400 text-sm mb-4">
              Complete Aadhaar verification to access vehicle registration and other secure features.
            </p>
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                </svg>
              </div>
              <h4 className="text-lg font-medium text-white mb-2">Anonymous Aadhaar Authentication</h4>
              <p className="text-gray-400 text-sm mb-6">
                Verify your identity using zero-knowledge proofs without revealing personal data
              </p>
              <button
                onClick={() => onNavigate?.('auth')}
                className="btn-primary px-6 py-3 text-lg"
              >
                🔐 Start Aadhaar Authentication
              </button>
            </div>
          </div>
        )}

        {/* Vehicle Registration Section - Only show if authenticated but no vehicles */}
        {sessionStatus.isAuthenticated && !sessionStatus.hasVehicles && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">🚗 Register Your Vehicle</h3>
            <p className="text-gray-400 text-sm mb-4">
              Register your vehicle to start using FASTag services and enable wallet top-up functionality.
            </p>
            <VehicleRegistration
              onRegistrationSuccess={(vehicleData) => {
                // Update session with new vehicle
                const vehicleInfo: VehicleInfo = {
                  vehicleId: vehicleData.vehicleId,
                  vehicleType: vehicleData.vehicleType,
                  registrationDate: vehicleData.registrationDate,
                  documents: vehicleData.documents,
                  isActive: vehicleData.isActive
                };
                addVehicle(vehicleInfo);
                setSession(getSession());
                setSessionStatus(getSessionStatus());
              }}
            />
          </div>
        )}
      </div>

      {/* Vehicle Management */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">Registered Vehicles</h3>
          <span className="text-sm text-gray-400">
            {session.vehicles.length} vehicle(s) registered
          </span>
        </div>

        {session.vehicles.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <p className="text-gray-400 mb-2">No vehicles registered</p>
            {sessionStatus.needsAuth ? (
              <p className="text-sm text-gray-500">Complete Aadhaar authentication above to register your first vehicle.</p>
            ) : (
              <p className="text-sm text-gray-500">Register a vehicle to start using FASTag services.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {session.vehicles.map((vehicle) => (
              <div key={vehicle.vehicleId} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h4 className="text-lg font-semibold text-white mr-3">
                        {vehicle.vehicleId}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        vehicle.isActive 
                          ? 'bg-green-900 text-green-300' 
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {vehicle.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Type:</span>
                        {editingVehicle === vehicle.vehicleId ? (
                          <div className="flex items-center space-x-2 mt-1">
                            <select
                              value={newVehicleType}
                              onChange={(e) => setNewVehicleType(e.target.value)}
                              className="input-field text-sm"
                            >
                              <option value="">Select Type</option>
                              <option value="car">Car</option>
                              <option value="truck">Truck</option>
                              <option value="bus">Bus</option>
                              <option value="motorcycle">Motorcycle</option>
                              <option value="commercial">Commercial Vehicle</option>
                            </select>
                            <button
                              onClick={() => handleUpdateVehicleType(vehicle.vehicleId)}
                              className="btn-primary text-xs px-2 py-1"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingVehicle(null);
                                setNewVehicleType('');
                              }}
                              className="btn-secondary text-xs px-2 py-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-white ml-2 capitalize">{vehicle.vehicleType}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-400">Registered:</span>
                        <span className="text-white ml-2">{formatDate(vehicle.registrationDate)}</span>
                      </div>
                    </div>

                    {vehicle.documents.length > 0 && (
                      <div className="mt-3">
                        <span className="text-gray-400 text-sm">Documents:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {vehicle.documents.map((doc, index) => (
                            <span key={index} className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                              {doc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingVehicle(vehicle.vehicleId);
                        setNewVehicleType(vehicle.vehicleType);
                      }}
                      className="btn-secondary text-xs px-3 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveVehicle(vehicle.vehicleId)}
                      className="btn-secondary text-xs px-3 py-1 text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Session Management</h3>
        <div className="space-y-3">
          <button
            onClick={() => {
              clearSession();
              setSession(null);
              setSessionStatus(getSessionStatus());
            }}
            className="btn-secondary w-full"
          >
            Clear Session Data
          </button>
          <p className="text-sm text-gray-400">
            This will remove all stored session data and require re-authentication.
          </p>
        </div>
      </div>
    </div>
  );
};
