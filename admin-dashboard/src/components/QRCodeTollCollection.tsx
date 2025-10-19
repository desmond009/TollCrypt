import React, { useState, useEffect } from 'react';
import { 
  QrCodeIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  TruckIcon,
  UserIcon,
  WalletIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  PrinterIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { QRScanner } from './QRScanner';
import { QRCodeData } from '../types/qr';
import { ReceiptService, ReceiptData } from '../services/receiptService';
import { api } from '../services/api';

interface QRCodeTollCollectionProps {
  onTransactionComplete?: (result: any) => void;
  onTransactionError?: (error: string) => void;
}

interface TransactionStats {
  totalScanned: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalRevenue: number;
  lastTransactionTime?: Date;
}

export const QRCodeTollCollection: React.FC<QRCodeTollCollectionProps> = ({
  onTransactionComplete,
  onTransactionError
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedQRData, setScannedQRData] = useState<QRCodeData | null>(null);
  const [transactionStats, setTransactionStats] = useState<TransactionStats>({
    totalScanned: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    totalRevenue: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load recent transactions on component mount
  useEffect(() => {
    loadRecentTransactions();
  }, []);

  const loadRecentTransactions = async () => {
    try {
      const response = await api.get('/api/admin/transactions/recent');
      if (response.data.success) {
        setRecentTransactions(response.data.data);
      }
    } catch (error) {
      console.error('Error loading recent transactions:', error);
    }
  };

  const handleQRScanned = async (qrData: QRCodeData) => {
    setScannedQRData(qrData);
    setIsScanning(false);
    setIsProcessing(true);
    
    // Update stats
    setTransactionStats(prev => ({
      ...prev,
      totalScanned: prev.totalScanned + 1,
      lastTransactionTime: new Date()
    }));

    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update success stats
      setTransactionStats(prev => ({
        ...prev,
        successfulTransactions: prev.successfulTransactions + 1,
        totalRevenue: prev.totalRevenue + (parseFloat(qrData.tollRate?.toString() || '0'))
      }));

      // Add to recent transactions
      const newTransaction = {
        id: Date.now(),
        vehicleId: qrData.vehicleId,
        vehicleType: qrData.vehicleType,
        amount: qrData.tollRate || 0,
        timestamp: new Date(),
        status: 'completed'
      };
      
      setRecentTransactions(prev => [newTransaction, ...prev.slice(0, 9)]);
      
      onTransactionComplete?.(qrData);
    } catch (error: any) {
      setTransactionStats(prev => ({
        ...prev,
        failedTransactions: prev.failedTransactions + 1
      }));
      onTransactionError?.(error.message || 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanError = (error: string) => {
    setTransactionStats(prev => ({
      ...prev,
      failedTransactions: prev.failedTransactions + 1
    }));
    onTransactionError?.(error);
  };

  const handleStartScanning = () => {
    setIsScanning(true);
    setScannedQRData(null);
  };

  const handleStopScanning = () => {
    setIsScanning(false);
  };

  const generateReceipt = (transaction: any) => {
    const receiptData: ReceiptData = {
      transactionId: transaction.id.toString(),
      vehicleNumber: transaction.vehicleId,
      vehicleType: transaction.vehicleType,
      tollAmount: transaction.amount.toString(),
      timestamp: transaction.timestamp.getTime(),
      transactionHash: `0x${transaction.id.toString(16)}`,
      adminWallet: '0x0000000000000000000000000000000000000000',
      plazaId: 'PLAZA-001'
    };
    
    ReceiptService.downloadReceipt(receiptData);
  };

  const printReceipt = (transaction: any) => {
    const receiptData: ReceiptData = {
      transactionId: transaction.id.toString(),
      vehicleNumber: transaction.vehicleId,
      vehicleType: transaction.vehicleType,
      tollAmount: transaction.amount.toString(),
      timestamp: transaction.timestamp.getTime(),
      transactionHash: `0x${transaction.id.toString(16)}`,
      adminWallet: '0x0000000000000000000000000000000000000000',
      plazaId: 'PLAZA-001'
    };
    
    ReceiptService.printReceipt(receiptData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QR Code Toll Collection</h1>
            <p className="text-gray-600">Scan vehicle QR codes for instant toll payment processing</p>
          </div>
          <div className="flex space-x-3">
            {!isScanning ? (
              <button
                onClick={handleStartScanning}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <PlayIcon className="h-5 w-5 mr-2" />
                Start Scanning
              </button>
            ) : (
              <button
                onClick={handleStopScanning}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <StopIcon className="h-5 w-5 mr-2" />
                Stop Scanning
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <QrCodeIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Scanned</p>
              <p className="text-2xl font-bold text-gray-900">{transactionStats.totalScanned}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Successful</p>
              <p className="text-2xl font-bold text-gray-900">{transactionStats.successfulTransactions}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <XCircleIcon className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{transactionStats.failedTransactions}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹{transactionStats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <QRScanner
          onQRScanned={handleQRScanned}
          onError={handleScanError}
          isScanning={isScanning}
          onClose={handleStopScanning}
        />
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        {recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    transaction.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900">{transaction.vehicleId}</p>
                    <p className="text-sm text-gray-600 capitalize">{transaction.vehicleType}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-medium text-gray-900">₹{transaction.amount}</p>
                    <p className="text-sm text-gray-600">
                      {transaction.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => generateReceipt(transaction)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-md"
                      title="Download Receipt"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => printReceipt(transaction)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-md"
                      title="Print Receipt"
                    >
                      <PrinterIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <QrCodeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No transactions yet. Start scanning to see transactions here.</p>
          </div>
        )}
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4">
            <div className="text-center">
              <ArrowPathIcon className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Transaction</h3>
              <p className="text-gray-600">Please wait while we process the toll payment...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
