import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Dashboard } from './components/Dashboard';
import { VehicleManagement } from './components/VehicleManagement';
import { TransactionMonitoring } from './components/TransactionMonitoring';
import { AnalyticsReporting } from './components/AnalyticsReporting';
import { PlazaManagement } from './components/PlazaManagement';
import { QRScanner } from './components/QRScanner';
import { TransactionProcessor } from './components/TransactionProcessor';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { useAuth } from './hooks/useAuth';
import { useMetaMask } from './hooks/useMetaMask';

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
}

function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const { account } = useMetaMask();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedQRData, setScannedQRData] = useState<any>(null);
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);

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

  if (!isAuthenticated || !user) {
    return <Login onLogin={() => {}} />;
  }

  const renderContent = () => {
    if (isScanning) {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">QR Code Scanner</h1>
            <button
              onClick={() => setIsScanning(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
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
          adminWallet={account?.address || ''}
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
      case 'analytics':
        return <AnalyticsReporting socket={socket} />;
      case 'plazas':
        return <PlazaManagement socket={socket} />;
      case 'scanner':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">QR Code Scanner</h1>
              <button
                onClick={() => setIsScanning(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Start Scanning
              </button>
            </div>
            <QRScanner
              onQRScanned={handleQRScanned}
              isScanning={false}
              onClose={() => setIsScanning(false)}
            />
          </div>
        );
      default:
        return <Dashboard socket={socket} notifications={notifications} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={user} onLogout={logout} notifications={notifications} />
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;