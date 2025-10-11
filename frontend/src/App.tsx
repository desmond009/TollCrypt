import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import { Header } from './components/Header';
import { WalletConnect } from './components/WalletConnect';
import { VehicleRegistration } from './components/VehicleRegistration';
import { TollPayment } from './components/TollPayment';
import { VehicleList } from './components/VehicleList';
import { useAccount } from 'wagmi';

const queryClient = new QueryClient();

function App() {
  const { isConnected } = useAccount();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gray-50">
          <Header />
          
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {!isConnected ? (
              <div className="text-center">
                <div className="max-w-md mx-auto">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Welcome to TollChain
                  </h1>
                  <p className="text-lg text-gray-600 mb-8">
                    Connect your wallet to start using our blockchain-based toll collection system
                  </p>
                  <WalletConnect />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Vehicle Management
                  </h2>
                  <VehicleRegistration />
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Your Vehicles
                  </h2>
                  <VehicleList />
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Toll Payment
                  </h2>
                  <TollPayment />
                </div>
              </div>
            )}
          </main>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;