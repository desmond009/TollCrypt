import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import './config/appkit'; // Initialize Web3Modal
import { Dashboard } from './components/Dashboard';
import { VehicleManagement } from './components/VehicleManagement';
import { TransactionMonitoring } from './components/TransactionMonitoring';
import { AnalyticsReporting } from './components/AnalyticsReporting';
import { PlazaManagement } from './components/PlazaManagement';
import { QRScanner } from './components/QRScanner';
import { TransactionProcessor } from './components/TransactionProcessor';
import { QRCodeTollCollection } from './components/QRCodeTollCollection';
import RevenueManagement from './components/RevenueManagement';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { RealtimeNotifications } from './components/RealtimeNotifications';
import { useAuth } from './hooks/useAuth';
import { useAccount } from 'wagmi';
import { useRealtime } from './hooks/useRealtime';

// User interface is now defined in types/auth.ts

const queryClient = new QueryClient();

function AppContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { address } = useAccount();
  const [loginTrigger, setLoginTrigger] = useState(0);
  
  console.log('AppContent - isAuthenticated:', isAuthenticated, 'user:', user, 'loginTrigger:', loginTrigger);
  
  // Monitor authentication state changes
  useEffect(() => {
    console.log('Authentication state changed:', { isAuthenticated, user: user?.email });
    if (isAuthenticated && user) {
      console.log('User is authenticated, should show dashboard');
    } else {
      console.log('User not authenticated, showing login form');
    }
  }, [isAuthenticated, user]);

  // Force re-render when login trigger changes
  useEffect(() => {
    console.log('Login trigger changed:', loginTrigger);
  }, [loginTrigger]);
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedQRData, setScannedQRData] = useState<any>(null);
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);

  // Initialize real-time functionality
  const { data: realtimeData, isConnected: isRealtimeConnected } = useRealtime(user?.id, user?.role);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket connection
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
        transports: ['polling', 'websocket'],
        withCredentials: true,
        forceNew: true
      });
      setSocket(newSocket);

      // Handle real-time updates
      newSocket.on('toll_payment_update', (data) => {
        setNotifications(prev => [...prev, {
          type: 'toll_payment',
          message: `New toll payment: ${data.amount} USDC`,
          timestamp: new Date()
        }]);
      });

      newSocket.on('vehicle_detected', (data) => {
        setNotifications(prev => [...prev, {
          type: 'vehicle_detected',
          message: `Vehicle detected: ${data.vehicleId}`,
          timestamp: new Date()
        }]);
      });

      newSocket.on('system_alert', (data) => {
        setNotifications(prev => [...prev, {
          type: 'alert',
          message: data.message,
          severity: data.severity,
          timestamp: new Date()
        }]);
      });

      return () => {
        newSocket.close();
      };
    }
  }, [isAuthenticated, user]);

  const handleQRScanned = (qrData: any) => {
    setScannedQRData(qrData);
    setIsProcessingTransaction(true);
    setIsScanning(false);
  };

  const handleTransactionComplete = (result: any) => {
    setIsProcessingTransaction(false);
    setScannedQRData(null);
    // Add success notification
    setNotifications(prev => [...prev, {
      type: 'success',
      message: `Transaction completed: ${result.transactionHash}`,
      timestamp: new Date()
    }]);
  };

  const handleTransactionError = (error: string) => {
    setIsProcessingTransaction(false);
    setScannedQRData(null);
    // Add error notification
    setNotifications(prev => [...prev, {
      type: 'error',
      message: `Transaction failed: ${error}`,
      timestamp: new Date()
    }]);
  };

  const handleCancelTransaction = () => {
    setIsProcessingTransaction(false);
    setScannedQRData(null);
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    console.log('Rendering Login component - isAuthenticated:', isAuthenticated, 'user:', user);
    return <Login key={loginTrigger} onLogin={(userData) => {
      console.log('Login successful - user data received:', userData);
      // Force a re-render by updating the trigger
      setLoginTrigger(prev => prev + 1);
    }} />;
  }

  console.log('Rendering Dashboard - isAuthenticated:', isAuthenticated, 'user:', user);

  const renderContent = () => {
    if (isScanning) {
      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-white">QR Code Scanner</h1>
            <button
              onClick={() => setIsScanning(false)}
              className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Cancel Scanning
            </button>
          </div>
          <QRScanner
            onQRScanned={handleQRScanned}
            isScanning={isScanning}
            onClose={() => setIsScanning(false)}
          />
        </div>
      );
    }

    if (isProcessingTransaction && scannedQRData) {
      return (
        <TransactionProcessor
          qrData={scannedQRData}
          onTransactionComplete={handleTransactionComplete}
          onTransactionError={handleTransactionError}
          onCancel={handleCancelTransaction}
          adminWallet={address || ''}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard socket={socket} notifications={notifications} />;
      case 'vehicles':
        return <VehicleManagement socket={socket} />;
      case 'transactions':
        return <TransactionMonitoring socket={socket} />;
      case 'revenue':
        return <RevenueManagement />;
      case 'analytics':
        return <AnalyticsReporting socket={socket} />;
      case 'plazas':
        return <PlazaManagement socket={socket} />;
      case 'scanner':
        return <QRCodeTollCollection 
          onTransactionComplete={handleTransactionComplete}
          onTransactionError={handleTransactionError}
        />;
      default:
        return <Dashboard socket={socket} notifications={notifications} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header 
        user={user} 
        onLogout={logout} 
        notifications={notifications}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <main className="flex-1 p-3 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
      
      {/* Real-time Notifications */}
      {isAuthenticated && user && (
        <RealtimeNotifications adminId={user.id} role={user.role} />
      )}
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