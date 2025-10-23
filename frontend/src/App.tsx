import React, { useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import './config/appkit'; // Initialize Web3Modal
import { Header } from './components/Header';
import { WalletConnect } from './components/WalletConnect';
import { AnonAadhaarAuth } from './components/AnonAadhaarAuth';
import { VehicleRegistration } from './components/VehicleRegistration';
import { WalletTopUp } from './components/WalletTopUp';
import { TollPayment } from './components/TollPayment';
import { VehicleList } from './components/VehicleList';
import { UserProfile } from './components/UserProfile';
import { RealtimeNotifications } from './components/RealtimeNotifications';
import { useAccount } from 'wagmi';
import { useSession } from './services/sessionManager';
import { vehicleAPIService } from './services/vehicleAPIService';
import { walletPersistenceService } from './services/walletPersistenceService';
import { useRealtime } from './hooks/useRealtime';
import { useDashboardStats } from './hooks/useDashboardStats';
import { formatETHDisplay } from './utils/currency';

const queryClient = new QueryClient();

type AppStep = 'wallet' | 'auth' | 'register' | 'topup' | 'payment' | 'qr-payment' | 'dashboard' | 'profile';

function AppContent() {
  const { isConnected, address } = useAccount();
  const { 
    getSession, 
    createSession, 
    updateAuth, 
    addVehicle, 
    getSessionStatus,
    isAuthValid 
  } = useSession();
  
  const [currentStep, setCurrentStep] = useState<AppStep>('wallet');
  const [sessionStatus, setSessionStatus] = useState(getSessionStatus());
  
  // Initialize real-time functionality
  const { data: realtimeData, isConnected: isRealtimeConnected } = useRealtime(address, false, undefined, undefined);
  
  // Initialize real-time dashboard stats
  const { 
    stats: dashboardStats, 
    isLoading: isStatsLoading, 
    error: statsError, 
    refreshStats,
    isConnected: isStatsConnected 
  } = useDashboardStats(address);

  // Initialize session when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      const session = getSession();
      if (!session) {
        createSession();
      } else {
        // Sync existing session data with backend
        if (session.vehicles.length > 0) {
          vehicleAPIService.syncSessionWithBackend(address, session.vehicles)
            .then(response => {
              if (response.success) {
                console.log('Session synced with backend successfully');
              }
            })
            .catch(error => {
              console.error('Error syncing session with backend:', error);
            });
        }
      }
      setSessionStatus(getSessionStatus());
    }
  }, [isConnected, address, getSession, createSession, getSessionStatus]);

  // Load wallet using persistence strategy when wallet connects
  useEffect(() => {
    const loadWallet = async () => {
      if (!isConnected || !address) return;

      try {
        console.log('🔄 Loading wallet with persistence strategy on app startup...');
        const walletInfo = await walletPersistenceService.getWalletWithFallback(address);
        
        if (walletInfo) {
          console.log('✅ Wallet loaded successfully on startup:', walletInfo.walletAddress);
          // Note: Private key is not stored for security reasons
          // Top-up wallets are smart contracts, not EOA wallets
        } else {
          console.log('ℹ️ No wallet found on startup, will create when needed');
        }
      } catch (error) {
        console.error('❌ Error loading wallet on startup:', error);
      }
    };

    loadWallet();
  }, [isConnected, address]);

  // Update session status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionStatus(getSessionStatus());
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [getSessionStatus]);

  // Dashboard stats are now handled by useDashboardStats hook

  const handleAuthSuccess = (proof: string, publicInputs: number[]) => {
    updateAuth(proof);
    setSessionStatus(getSessionStatus());
    
    // If user already has vehicles, go to dashboard, otherwise register
    if (sessionStatus.hasVehicles) {
      setCurrentStep('dashboard');
    } else {
      setCurrentStep('register');
    }
  };

  const handleAuthError = (error: string) => {
    console.error('Authentication error:', error);
  };

  const handleVehicleRegistered = (vehicleData: any) => {
    addVehicle(vehicleData);
    setSessionStatus(getSessionStatus());
    // Go to topup step to allow user to add money to their top-up wallet
    setCurrentStep('topup');
  };

  const handleTopUpComplete = () => {
    setCurrentStep('payment');
  };

  const handlePaymentComplete = () => {
    setCurrentStep('dashboard');
  };

  const resetFlow = () => {
    setCurrentStep('wallet');
    setSessionStatus(getSessionStatus());
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        
        <main className="px-3 sm:px-4 pb-20">
          <div className="pt-8">
            <div className="text-center mb-8">
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
              <h1 className="text-2xl font-bold text-white mb-2">
                Welcome to Toll Crypt
              </h1>
              <p className="text-gray-400 text-sm">
                Connect your wallet to start using our blockchain-based toll collection system
              </p>
            </div>
            <WalletConnect />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header onNavigate={setCurrentStep} />
      
      <main className="px-3 sm:px-4 pb-20">
        {/* Progress Indicator */}
        <div className="pt-4 mb-6">
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 overflow-x-auto pb-2">
            {[
              { step: 'wallet', label: 'Wallet', icon: '🔗', shortLabel: 'W' },
              { step: 'auth', label: 'Auth', icon: '🔐', shortLabel: 'A' },
              { step: 'register', label: 'Register', icon: '🚗', shortLabel: 'R' },
              { step: 'topup', label: 'Top-up', icon: '💰', shortLabel: 'T' },
              { step: 'payment', label: 'Payment', icon: '💳', shortLabel: 'P' },
              { step: 'dashboard', label: 'Dashboard', icon: '📊', shortLabel: 'D' }
            ].map((item, index) => {
              const isActive = currentStep === item.step;
              const isCompleted = [
                'wallet', 'auth', 'register', 'topup', 'payment', 'dashboard'
              ].indexOf(currentStep) > index;
              
              // Check if step is completed based on session status
              let stepCompleted = isCompleted;
              if (item.step === 'wallet') stepCompleted = isConnected;
              if (item.step === 'auth') stepCompleted = sessionStatus.isAuthenticated;
              if (item.step === 'register') stepCompleted = sessionStatus.hasVehicles;
              
              return (
                <div key={item.step} className="flex items-center flex-shrink-0">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs ${
                    isActive ? 'bg-yellow-400 text-black' : 
                    stepCompleted ? 'bg-green-500 text-white' : 
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {stepCompleted ? '✓' : item.icon}
                  </div>
                  <span className={`ml-1 sm:ml-2 text-xs hidden sm:block ${
                    isActive ? 'text-yellow-400' : 
                    stepCompleted ? 'text-green-400' : 
                    'text-gray-500'
                  }`}>
                    {item.label}
                  </span>
                  <span className={`ml-1 sm:hidden text-xs font-bold ${
                    isActive ? 'text-yellow-400' : 
                    stepCompleted ? 'text-green-400' : 
                    'text-gray-500'
                  }`}>
                    {item.shortLabel}
                  </span>
                  {index < 5 && (
                    <div className={`w-4 sm:w-8 h-0.5 ml-1 sm:ml-2 ${
                      stepCompleted ? 'bg-green-500' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {currentStep === 'wallet' && (
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-4">Step 1: Wallet Connected</h2>
              <div className="bg-green-900 border border-green-700 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <div>
                    <p className="text-green-300 font-semibold">Wallet Connected Successfully!</p>
                    <p className="text-green-400 text-sm">Your wallet is ready for FASTag registration</p>
                  </div>
                </div>
              </div>
              
              {/* Show session status if available */}
              {sessionStatus.sessionValid && (
                <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <p className="text-blue-300 font-semibold">Welcome Back!</p>
                      <p className="text-blue-400 text-sm">
                        {sessionStatus.isAuthenticated ? 'You are authenticated' : 'Authentication required'}
                        {sessionStatus.hasVehicles && ` • ${sessionStatus.hasVehicles ? 'Vehicles registered' : ''}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {sessionStatus.isAuthenticated && sessionStatus.hasVehicles ? (
                  <button
                    onClick={() => setCurrentStep('dashboard')}
                    className="btn-primary w-full"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentStep('auth')}
                    className="btn-primary w-full"
                  >
                    Continue to Anonymous Authentication
                  </button>
                )}
                
                {sessionStatus.sessionValid && (
                  <button
                    onClick={() => setCurrentStep('profile')}
                    className="btn-secondary w-full"
                  >
                    View Profile
                  </button>
                )}
              </div>
            </div>
          )}

          {currentStep === 'auth' && (
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-4">Step 2: Anonymous Aadhaar Authentication</h2>
              
              {/* Show if user is already authenticated */}
              {sessionStatus.isAuthenticated && (
                <div className="bg-green-900 border border-green-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <p className="text-green-300 font-semibold">Already Authenticated!</p>
                      <p className="text-green-400 text-sm">You are already authenticated and can proceed.</p>
                    </div>
                  </div>
                </div>
              )}
              
              <AnonAadhaarAuth 
                onAuthSuccess={handleAuthSuccess}
                onAuthError={handleAuthError}
              />
              
              {sessionStatus.isAuthenticated && (
                <div className="mt-4">
                  <button
                    onClick={() => setCurrentStep(sessionStatus.hasVehicles ? 'dashboard' : 'register')}
                    className="btn-primary w-full"
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 'register' && (
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-4">Step 3: Vehicle Registration & Top-up Wallet Creation</h2>
              
              {/* Show if user already has vehicles */}
              {sessionStatus.hasVehicles && (
                <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <p className="text-blue-300 font-semibold">Vehicles Already Registered!</p>
                      <p className="text-blue-400 text-sm">You can add more vehicles or proceed to the dashboard.</p>
                    </div>
                  </div>
                </div>
              )}
              
              <VehicleRegistration onRegistrationSuccess={handleVehicleRegistered} />
              
              {sessionStatus.hasVehicles && (
                <div className="mt-4 space-y-3">
                  <button
                    onClick={() => setCurrentStep('dashboard')}
                    className="btn-primary w-full"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => setCurrentStep('profile')}
                    className="btn-secondary w-full"
                  >
                    Manage Vehicles
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 'topup' && (
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-4">Step 4: Top-up Your Wallet</h2>
              <WalletTopUp />
              <div className="mt-4">
                <button
                  onClick={() => setCurrentStep('payment')}
                  className="btn-primary w-full"
                >
                  Continue to Toll Payment
                </button>
              </div>
            </div>
          )}

          {currentStep === 'payment' && (
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-4">Step 5: Contactless Toll Payment</h2>
              <TollPayment />
              <div className="mt-4">
                <button
                  onClick={() => setCurrentStep('qr-payment')}
                  className="btn-primary w-full"
                >
                  QR Code Payment (Recommended)
                </button>
                <button
                  onClick={() => setCurrentStep('dashboard')}
                  className="btn-secondary w-full mt-2"
                >
                  View Dashboard
                </button>
              </div>
            </div>
          )}

          {currentStep === 'qr-payment' && (
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-4">Step 6: QR Code-Based Toll Payment</h2>
              <TollPayment />
              <div className="mt-4">
                <button
                  onClick={() => setCurrentStep('dashboard')}
                  className="btn-primary w-full"
                >
                  View Dashboard
                </button>
              </div>
            </div>
          )}

          {currentStep === 'dashboard' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white">FASTag Dashboard</h2>
                  <div className="flex items-center space-x-2">
                    {isStatsConnected && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Real-time connected"></div>
                    )}
                    {isStatsLoading && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    <button
                      onClick={refreshStats}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                      title="Refresh stats"
                    >
                      🔄
                    </button>
                    {dashboardStats && (
                      <span className="text-xs text-gray-400">
                        Last updated: {new Date().toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
                
                {statsError && (
                  <div className="bg-red-900 border border-red-700 rounded-lg p-3 mb-4">
                    <p className="text-red-300 text-sm">{statsError}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-3 sm:p-4 text-white">
                    <p className="text-xs sm:text-sm opacity-80">Total Transactions</p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {isStatsLoading ? '...' : (dashboardStats?.totalTransactions || 0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-3 sm:p-4 text-white">
                    <p className="text-xs sm:text-sm opacity-80">Total Spent</p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {isStatsLoading ? '...' : formatETHDisplay(dashboardStats?.totalSpent || 0)}
                    </p>
                  </div>
                </div>
                <VehicleList />
              </div>
              
              {/* Quick Actions */}
              <div className="card">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <button
                    onClick={() => setCurrentStep('payment')}
                    className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-white"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-xs sm:text-sm font-medium text-center">Toll Payment</span>
                  </button>
                  
                  <button
                    onClick={() => setCurrentStep('topup')}
                    disabled={!sessionStatus.hasVehicles}
                    className={`flex flex-col items-center p-3 sm:p-4 rounded-lg transition-all duration-200 ${
                      sessionStatus.hasVehicles
                        ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                    title={!sessionStatus.hasVehicles ? 'Please register a vehicle first to enable wallet top-up' : ''}
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-xs sm:text-sm font-medium text-center">Top-up Wallet</span>
                  </button>
                  
                  <button
                    onClick={() => setCurrentStep('register')}
                    className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-white"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-xs sm:text-sm font-medium text-center">Add Vehicle</span>
                  </button>
                  
                  <button
                    onClick={() => setCurrentStep('profile')}
                    className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 text-white"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-xs sm:text-sm font-medium text-center">My Profile</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'profile' && (
            <UserProfile onNavigate={setCurrentStep} />
          )}

        </div>
      </main>
      
      {/* Real-time Notifications */}
      {isConnected && address && (
        <RealtimeNotifications userId={address} />
      )}
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-2">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>FASTag System</span>
          <span>Step {['wallet', 'auth', 'register', 'topup', 'payment', 'dashboard'].indexOf(currentStep) + 1} of 6</span>
          <span>Blockchain Powered</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;