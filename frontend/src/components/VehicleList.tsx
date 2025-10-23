import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { vehicleAPIService } from '../services/vehicleAPIService';

interface Vehicle {
  _id: string;
  vehicleId: string;
  vehicleType: string;
  owner: string;
  isActive: boolean;
  isBlacklisted: boolean;
  registrationTime: string;
  lastTollTime?: string;
  documents: Array<{
    type: string;
    name: string;
    uploadedAt: string;
    verified: boolean;
  }>;
  metadata?: {
    make?: string;
    model?: string;
    year?: number;
    color?: string;
  };
}

export const VehicleList: React.FC = () => {
  const { address } = useAccount();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch vehicles from backend API
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!address) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await vehicleAPIService.getUserVehicles(address);
        console.log('API Response:', response); // Debug log
        
        // Handle different response formats
        if (Array.isArray(response)) {
          setVehicles(response);
        } else if (response && Array.isArray(response.data)) {
          setVehicles(response.data);
        } else if (response && response.success !== false && Array.isArray(response)) {
          setVehicles(response);
        } else {
          console.warn('Unexpected response format:', response);
          setVehicles([]);
        }
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        setError('Failed to load vehicles');
        setVehicles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVehicles();
  }, [address]);

  if (!address) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Please connect your wallet to view vehicles</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-800 rounded-xl mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-gray-400">Loading vehicles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-900 rounded-xl mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
        </div>
        <p className="text-red-400">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="text-sm text-gray-500 mt-2 hover:text-gray-400 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
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
      {vehicles.filter(vehicle => vehicle && vehicle._id).map((vehicle) => (
        <div
          key={vehicle._id}
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
                  {vehicle.vehicleId || 'Unknown Vehicle ID'}
                </h3>
                <p className="text-sm text-gray-400">
                  {vehicle.vehicleType ? 
                    vehicle.vehicleType.charAt(0).toUpperCase() + vehicle.vehicleType.slice(1) : 
                    'Unknown'
                  } • 
                  {vehicle.metadata?.make && vehicle.metadata?.model ? 
                    ` ${vehicle.metadata.make} ${vehicle.metadata.model}` : 
                    ' Vehicle'
                  }
                </p>
                <p className="text-xs text-gray-500">
                  Registered: {vehicle.registrationTime ? 
                    new Date(vehicle.registrationTime).toLocaleDateString() : 
                    'Unknown Date'
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                vehicle.isBlacklisted === true
                  ? 'bg-red-900 text-red-300' 
                  : vehicle.isActive === true
                    ? 'bg-green-900 text-green-300' 
                    : 'bg-gray-900 text-gray-300'
              }`}>
                {vehicle.isBlacklisted === true ? 'Blacklisted' : 
                 vehicle.isActive === true ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
