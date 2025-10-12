import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';

// Contract addresses from deployment
const TOLL_COLLECTION_ADDRESS = '0x824c0fac2b80f9de4cb0ee6aa51c96694323c2e4' as const;

const TOLL_COLLECTION_ABI = [
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserVehicles",
    "outputs": [{"name": "", "type": "string[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "vehicleId", "type": "string"}],
    "name": "getVehicle",
    "outputs": [
      {
        "components": [
          {"name": "owner", "type": "address"},
          {"name": "vehicleId", "type": "string"},
          {"name": "isActive", "type": "bool"},
          {"name": "isBlacklisted", "type": "bool"},
          {"name": "registrationTime", "type": "uint256"},
          {"name": "lastTollTime", "type": "uint256"}
        ],
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

interface Vehicle {
  owner: string;
  vehicleId: string;
  isActive: boolean;
  isBlacklisted: boolean;
  registrationTime: bigint;
  lastTollTime: bigint;
}

export const VehicleList: React.FC = () => {
  const { address } = useAccount();
  const [, setVehicles] = useState<Vehicle[]>([]);

  // Get user's vehicle IDs
  const { data: vehicleIds } = useReadContract({
    address: TOLL_COLLECTION_ADDRESS,
    abi: TOLL_COLLECTION_ABI,
    functionName: 'getUserVehicles',
    args: address ? [address] : undefined,
  });

  // Fetch vehicle details for each vehicle ID
  useEffect(() => {
    if (vehicleIds && vehicleIds.length > 0) {
      // In a real implementation, you would fetch each vehicle's details
      // For now, we'll show a placeholder
      setVehicles([]);
    }
  }, [vehicleIds]);

  if (!address) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Please connect your wallet to view vehicles</p>
      </div>
    );
  }

  if (!vehicleIds || vehicleIds.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-800 rounded-xl mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
          </svg>
        </div>
        <p className="text-gray-400">No vehicles registered yet</p>
        <p className="text-sm text-gray-500 mt-2">
          Register a vehicle using the form above
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vehicleIds.map((vehicleId: string, index: number) => (
        <div
          key={index}
          className="bg-gray-800 border border-gray-700 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-yellow-400 rounded-lg mr-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium">
                  {vehicleId}
                </h3>
                <p className="text-sm text-gray-400">
                  Status: Active
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300">
                Registered
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
