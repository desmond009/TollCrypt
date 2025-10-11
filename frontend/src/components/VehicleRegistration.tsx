import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// Mock contract addresses - in production, these would come from environment variables
const TOLL_COLLECTION_ADDRESS = '0x...'; // Replace with actual contract address

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

export const VehicleRegistration: React.FC = () => {
  const { address } = useAccount();
  const [vehicleId, setVehicleId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { writeContract, data: hash, error, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleRegisterVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId.trim() || !address) return;

    setIsLoading(true);
    try {
      writeContract({
        address: TOLL_COLLECTION_ADDRESS,
        abi: TOLL_COLLECTION_ABI,
        functionName: 'registerVehicle',
        args: [vehicleId, address],
      });
    } catch (err) {
      console.error('Error registering vehicle:', err);
    } finally {
      setIsLoading(false);
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
          <label className="block text-sm font-medium text-white mb-2">
            Vehicle ID Proof
          </label>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
            </svg>
            <p className="text-gray-400 text-sm">Upload Vehicle Documents</p>
            <p className="text-gray-500 text-xs mt-1">Please upload your ID proof with latest details</p>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isPending || isConfirming || isLoading}
          className="btn-primary w-full"
        >
          {isPending || isConfirming ? 'Registering...' : 'Create Wallet'}
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
          <p className="text-sm text-green-300">
            Vehicle registered successfully! Transaction hash: {hash}
          </p>
        </div>
      )}
    </div>
  );
};
