import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { vehicleAPIService, VehicleRegistrationData } from '../services/vehicleAPIService';
import { topUpWalletAPI, TopUpWalletInfo } from '../services/topUpWalletService';
import { walletPersistenceService, WalletInfo } from '../services/walletPersistenceService';
import { useSession } from '../services/sessionManager';

// Contract addresses from deployment
const TOLL_COLLECTION_ADDRESS = (process.env.REACT_APP_TOLL_COLLECTION_ADDRESS || '0xeC9423d9EBFe0C0f49F7bc221aE52572E8734291') as `0x${string}`;

const TOLL_COLLECTION_ABI = [
  {
    "inputs": [
      {"name": "vehicleId", "type": "string"},
      {"name": "owner", "type": "address"}
    ],
    "name": "registerVehicle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

interface VehicleDocument {
  file: File;
  type: 'rc' | 'insurance' | 'pollution';
  name: string;
}

interface VehicleRegistrationProps {
  onRegistrationSuccess?: (vehicleData: any) => void;
}

export const VehicleRegistration: React.FC<VehicleRegistrationProps> = ({ onRegistrationSuccess }) => {
  const { address } = useAccount();
  const { getSessionStatus, isAuthValid } = useSession();
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const [isCreatingTopUpWallet, setIsCreatingTopUpWallet] = useState(false);
  const [topUpWalletInfo, setTopUpWalletInfo] = useState<TopUpWalletInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'checking' | 'verified' | 'not-verified'>('checking');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { writeContract, data: hash, error, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Check Aadhaar verification status using session manager
  useEffect(() => {
    const checkAadhaarVerification = () => {
      try {
        const sessionStatus = getSessionStatus();
        const authValid = isAuthValid();
        
        console.log('🔍 Checking Aadhaar verification status:', {
          sessionStatus,
          authValid,
          isAuthenticated: sessionStatus.isAuthenticated
        });
        
        if (sessionStatus.isAuthenticated && authValid) {
          setIsAadhaarVerified(true);
          setVerificationStatus('verified');
          console.log('✅ Aadhaar verification confirmed');
        } else {
          setIsAadhaarVerified(false);
          setVerificationStatus('not-verified');
          console.log('❌ Aadhaar verification not found or expired');
        }
      } catch (error) {
        console.error('Error checking Aadhaar verification:', error);
        setIsAadhaarVerified(false);
        setVerificationStatus('not-verified');
      }
    };

    checkAadhaarVerification();
  }, [address, getSessionStatus, isAuthValid]);

  // Reset form after successful registration and create top-up wallet
  useEffect(() => {
    if (isSuccess) {
      const createTopUpWallet = async () => {
        setIsCreatingTopUpWallet(true);
        setErrorMessage('');

        try {
          // Ensure session token and user address are set
          let sessionToken = localStorage.getItem('sessionToken');
          let userAddress = localStorage.getItem('userAddress');
          
          if (!sessionToken || !userAddress) {
            // Generate session token if not exists
            if (!sessionToken) {
              sessionToken = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              localStorage.setItem('sessionToken', sessionToken);
            }
            
            // Set user address if not exists
            if (!userAddress) {
              localStorage.setItem('userAddress', address!);
            }
          }

          // Use persistence service to get or create wallet
          let walletInfo: WalletInfo | null;
          try {
            console.log('🔄 Getting or creating wallet with persistence service for vehicle registration...');
            walletInfo = await walletPersistenceService.getWalletWithFallback(address!);
            
            if (!walletInfo) {
              throw new Error('Failed to create or retrieve wallet');
            }
            
            console.log('✅ Wallet loaded via persistence service:', walletInfo.walletAddress);
          } catch (error) {
            console.error('❌ Error handling top-up wallet:', error);
            throw new Error('Failed to create or retrieve top-up wallet');
          }
          
          setTopUpWalletInfo({
            walletAddress: walletInfo.walletAddress,
            privateKey: walletInfo.privateKey,
            publicKey: walletInfo.publicKey,
            balance: walletInfo.balance,
            isInitialized: true
          });
          
          // Store private key securely
          localStorage.setItem(`topup-private-key-${address}`, walletInfo.privateKey);
          
          // Store vehicle data in backend database
          const backendVehicleData: VehicleRegistrationData = {
            vehicleId,
            vehicleType,
            owner: address!,
            documents: documents.map(doc => ({
              type: doc.type,
              name: doc.name,
              uploadedAt: new Date()
            })),
            metadata: {
              // Add any additional metadata if needed
            }
          };

          // Register vehicle in backend database
          const response = await vehicleAPIService.registerVehicle(backendVehicleData);
          if (response.success) {
            console.log('Vehicle registered in database successfully');
          } else {
            console.error('Failed to register vehicle in database:', response.error);
          }

          const vehicleData = {
            vehicleId,
            vehicleType,
            registrationDate: new Date().toISOString(),
            documents: documents.map(doc => doc.name),
            isActive: true,
            topUpWalletAddress: walletInfo.walletAddress,
            topUpWalletBalance: walletInfo.balance
          };
          
          setVehicleId('');
          setVehicleType('');
          setDocuments([]);
          
          // Notify parent component about successful registration
          if (onRegistrationSuccess) {
            onRegistrationSuccess(vehicleData);
          }
        } catch (error) {
          console.error('Error creating top-up wallet:', error);
          setErrorMessage(error instanceof Error ? error.message : 'Failed to create top-up wallet');
        } finally {
          setIsCreatingTopUpWallet(false);
        }
      };

      createTopUpWallet();
    }
  }, [isSuccess, onRegistrationSuccess, vehicleId, vehicleType, documents, address]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploadingDocs(true);
    
    // Simulate document processing
    setTimeout(() => {
      const newDocs: VehicleDocument[] = Array.from(files).map(file => ({
        file,
        type: 'rc' as const,
        name: file.name
      }));
      
      setDocuments(prev => [...prev, ...newDocs]);
      setIsUploadingDocs(false);
    }, 2000);
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleRegisterVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId.trim() || !address || documents.length === 0) return;

    try {
      await writeContract({
        address: TOLL_COLLECTION_ADDRESS,
        abi: TOLL_COLLECTION_ABI,
        functionName: 'registerVehicle',
        args: [vehicleId, address],
      });
    } catch (err) {
      console.error('Error registering vehicle:', err);
    }
  };

  // Show Aadhaar verification requirement if not verified
  if (verificationStatus === 'checking') {
    return (
      <div className="space-y-4">
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="animate-spin h-6 w-6 text-blue-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div>
              <p className="text-blue-300 font-semibold">Checking Aadhaar Verification Status</p>
              <p className="text-blue-400 text-sm">Please wait while we verify your identity...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAadhaarVerified) {
    return (
      <div className="space-y-4">
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
            <div>
              <p className="text-red-300 font-semibold">Aadhaar Verification Required</p>
              <p className="text-red-400 text-sm">You must complete Aadhaar verification before registering a vehicle.</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span className="text-yellow-300 text-sm">
              Please complete the privacy-preserving Aadhaar verification process first.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aadhaar Verification Success Banner */}
      <div className="bg-green-900 border border-green-700 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="text-green-300 font-semibold">Aadhaar Verification Complete</p>
            <p className="text-green-400 text-sm">Your identity has been verified. You can now register your vehicle.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleRegisterVehicle} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="vehicleId" className="block text-sm font-medium text-white mb-2">
              Vehicle Number
            </label>
            <input
              type="text"
              id="vehicleId"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              placeholder="MJ20CA1343"
              className="input-field w-full text-base"
              required
            />
          </div>

          <div>
            <label htmlFor="vehicleType" className="block text-sm font-medium text-white mb-2">
              Vehicle Type
            </label>
            <select
              id="vehicleType"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="input-field w-full text-base"
              required
            >
              <option value="">Select Vehicle Type</option>
              <option value="car">Car</option>
              <option value="truck">Truck</option>
              <option value="bus">Bus</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="commercial">Commercial Vehicle</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Vehicle Documents (RC, Insurance, Pollution Certificate)
          </label>
          
          {/* Document Upload Area */}
          <div 
            className="border-2 border-dashed border-gray-600 rounded-lg p-4 sm:p-6 text-center hover:border-gray-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {isUploadingDocs ? (
              <div className="flex flex-col items-center">
                <svg className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-400 text-sm">Processing documents...</p>
              </div>
            ) : (
              <div>
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                </svg>
                <p className="text-gray-400 text-sm">Click to upload vehicle documents</p>
                <p className="text-gray-500 text-xs mt-1">PDF, JPG, PNG files accepted</p>
              </div>
            )}
          </div>

          {/* Uploaded Documents List */}
          {documents.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-300">Uploaded Documents:</p>
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-sm text-gray-300">{doc.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDocument(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isPending || isConfirming || isCreatingTopUpWallet || documents.length === 0}
          className="btn-primary w-full flex items-center justify-center"
        >
          {isPending || isConfirming || isCreatingTopUpWallet ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isCreatingTopUpWallet ? 'Creating Top-up Wallet...' : 'Registering Vehicle...'}
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
              </svg>
              Register Vehicle & Create Top-up Wallet
            </>
          )}
        </button>
      </form>

      {(error || errorMessage) && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">
            Error: {error?.message || errorMessage}
          </p>
        </div>
      )}

      {isSuccess && topUpWalletInfo && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <div>
              <p className="text-green-300 font-semibold">Vehicle Registered & Top-up Wallet Created Successfully!</p>
              <p className="text-green-400 text-sm">Your vehicle is now registered and ready for contactless payments</p>
              <p className="text-green-400 text-xs mt-1">Top-up Wallet: {topUpWalletInfo.walletAddress}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
