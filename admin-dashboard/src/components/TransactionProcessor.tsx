import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ethers } from 'ethers';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TruckIcon,
  UserIcon,
  WalletIcon
} from '@heroicons/react/24/outline';
import { QRCodeData } from '../types/qr';
import { blockchainService, VehicleRegistration, BalanceInfo } from '../services/blockchainService';
import { api } from '../services/api';
import { ReceiptService, ReceiptData } from '../services/receiptService';

interface TransactionProcessorProps {
  qrData: QRCodeData;
  onTransactionComplete: (result: TransactionResult) => void;
  onTransactionError: (error: string) => void;
  onCancel: () => void;
  adminWallet: string;
}

interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
}

interface TransactionFormData {
  tollAmount: string;
  notes?: string;
}

export const TransactionProcessor: React.FC<TransactionProcessorProps> = ({
  qrData,
  onTransactionComplete,
  onTransactionError,
  onCancel,
  adminWallet,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'validating' | 'valid' | 'invalid'>('validating');
  const [validationError, setValidationError] = useState<string>('');
  const [vehicleRegistration, setVehicleRegistration] = useState<VehicleRegistration | null>(null);
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [tollRate, setTollRate] = useState<string>('0');
  const [transactionStep, setTransactionStep] = useState<'validation' | 'confirmation' | 'processing' | 'complete'>('validation');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransactionFormData>();

  const tollAmount = watch('tollAmount');

  // Validate QR code and fetch vehicle data
  useEffect(() => {
    const validateAndFetchData = async () => {
      try {
        setTransactionStep('validation');
        
        // Validate QR code
        const validation = await blockchainService.validateQRCode(qrData);
        if (!validation.isValid) {
          setValidationStatus('invalid');
          setValidationError(validation.error || 'Validation failed');
          return;
        }

        // Validate wallet address
        if (!ethers.isAddress(qrData.walletAddress)) {
          throw new Error('Invalid wallet address in QR code');
        }

        // Fetch vehicle registration
        const registration = await blockchainService.getVehicleRegistration(qrData.vehicleId);
        setVehicleRegistration(registration);

        // Fetch wallet balance
        const balance = await blockchainService.getWalletBalance(qrData.walletAddress);
        setBalanceInfo(balance);

        // Fetch toll rate
        const rate = await blockchainService.getTollRate(qrData.vehicleType);
        setTollRate(rate);
        setValue('tollAmount', rate);

        setValidationStatus('valid');
        setTransactionStep('confirmation');
      } catch (error: any) {
        setValidationStatus('invalid');
        setValidationError(error.message || 'Failed to validate transaction data');
      }
    };

    validateAndFetchData();
  }, [qrData, setValue]);

  const handleTransactionSubmit = async (data: TransactionFormData) => {
    setIsProcessing(true);
    setTransactionStep('processing');

    try {
      // Check if user has sufficient balance
      if (balanceInfo) {
        const requiredAmount = parseFloat(data.tollAmount);
        const availableBalance = parseFloat(balanceInfo.formattedBalance);
        
        if (availableBalance < requiredAmount) {
          throw new Error(`Insufficient balance. Required: ₹${requiredAmount.toFixed(2)}, Available: ₹${availableBalance.toFixed(2)}`);
        }
      }

      // Process the transaction
      const result = await blockchainService.processTollPayment(
        qrData,
        data.tollAmount,
        adminWallet
      );

      if (result.success) {
        // Log transaction to backend
        await api.post('/api/admin/transactions', {
          qrData,
          tollAmount: data.tollAmount,
          transactionHash: result.transactionHash,
          adminWallet,
          notes: data.notes,
          gasUsed: result.gasUsed,
        });

        // Generate receipt
        const receiptData: ReceiptData = {
          transactionId: result.transactionHash?.substring(0, 10) || Date.now().toString(),
          vehicleNumber: qrData.vehicleId,
          vehicleType: qrData.vehicleType,
          tollAmount: data.tollAmount,
          timestamp: Date.now(),
          transactionHash: result.transactionHash || '',
          adminWallet,
          plazaId: qrData.plazaId,
          gasUsed: result.gasUsed,
        };

        // Generate and store receipt
        const digitalReceipt = ReceiptService.generateDigitalReceipt(receiptData);
        
        setTransactionStep('complete');
        onTransactionComplete(result);
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (error: any) {
      onTransactionError(error.message || 'Transaction processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStepIcon = (step: string, currentStep: string) => {
    if (step === currentStep) {
      return <ClockIcon className="h-5 w-5 text-blue-500" />;
    } else if (['validation', 'confirmation', 'processing'].indexOf(step) < ['validation', 'confirmation', 'processing'].indexOf(currentStep)) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    } else {
      return <div className="h-5 w-5 rounded-full bg-gray-300" />;
    }
  };

  if (validationStatus === 'invalid') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <XCircleIcon className="h-8 w-8 text-red-500 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Transaction Validation Failed</h3>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p className="text-red-700">{validationError}</p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Progress Steps */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {['validation', 'confirmation', 'processing', 'complete'].map((step, index) => (
            <div key={step} className="flex items-center">
              {getStepIcon(step, transactionStep)}
              <span className="ml-2 text-sm font-medium text-gray-700 capitalize">
                {step}
              </span>
              {index < 3 && (
                <div className="w-8 h-0.5 bg-gray-300 mx-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle Information */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">Vehicle Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <TruckIcon className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Vehicle Number</p>
              <p className="font-medium">{qrData.vehicleId}</p>
            </div>
          </div>
          <div className="flex items-center">
            <TruckIcon className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Vehicle Type</p>
              <p className="font-medium capitalize">{qrData.vehicleType}</p>
            </div>
          </div>
          <div className="flex items-center">
            <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Owner Wallet</p>
              <p className="font-medium text-xs">{qrData.walletAddress}</p>
            </div>
          </div>
          <div className="flex items-center">
            <WalletIcon className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className="font-medium">
                {balanceInfo ? `₹${parseFloat(balanceInfo.formattedBalance).toFixed(2)} (ETH equivalent)` : 'Loading...'}
              </p>
            </div>
          </div>
        </div>
        
        {/* QR Code Validation Status */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">QR Code Validation</span>
            </div>
            <div className="text-sm text-gray-600">
              <div>✓ Signature Verified</div>
              <div>✓ Timestamp Valid</div>
              <div>✓ Vehicle Registered</div>
              <div>✓ Not Blacklisted</div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Form */}
      {transactionStep === 'confirmation' && (
        <form onSubmit={handleSubmit(handleTransactionSubmit)} className="space-y-4">
          {/* Toll Amount Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h5 className="text-sm font-medium text-blue-900 mb-2">Toll Payment Summary</h5>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Vehicle Type:</span>
                <span className="font-medium capitalize">{qrData.vehicleType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Default Rate:</span>
                <span className="font-medium">₹{tollRate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current Balance:</span>
                <span className="font-medium">
                  {balanceInfo ? `₹${parseFloat(balanceInfo.formattedBalance).toFixed(2)}` : 'Loading...'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Toll Amount (₹)
            </label>
            <div className="relative">
              <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                {...register('tollAmount', {
                  required: 'Toll amount is required',
                  min: { value: 0.01, message: 'Amount must be at least ₹0.01' },
                  max: { value: 1000, message: 'Amount cannot exceed ₹1000' },
                })}
                type="number"
                step="0.01"
                min="0.01"
                max="1000"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
            {errors.tollAmount && (
              <p className="mt-1 text-sm text-red-600">{errors.tollAmount.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Default rate for {qrData.vehicleType}: ₹{tollRate}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any notes about this transaction..."
            />
          </div>

          {/* Balance Check Warning */}
          {balanceInfo && tollAmount && parseFloat(tollAmount) > parseFloat(balanceInfo.formattedBalance) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Insufficient Balance</h4>
                  <p className="text-sm text-yellow-700">
                    The user's wallet balance (₹{parseFloat(balanceInfo.formattedBalance).toFixed(2)}) 
                    is less than the required toll amount (₹{parseFloat(tollAmount).toFixed(2)}).
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !tollAmount}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Collect Toll'}
            </button>
          </div>
        </form>
      )}

      {/* Processing State */}
      {transactionStep === 'processing' && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Transaction</h3>
          <p className="text-gray-600">Please wait while we process the payment on the blockchain...</p>
        </div>
      )}

      {/* Complete State */}
      {transactionStep === 'complete' && (
        <div className="text-center py-8">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Toll Collection Successful!</h3>
          <p className="text-gray-600 mb-4">The toll payment has been successfully processed on the blockchain.</p>
          
          {/* Success Details */}
          <div className="bg-green-50 border border-green-200 rounded-md p-4 max-w-md mx-auto">
            <h5 className="text-sm font-medium text-green-900 mb-2">Transaction Details</h5>
            <div className="space-y-1 text-sm text-green-700">
              <div>Vehicle: {qrData.vehicleId}</div>
              <div>Amount: ₹{tollAmount}</div>
              <div>Status: ✅ Confirmed</div>
              <div className="text-xs text-green-600 mt-2">
                Barrier will open automatically
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                const receiptData: ReceiptData = {
                  transactionId: Date.now().toString(),
                  vehicleNumber: qrData.vehicleId,
                  vehicleType: qrData.vehicleType,
                  tollAmount: tollAmount || '0',
                  timestamp: Date.now(),
                  transactionHash: '',
                  adminWallet,
                  plazaId: qrData.plazaId,
                };
                ReceiptService.downloadReceipt(receiptData);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              📄 Download Receipt
            </button>
            <button
              onClick={() => {
                const receiptData: ReceiptData = {
                  transactionId: Date.now().toString(),
                  vehicleNumber: qrData.vehicleId,
                  vehicleType: qrData.vehicleType,
                  tollAmount: tollAmount || '0',
                  timestamp: Date.now(),
                  transactionHash: '',
                  adminWallet,
                  plazaId: qrData.plazaId,
                };
                ReceiptService.printReceipt(receiptData);
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              🖨️ Print Receipt
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Process Next Vehicle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
