import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useSession } from '../services/sessionManager';

// Contract addresses from deployment
const TOLL_COLLECTION_ADDRESS = '0x824c0fac2b80f9de4cb0ee6aa51c96694323c2e4' as const;

const TOLL_COLLECTION_ABI = [
  {
    "inputs": [
      {"name": "vehicleId", "type": "string"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "processTollPayment",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

interface TollPlaza {
  id: string;
  name: string;
  location: string;
  baseRate: number;
}

interface TollTransaction {
  id: string;
  vehicleId: string;
  plazaId: string;
  amount: number;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export const TollDeduction: React.FC = () => {
  const { address } = useAccount();
  const { getSession, getSessionStatus } = useSession();
  
  const [isScanning, setIsScanning] = useState(false);
  const [detectedVehicle, setDetectedVehicle] = useState<string | null>(null);
  const [selectedPlaza, setSelectedPlaza] = useState<TollPlaza | null>(null);
  const [tollAmount, setTollAmount] = useState<number>(0);
  const [transaction, setTransaction] = useState<TollTransaction | null>(null);
  
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Mock toll plazas
  const tollPlazas: TollPlaza[] = [
    { id: '1', name: 'Delhi-Mumbai Expressway', location: 'Delhi', baseRate: 150 },
    { id: '2', name: 'Chennai-Bangalore Highway', location: 'Chennai', baseRate: 120 },
    { id: '3', name: 'Kolkata-Durgapur Expressway', location: 'Kolkata', baseRate: 100 },
    { id: '4', name: 'Pune-Mumbai Expressway', location: 'Pune', baseRate: 180 },
  ];

  const session = getSession();
  const sessionStatus = getSessionStatus();

  // Calculate toll amount based on vehicle type and plaza
  useEffect(() => {
    if (detectedVehicle && selectedPlaza) {
      const vehicle = session?.vehicles.find(v => v.vehicleId === detectedVehicle);
      if (vehicle) {
        let multiplier = 1;
        switch (vehicle.vehicleType) {
          case 'car':
            multiplier = 1;
            break;
          case 'truck':
            multiplier = 2.5;
            break;
          case 'bus':
            multiplier = 2;
            break;
          case 'motorcycle':
            multiplier = 0.5;
            break;
          case 'commercial':
            multiplier = 3;
            break;
          default:
            multiplier = 1;
        }
        setTollAmount(Math.round(selectedPlaza.baseRate * multiplier));
      }
    }
  }, [detectedVehicle, selectedPlaza, session]);

  // Handle RFID detection simulation
  const simulateRFIDDetection = () => {
    setIsScanning(true);
    
    // Simulate RFID scan delay
    setTimeout(() => {
      if (session?.vehicles && session.vehicles.length > 0) {
        const randomVehicle = session.vehicles[Math.floor(Math.random() * session.vehicles.length)];
        setDetectedVehicle(randomVehicle.vehicleId);
        setIsScanning(false);
      } else {
        setIsScanning(false);
        alert('No registered vehicles found. Please register a vehicle first.');
      }
    }, 2000);
  };

  // Process toll payment
  const handleTollPayment = async () => {
    if (!detectedVehicle || !selectedPlaza || !address) return;

    const transactionData: TollTransaction = {
      id: `tx_${Date.now()}`,
      vehicleId: detectedVehicle,
      plazaId: selectedPlaza.id,
      amount: tollAmount,
      timestamp: Date.now(),
      status: 'processing'
    };

    setTransaction(transactionData);

    try {
      await writeContract({
        address: TOLL_COLLECTION_ADDRESS,
        abi: TOLL_COLLECTION_ABI,
        functionName: 'processTollPayment',
        args: [detectedVehicle, BigInt(tollAmount * 100)], // Convert to wei (assuming 2 decimals)
        value: BigInt(tollAmount * 100), // Pay the toll amount
      });
    } catch (err) {
      console.error('Error processing toll payment:', err);
      setTransaction(prev => prev ? { ...prev, status: 'failed' } : null);
    }
  };

  // Handle successful payment
  useEffect(() => {
    if (isSuccess && transaction) {
      setTransaction(prev => prev ? { ...prev, status: 'completed' } : null);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setDetectedVehicle(null);
        setSelectedPlaza(null);
        setTollAmount(0);
        setTransaction(null);
      }, 3000);
    }
  }, [isSuccess, transaction]);

  // Check if user is ready for toll payment
  if (!sessionStatus.isAuthenticated) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-4">Toll Payment</h2>
        <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <div>
              <p className="text-yellow-300 font-semibold">Authentication Required</p>
              <p className="text-yellow-400 text-sm">Please authenticate to use toll payment services.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionStatus.hasVehicles) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-4">Toll Payment</h2>
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            <div>
              <p className="text-blue-300 font-semibold">No Vehicles Registered</p>
              <p className="text-blue-400 text-sm">Please register a vehicle to use toll payment services.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* RFID Detection */}
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-4">RFID Vehicle Detection</h2>
        
        {!detectedVehicle ? (
          <div className="text-center py-8">
            <div className="w-24 h-24 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
              {isScanning ? (
                <svg className="animate-spin h-12 w-12 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-2">
              {isScanning ? 'Scanning for RFID...' : 'Ready to Scan'}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {isScanning ? 'Please wait while we detect your vehicle...' : 'Click to simulate RFID detection'}
            </p>
            
            <button
              onClick={simulateRFIDDetection}
              disabled={isScanning}
              className="btn-primary"
            >
              {isScanning ? 'Scanning...' : 'Simulate RFID Detection'}
            </button>
          </div>
        ) : (
          <div className="bg-green-900 border border-green-700 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <div>
                <p className="text-green-300 font-semibold">Vehicle Detected!</p>
                <p className="text-green-400 text-sm">Vehicle ID: {detectedVehicle}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toll Plaza Selection */}
      {detectedVehicle && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Select Toll Plaza</h3>
          <div className="grid grid-cols-1 gap-3">
            {tollPlazas.map((plaza) => (
              <button
                key={plaza.id}
                onClick={() => setSelectedPlaza(plaza)}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  selectedPlaza?.id === plaza.id
                    ? 'bg-yellow-900 border-yellow-700 text-yellow-300'
                    : 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{plaza.name}</p>
                    <p className="text-sm opacity-80">{plaza.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{plaza.baseRate}</p>
                    <p className="text-xs opacity-80">base rate</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toll Calculation and Payment */}
      {detectedVehicle && selectedPlaza && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Toll Payment</h3>
          
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Vehicle:</span>
                <span className="text-white font-mono">{detectedVehicle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Plaza:</span>
                <span className="text-white">{selectedPlaza.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Vehicle Type:</span>
                <span className="text-white capitalize">
                  {session?.vehicles.find(v => v.vehicleId === detectedVehicle)?.vehicleType}
                </span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span className="text-white">Total Amount:</span>
                <span className="text-yellow-400">₹{tollAmount}</span>
              </div>
            </div>
          </div>

          {transaction ? (
            <div className={`rounded-lg p-4 ${
              transaction.status === 'completed' ? 'bg-green-900 border border-green-700' :
              transaction.status === 'failed' ? 'bg-red-900 border border-red-700' :
              'bg-blue-900 border border-blue-700'
            }`}>
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  {transaction.status === 'completed' ? (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  ) : transaction.status === 'failed' ? (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  ) : (
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                  )}
                </svg>
                <div>
                  <p className={`font-semibold ${
                    transaction.status === 'completed' ? 'text-green-300' :
                    transaction.status === 'failed' ? 'text-red-300' :
                    'text-blue-300'
                  }`}>
                    {transaction.status === 'completed' ? 'Payment Successful!' :
                     transaction.status === 'failed' ? 'Payment Failed' :
                     'Processing Payment...'}
                  </p>
                  <p className={`text-sm ${
                    transaction.status === 'completed' ? 'text-green-400' :
                    transaction.status === 'failed' ? 'text-red-400' :
                    'text-blue-400'
                  }`}>
                    {transaction.status === 'completed' ? 'Your toll payment has been processed successfully.' :
                     transaction.status === 'failed' ? 'There was an error processing your payment.' :
                     'Please wait while we process your payment...'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleTollPayment}
              disabled={isPending || isConfirming}
              className="btn-primary w-full"
            >
              {isPending || isConfirming ? 'Processing...' : `Pay ₹${tollAmount}`}
            </button>
          )}

          {error && (
            <div className="mt-4 bg-red-900 border border-red-700 rounded-lg p-4">
              <p className="text-sm text-red-300">
                Error: {error.message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
