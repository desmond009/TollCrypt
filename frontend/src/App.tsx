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
import { TollDeduction } from './components/TollDeduction';
import { useAccount } from 'wagmi';
import { useSession } from './services/sessionManager';

const queryClient = new QueryClient();

type AppStep = 'wallet' | 'auth' | 'register' | 'topup' | 'payment' | 'qr-payment' | 'dashboard' | 'profile' | 'toll-deduction';

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

  // Initialize session when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      const session = getSession();
      if (!session) {
        createSession();
      }
      setSessionStatus(getSessionStatus());
    }
  }, [isConnected, address, getSession, createSession, getSessionStatus]);

  // Update session status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionStatus(getSessionStatus());
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [getSessionStatus]);

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
        
        <main className="px-4 pb-20">
          <div className="pt-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-yellow-400 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-black font-bold text-xl">TC</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Welcome to TollChain FASTag
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
      
      <main className="px-4 pb-20">
        {/* Progress Indicator */}
        <div className="pt-4 mb-6">
          <div className="flex items-center justify-center space-x-4">
            {[
              { step: 'wallet', label: 'Wallet', icon: '🔗' },
              { step: 'auth', label: 'Auth', icon: '🔐' },
              { step: 'register', label: 'Register', icon: '🚗' },
              { step: 'topup', label: 'Top-up', icon: '💰' },
              { step: 'payment', label: 'Payment', icon: '💳' },
              { step: 'dashboard', label: 'Dashboard', icon: '📊' }
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
                <div key={item.step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                    isActive ? 'bg-yellow-400 text-black' : 
                    stepCompleted ? 'bg-green-500 text-white' : 
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {stepCompleted ? '✓' : item.icon}
                  </div>
                  <span className={`ml-2 text-xs ${
                    isActive ? 'text-yellow-400' : 
                    stepCompleted ? 'text-green-400' : 
                    'text-gray-500'
                  }`}>
                    {item.label}
                  </span>
                  {index < 5 && (
                    <div className={`w-8 h-0.5 ml-2 ${
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
              <h2 className="text-xl font-bold text-white mb-4">Step 3: Vehicle Registration & FASTag Wallet Creation</h2>
              
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
              <h2 className="text-xl font-bold text-white mb-4">Step 4: Top-up Your FASTag Wallet</h2>
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
                <h2 className="text-xl font-bold text-white mb-4">FASTag Dashboard</h2>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                    <p className="text-sm opacity-80">Total Transactions</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                    <p className="text-sm opacity-80">Total Spent</p>
                    <p className="text-2xl font-bold">₹1,250</p>
                  </div>
                </div>
                <VehicleList />
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentStep('toll-deduction')}
                  className="btn-primary flex-1"
                >
                  Toll Payment
                </button>
                <button
                  onClick={() => setCurrentStep('topup')}
                  className="btn-secondary flex-1"
                >
                  Top-up Wallet
                </button>
                <button
                  onClick={() => setCurrentStep('profile')}
                  className="btn-secondary flex-1"
                >
                  Profile
                </button>
              </div>
            </div>
          )}

          {currentStep === 'profile' && (
            <UserProfile onNavigate={setCurrentStep} />
          )}

          {currentStep === 'toll-deduction' && (
            <TollDeduction />
          )}
        </div>
      </main>
      
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