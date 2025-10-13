import React, { useState } from 'react';
import { QRCodeGenerator } from './QRCodeGenerator';
import { QRCodeScanner } from './QRCodeScanner';
import { TollPaymentProcessor } from './TollPaymentProcessor';
import { QRCodeData, QRCodeResult } from '../services/qrService';

type PaymentMode = 'user' | 'admin';

export const TollPayment: React.FC = () => {
  const [mode, setMode] = useState<PaymentMode>('user');
  const [scannedQRData, setScannedQRData] = useState<QRCodeData | null>(null);
  const [generatedQRResult, setGeneratedQRResult] = useState<QRCodeResult | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [error, setError] = useState<string>('');

  const handleQRScanned = (qrData: QRCodeData) => {
    setScannedQRData(qrData);
    setIsProcessingPayment(true);
    setError('');
  };

  const handleQRGenerated = (qrResult: QRCodeResult) => {
    setGeneratedQRResult(qrResult);
  };

  const handlePaymentComplete = (transactionHash: string) => {
    setPaymentComplete(true);
    setIsProcessingPayment(false);
    console.log('Payment completed with hash:', transactionHash);
  };

  const handlePaymentError = (error: string) => {
    setError(error);
    setIsProcessingPayment(false);
  };

  const handleCancel = () => {
    setScannedQRData(null);
    setIsProcessingPayment(false);
    setPaymentComplete(false);
    setError('');
  };

  const resetFlow = () => {
    setScannedQRData(null);
    setGeneratedQRResult(null);
    setIsProcessingPayment(false);
    setPaymentComplete(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            QR Code-Based Toll Payment
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Generate QR codes for toll payment or scan QR codes at toll plazas
          </p>
        </div>

        {/* Mode Selection */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-md p-1">
            <button
              onClick={() => {
                setMode('user');
                resetFlow();
              }}
              className={`px-6 py-2 rounded-md transition-colors ${
                mode === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              User Mode
            </button>
            <button
              onClick={() => {
                setMode('admin');
                resetFlow();
              }}
              className={`px-6 py-2 rounded-md transition-colors ${
                mode === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Admin Mode
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Error:</span>
            </div>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {paymentComplete && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Success!</span>
            </div>
            <p className="mt-1">Toll payment has been processed successfully.</p>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Mode - QR Code Generation */}
          {mode === 'user' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Generate QR Code for Toll Payment
                </h2>
                <QRCodeGenerator
                  onQRGenerated={handleQRGenerated}
                />
              </div>

              {/* Generated QR Code Display */}
              {generatedQRResult && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Your QR Code
                  </h3>
                  <div className="text-center">
                    <img
                      src={generatedQRResult.dataUrl}
                      alt="Generated QR Code"
                      className="w-48 h-48 mx-auto mb-4 border-2 border-gray-200 rounded-lg"
                    />
                    <p className="text-sm text-gray-600 mb-4">
                      Show this QR code at the toll plaza for payment
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.download = 'toll-qr-code.png';
                          link.href = generatedQRResult.dataUrl;
                          link.click();
                        }}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Download QR Code
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(generatedQRResult.qrData))}
                        className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Copy QR Data
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin Mode - QR Code Scanning */}
          {mode === 'admin' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Scan QR Code at Toll Plaza
                </h2>
                <QRCodeScanner
                  onQRScanned={handleQRScanned}
                  onError={setError}
                  isScanning={!isProcessingPayment}
                />
              </div>
            </div>
          )}

          {/* Payment Processing */}
          {isProcessingPayment && scannedQRData && (
            <div className="lg:col-span-2">
              <TollPaymentProcessor
                qrData={scannedQRData}
                onPaymentComplete={handlePaymentComplete}
                onPaymentError={handlePaymentError}
                onCancel={handleCancel}
              />
            </div>
          )}

          {/* Instructions Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              How It Works
            </h2>
            
            {mode === 'user' ? (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Login & Register Vehicle</h3>
                    <p className="text-sm text-gray-600">Login with Anon-Aadhaar and register your vehicle</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Top-up Wallet</h3>
                    <p className="text-sm text-gray-600">Add funds to your FASTag wallet for toll payments</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Generate QR Code</h3>
                    <p className="text-sm text-gray-600">Generate a unique QR code linked to your wallet and vehicle</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Show at Toll Plaza</h3>
                    <p className="text-sm text-gray-600">Show the QR code to the toll plaza scanner</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Start Camera</h3>
                    <p className="text-sm text-gray-600">Enable camera to scan QR codes from users</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Scan QR Code</h3>
                    <p className="text-sm text-gray-600">Scan the QR code shown by the user</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Verify & Process</h3>
                    <p className="text-sm text-gray-600">Verify vehicle registration and process payment</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Record Transaction</h3>
                    <p className="text-sm text-gray-600">Transaction is recorded on blockchain</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Key Features:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Privacy-preserving with Anon-Aadhaar</li>
                <li>• Blockchain-based transaction recording</li>
                <li>• Real-time payment processing</li>
                <li>• Secure QR code generation</li>
                <li>• Automatic wallet deduction</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};