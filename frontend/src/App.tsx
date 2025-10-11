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

function AppContent() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="px-4 pb-20">
        {!isConnected ? (
          <div className="pt-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-yellow-400 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-black font-bold text-xl">TC</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Welcome to TollChain
              </h1>
              <p className="text-gray-400 text-sm">
                Connect your wallet to start using our blockchain-based toll collection system
              </p>
            </div>
            <WalletConnect />
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* Wallet Card */}
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl p-6 text-black">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm opacity-80">Wallet Address</p>
                  <p className="font-mono text-sm">0x598A...7618</p>
                  <p className="text-sm opacity-80 mt-1">DL 23 MJ2343</p>
                </div>
                <div className="bg-black bg-opacity-20 rounded-lg p-3">
                  <p className="text-xs opacity-80">Total Balance</p>
                  <p className="text-xl font-bold">0.00395 ETH</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <h3 className="text-lg font-semibold mb-3">Vehicle Registration</h3>
                <VehicleRegistration />
              </div>
              <div className="card">
                <h3 className="text-lg font-semibold mb-3">Toll Payment</h3>
                <TollPayment />
              </div>
            </div>

            {/* Vehicle List */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Your Vehicles</h3>
              <VehicleList />
            </div>
          </div>
        )}
      </main>
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-2">
        <div className="flex justify-around items-center">
          <button className="flex flex-col items-center py-2">
            <div className="w-6 h-6 mb-1">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
              </svg>
            </div>
            <span className="text-xs">Home</span>
          </button>
          <button className="flex flex-col items-center py-2">
            <div className="w-6 h-6 mb-1">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
              </svg>
            </div>
            <span className="text-xs">Wallet</span>
          </button>
          <button className="flex flex-col items-center py-2">
            <div className="w-6 h-6 mb-1">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
              </svg>
            </div>
            <span className="text-xs">Scan</span>
          </button>
          <button className="flex flex-col items-center py-2">
            <div className="w-6 h-6 mb-1">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
              </svg>
            </div>
            <span className="text-xs">Profile</span>
          </button>
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