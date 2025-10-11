import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';

// Mock contract addresses
const TOLL_COLLECTION_ADDRESS = '0x...'; // Replace with actual contract address

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

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
        <p className="text-gray-500">Please connect your wallet to view vehicles</p>
      </div>
    );
  }

  if (!vehicleIds || vehicleIds.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No vehicles registered yet</p>
        <p className="text-sm text-gray-400 mt-2">
          Register a vehicle using the form above
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vehicleIds.map((vehicleId, index) => (
        <div
          key={index}
          className="bg-gray-50 border border-gray-200 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Vehicle ID: {vehicleId}
              </h3>
              <p className="text-sm text-gray-500">
                Status: Active
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Registered
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
