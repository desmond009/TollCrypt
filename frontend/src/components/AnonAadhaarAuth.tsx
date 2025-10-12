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

  const generateAnonAadhaarProof = async (): Promise<{ proof: string; publicInputs: number[] }> => {
    // In a real implementation, this would use the anon-aadhaar library
    // to generate a zero-knowledge proof that proves Aadhaar ownership
    // without revealing the actual Aadhaar number
    
    setIsGeneratingProof(true);
    
    // Simulate proof generation delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsGeneratingProof(false);
    
    // Generate mock proof and public inputs
    const proof = '0x' + Math.random().toString(16).substr(2, 64);
    const publicInputs = [
      Math.floor(Math.random() * 1000000), // Mock public input 1
      Math.floor(Math.random() * 1000000), // Mock public input 2
    ];
    
    return { proof, publicInputs };
  };

  const handleAnonAadhaarLogin = async () => {
    if (!aadhaarNumber.trim()) {
      onAuthError('Please enter your Aadhaar number');
      return;
    }

    if (!address) {
      onAuthError('Please connect your wallet first');
      return;
    }

    try {
      const { proof, publicInputs } = await generateAnonAadhaarProof();
      setIsAuthenticated(true);
      onAuthSuccess(proof, publicInputs);
    } catch (error) {
      onAuthError('Failed to generate anonymous Aadhaar proof');
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
        <div>
          <label htmlFor="aadhaarNumber" className="block text-sm font-medium text-white mb-2">
            Aadhaar Number
          </label>
          <input
            type="text"
            id="aadhaarNumber"
            value={aadhaarNumber}
            onChange={(e) => setAadhaarNumber(e.target.value)}
            placeholder="1234 5678 9012"
            className="input-field w-full"
            maxLength={14}
            required
          />
          <p className="text-gray-500 text-xs mt-1">
            Your Aadhaar number will be used to generate a zero-knowledge proof but will not be stored or transmitted
          </p>
        </div>

        <button
          onClick={handleAnonAadhaarLogin}
          disabled={isGeneratingProof || !aadhaarNumber.trim()}
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
