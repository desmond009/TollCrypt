import React, { useState, useEffect } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { QRCodeData } from '../services/qrService';
import { qrAPIService } from '../services/qrAPIService';
import { useSession } from '../services/sessionManager';

interface TollPaymentProcessorProps {
  qrData: QRCodeData;
  onPaymentComplete: (transactionHash: string) => void;
  onPaymentError: (error: string) => void;
  onCancel: () => void;
}

export const TollPaymentProcessor: React.FC<TollPaymentProcessorProps> = ({
  qrData,
  onPaymentComplete,
  onPaymentError,
  onCancel
}) => {
  const { address } = useAccount();
  const { getSession } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<string>('0');

  const { sendTransaction, data: hash, error, isPending } = useSendTransaction();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Check wallet balance
  useEffect(() => {
    if (address) {
      // In a real implementation, you would check the actual wallet balance
      // For demo purposes, we'll simulate a balance check
      const savedBalance = localStorage.getItem(`fastag-balance-${address}`);
      setWalletBalance(savedBalance || '0');
    }
  }, [address]);

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && hash) {
      // Process payment with backend
      const processPayment = async () => {
        try {
          const result = await qrAPIService.processQRPayment(
            qrData,
            hash,
            'admin_demo_id' // In production, this would be the actual admin ID
          );
          
          if (result.success) {
            setPaymentStatus('success');
            setIsProcessing(false);
            
            // Update wallet balance
            if (address && qrData.tollRate) {
              const currentBalance = parseFloat(walletBalance);
              const newBalance = Math.max(0, currentBalance - qrData.tollRate);
              localStorage.setItem(`fastag-balance-${address}`, newBalance.toString());
              setWalletBalance(newBalance.toString());
            }
            
            onPaymentComplete(hash);
          } else {
            setPaymentStatus('error');
            setErrorMessage(result.message || 'Payment processing failed');
            setIsProcessing(false);
            onPaymentError(result.message || 'Payment processing failed');
          }
        } catch (error) {
          setPaymentStatus('error');
          setErrorMessage('Failed to process payment with backend');
          setIsProcessing(false);
          onPaymentError('Failed to process payment with backend');
        }
      };
      
      processPayment();
    }
  }, [isSuccess, hash, address, qrData, walletBalance, onPaymentComplete, onPaymentError]);

  // Handle transaction error
  useEffect(() => {
    if (error) {
      setPaymentStatus('error');
      setErrorMessage(error.message);
      setIsProcessing(false);
      onPaymentError(error.message);
    }
  }, [error, onPaymentError]);

  const handleProcessPayment = async () => {
    if (!address) {
      setErrorMessage('Wallet not connected');
      setPaymentStatus('error');
      return;
    }

    if (!qrData.tollRate) {
      setErrorMessage('Invalid toll rate');
      setPaymentStatus('error');
      return;
    }

    const currentBalance = parseFloat(walletBalance);
    if (currentBalance < qrData.tollRate) {
      setErrorMessage('Insufficient wallet balance');
      setPaymentStatus('error');
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      // Send transaction to smart contract
      await sendTransaction({
        to: (process.env.REACT_APP_TOLL_COLLECTION_ADDRESS || '0xeC9423d9EBFe0C0f49F7bc221aE52572E8734291') as `0x${string}`, // Contract address
        value: BigInt(Math.floor(qrData.tollRate * 1e18)), // Convert to wei
        data: '0x' // Contract call data would go here
      });
    } catch (err) {
      setPaymentStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Transaction failed');
      setIsProcessing(false);
    }
  };

  const formatAmount = (amount: number) => {
    return `${amount.toFixed(6)} ETH`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gray-600';
      case 'processing': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Process Toll Payment
        </h2>
        <p className="text-gray-600">
          Review and process the toll payment
        </p>
      </div>

      {/* QR Code Data Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-800 mb-3">Payment Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Vehicle Number:</span>
            <span className="font-medium">{qrData.vehicleNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Vehicle Type:</span>
            <span className="font-medium capitalize">{qrData.vehicleType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Wallet Address:</span>
            <span className="font-mono text-xs">{qrData.walletAddress.slice(0, 6)}...{qrData.walletAddress.slice(-4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Toll Amount:</span>
            <span className="font-medium text-green-600">{formatAmount(qrData.tollRate || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Current Balance:</span>
            <span className="font-medium">{formatAmount(parseFloat(walletBalance))}</span>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="mb-6">
        <div className={`flex items-center justify-center space-x-2 p-4 rounded-lg ${
          paymentStatus === 'success' ? 'bg-green-50' :
          paymentStatus === 'error' ? 'bg-red-50' :
          paymentStatus === 'processing' ? 'bg-blue-50' :
          'bg-gray-50'
        }`}>
          <div className={getStatusColor(paymentStatus)}>
            {getStatusIcon(paymentStatus)}
          </div>
          <span className={`font-medium ${getStatusColor(paymentStatus)}`}>
            {paymentStatus === 'pending' && 'Ready to Process'}
            {paymentStatus === 'processing' && 'Processing Payment...'}
            {paymentStatus === 'success' && 'Payment Successful!'}
            {paymentStatus === 'error' && 'Payment Failed'}
          </span>
        </div>

        {errorMessage && (
          <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {paymentStatus === 'pending' && (
          <button
            onClick={handleProcessPayment}
            disabled={isProcessing || parseFloat(walletBalance) < (qrData.tollRate || 0)}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Process Payment ({formatAmount(qrData.tollRate || 0)})
          </button>
        )}

        {paymentStatus === 'processing' && (
          <div className="w-full bg-blue-600 text-white py-3 px-4 rounded-md text-center font-medium">
            <div className="flex items-center justify-center space-x-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processing Transaction...</span>
            </div>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="w-full bg-green-600 text-white py-3 px-4 rounded-md text-center font-medium">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Payment Completed Successfully!</span>
            </div>
          </div>
        )}

        {paymentStatus === 'error' && (
          <button
            onClick={handleProcessPayment}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
          >
            Retry Payment
          </button>
        )}

        <button
          onClick={onCancel}
          className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Transaction Hash */}
      {hash && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-1">Transaction Hash:</h4>
          <p className="text-xs text-blue-700 font-mono break-all">{hash}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-medium text-yellow-800 mb-2">Important:</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Ensure sufficient wallet balance</li>
          <li>• Transaction will be recorded on blockchain</li>
          <li>• Payment is non-refundable once processed</li>
          <li>• Keep transaction hash for records</li>
        </ul>
      </div>
    </div>
  );
};
