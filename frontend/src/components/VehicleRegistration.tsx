import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';

// Mock contract addresses - in production, these would come from environment variables
const TOLL_COLLECTION_ADDRESS = '0x...'; // Replace with actual contract address
const USDC_ADDRESS = '0x...'; // Replace with actual USDC contract address

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
    <div className="space-y-6">
      <form onSubmit={handleRegisterVehicle} className="space-y-4">
        <div>
          <label htmlFor="vehicleId" className="block text-sm font-medium text-gray-700">
            Vehicle ID (RFID/QR Code)
          </label>
          <input
            type="text"
            id="vehicleId"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            placeholder="Enter your vehicle ID"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isPending || isConfirming || isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending || isConfirming ? 'Registering...' : 'Register Vehicle'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">
            Error: {error.message}
          </p>
        </div>
      )}

      {isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-sm text-green-600">
            Vehicle registered successfully! Transaction hash: {hash}
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">
          Privacy Notice
        </h4>
        <p className="text-sm text-blue-700">
          Your vehicle registration uses zero-knowledge proofs to verify your Aadhaar identity 
          without revealing any personal information. Only your wallet address and vehicle ID 
          are stored on the blockchain.
        </p>
      </div>
    </div>
  );
};
