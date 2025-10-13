import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// Contract addresses from deployment
const TOLL_COLLECTION_ADDRESS = process.env.REACT_APP_TOLL_COLLECTION_ADDRESS || '0xeC9423d9EBFe0C0f49F7bc221aE52572E8734291' as const;

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
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { writeContract, data: hash, error, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Reset form after successful registration and notify parent
  useEffect(() => {
    if (isSuccess) {
      const vehicleData = {
        vehicleId,
        vehicleType,
        registrationDate: new Date().toISOString(),
        documents: documents.map(doc => doc.name),
        isActive: true
      };
      
      setVehicleId('');
      setVehicleType('');
      setDocuments([]);
      
      // Notify parent component about successful registration
      if (onRegistrationSuccess) {
        onRegistrationSuccess(vehicleData);
      }
    }
  }, [isSuccess, onRegistrationSuccess, vehicleId, vehicleType, documents]);

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

  return (
    <div className="space-y-4">
      <form onSubmit={handleRegisterVehicle} className="space-y-4">
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
            className="input-field w-full"
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
            className="input-field w-full"
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
        
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Vehicle Documents (RC, Insurance, Pollution Certificate)
          </label>
          
          {/* Document Upload Area */}
          <div 
            className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors cursor-pointer"
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
                <svg className="animate-spin h-8 w-8 text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-400 text-sm">Processing documents...</p>
              </div>
            ) : (
              <div>
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
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
          disabled={isPending || isConfirming || documents.length === 0}
          className="btn-primary w-full flex items-center justify-center"
        >
          {isPending || isConfirming ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating FASTag Wallet...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
              </svg>
              Generate FASTag Wallet
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">
            Error: {error.message}
          </p>
        </div>
      )}

      {isSuccess && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <div>
              <p className="text-green-300 font-semibold">FASTag Wallet Created Successfully!</p>
              <p className="text-green-400 text-sm">Your vehicle is now registered and ready for contactless payments</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
