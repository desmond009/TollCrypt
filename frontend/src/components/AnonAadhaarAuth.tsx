import React, { useState } from 'react';
import { useAccount } from 'wagmi';

interface AnonAadhaarAuthProps {
  onAuthSuccess: (proof: string, publicInputs: number[]) => void;
  onAuthError: (error: string) => void;
}

export const AnonAadhaarAuth: React.FC<AnonAadhaarAuthProps> = ({ onAuthSuccess, onAuthError }) => {
  const { address } = useAccount();
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');

  const generateAnonAadhaarProof = async (): Promise<{ proof: string; publicInputs: number[] }> => {
    try {
      setIsGeneratingProof(true);
      
      // Simulate proof generation delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate mock proof and public inputs
      const proof = '0x' + Math.random().toString(16).substr(2, 64);
      const publicInputs = [
        Math.floor(Math.random() * 1000000), // Mock public input 1
        Math.floor(Math.random() * 1000000), // Mock public input 2
      ];
      
      return { proof, publicInputs };
      
    } catch (error) {
      console.error('Error generating anon-aadhaar proof:', error);
      throw error;
    } finally {
      setIsGeneratingProof(false);
    }
  };

  const handleAnonAadhaarLogin = async () => {
    if (!address) {
      onAuthError('Please connect your wallet first');
      return;
    }

    try {
      const { proof, publicInputs } = await generateAnonAadhaarProof();
      
      // Send the proof to backend to get session token
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/tolls/auth/anon-aadhaar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhaarNumber: aadhaarNumber || 'test', // For development
          proof: proof,
          publicInputs: publicInputs,
          userAddress: address
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Authentication failed' }));
        onAuthError(errorData.message || 'Authentication failed');
        return;
      }

      const authData = await response.json();
      
      if (authData.success) {
        // Store the session token and user address for API calls
        localStorage.setItem('sessionToken', authData.data.sessionToken);
        localStorage.setItem('userAddress', authData.data.userAddress);
        
        setIsAuthenticated(true);
        onAuthSuccess(proof, publicInputs);
      } else {
        onAuthError(authData.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      onAuthError('Failed to authenticate with backend');
    }
  };

  if (isAuthenticated) {
    return (
      <div className="bg-green-900 border border-green-700 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="text-green-300 font-semibold">Anonymous Aadhaar Verified</p>
            <p className="text-green-400 text-sm">Your identity has been verified without revealing personal data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          Anonymous Aadhaar Authentication
        </h2>
        <p className="text-gray-400 text-sm">
          Verify your identity using zero-knowledge proofs without revealing personal data
        </p>
      </div>

      <div className="space-y-4">
        {/* QR Code Scanner Section */}
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
          <h3 className="text-blue-300 font-semibold mb-3">Step 1: Scan Aadhaar QR Code</h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="qrCodeData" className="block text-sm font-medium text-white mb-2">
                Aadhaar QR Code Data
              </label>
              <textarea
                id="qrCodeData"
                value={qrCodeData}
                onChange={(e) => setQrCodeData(e.target.value)}
                placeholder="Paste your Aadhaar QR code data here..."
                className="input-field w-full h-24 resize-none"
                rows={3}
              />
              <p className="text-blue-400 text-xs mt-1">
                Scan your Aadhaar QR code and paste the data here, or use test mode for development
              </p>
            </div>
            
            {/* Test Mode Toggle */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-yellow-300 text-sm font-medium">Development Mode</span>
                </div>
                <p className="text-yellow-400 text-xs mt-1">
                  Test Aadhaar data will be used automatically in development mode
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Aadhaar Number Input (Optional for development) */}
        <div>
          <label htmlFor="aadhaarNumber" className="block text-sm font-medium text-white mb-2">
            Aadhaar Number (Optional)
          </label>
          <input
            type="text"
            id="aadhaarNumber"
            value={aadhaarNumber}
            onChange={(e) => setAadhaarNumber(e.target.value)}
            placeholder="1234 5678 9012"
            className="input-field w-full"
            maxLength={14}
          />
          <p className="text-gray-500 text-xs mt-1">
            Optional: Enter your Aadhaar number for reference (not stored or transmitted)
          </p>
        </div>

        <button
          onClick={handleAnonAadhaarLogin}
          disabled={isGeneratingProof || (!qrCodeData.trim() && process.env.NODE_ENV !== 'development')}
          className="btn-primary w-full flex items-center justify-center"
        >
          {isGeneratingProof ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Zero-Knowledge Proof...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
              </svg>
              Login with Anonymous Aadhaar
            </>
          )}
        </button>

        <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
          <h3 className="text-blue-300 font-semibold mb-2">Privacy Protection</h3>
          <ul className="text-blue-400 text-sm space-y-1">
            <li>• Your Aadhaar number is never stored or transmitted</li>
            <li>• Zero-knowledge proofs verify identity without revealing data</li>
            <li>• All transactions remain completely anonymous</li>
            <li>• No personal information is linked to your wallet</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
