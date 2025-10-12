import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// Contract addresses from deployment
const TOLL_COLLECTION_ADDRESS = '0x824c0fac2b80f9de4cb0ee6aa51c96694323c2e4' as const;
const USDC_ADDRESS = '0xbe87ff9ff7a44f1aece33ba0623741faf49720ed' as const;

const TOLL_COLLECTION_ABI = [
  {
    "inputs": [
      {"name": "vehicleId", "type": "string"},
      {"name": "zkProofHash", "type": "bytes32"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "processTollPayment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const USDC_ABI = [
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

interface TollLocation {
  id: string;
  name: string;
  amount: number;
  distance: string;
}

const TOLL_LOCATIONS: TollLocation[] = [
  { id: 'delhi-mumbai', name: 'Delhi-Mumbai Expressway', amount: 150, distance: '1,400 km' },
  { id: 'bangalore-chennai', name: 'Bangalore-Chennai Highway', amount: 75, distance: '350 km' },
  { id: 'mumbai-pune', name: 'Mumbai-Pune Expressway', amount: 50, distance: '150 km' },
  { id: 'delhi-agra', name: 'Delhi-Agra Yamuna Expressway', amount: 25, distance: '200 km' },
];

export const TollPayment: React.FC = () => {
  const { address } = useAccount();
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<TollLocation | null>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [useGaslessTransaction, setUseGaslessTransaction] = useState(true);
  const [rfidDetected, setRfidDetected] = useState(false);

  // Get USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { writeContract: writeTollContract, data: tollHash, error: tollError, isPending: isTollPending } = useWriteContract();
  const { writeContract: writeUsdcContract, data: usdcHash, error: usdcError, isPending: isUsdcPending } = useWriteContract();
  
  const { isLoading: isTollConfirming, isSuccess: isTollSuccess } = useWaitForTransactionReceipt({
    hash: tollHash,
  });

  const { isLoading: isUsdcConfirming, isSuccess: isUsdcSuccess } = useWaitForTransactionReceipt({
    hash: usdcHash,
  });

  // Simulate RFID detection
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate random RFID detection
      if (Math.random() > 0.7) {
        setRfidDetected(true);
        setTimeout(() => setRfidDetected(false), 3000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const generateZKProof = async (): Promise<string> => {
    setIsGeneratingProof(true);
    
    // Simulate proof generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsGeneratingProof(false);
    
    // Return a mock proof hash
    return '0x' + Math.random().toString(16).substr(2, 64);
  };

  const handleTollPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !selectedLocation || !address) return;

    setIsProcessingPayment(true);

    try {
      // Generate ZK proof
      const zkProofHash = await generateZKProof();
      
      // Convert amount to USDC (6 decimals)
      const amountInUSDC = BigInt(Math.floor(selectedLocation.amount * 1e6));
      
      if (useGaslessTransaction) {
        // Simulate gasless transaction using paymaster
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // In a real implementation, this would use account abstraction
        // and a paymaster service to sponsor the gas fees
        console.log('Gasless transaction processed via paymaster');
      } else {
        // Regular transaction flow
        // First approve USDC spending
        await writeUsdcContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [TOLL_COLLECTION_ADDRESS, amountInUSDC],
        });

        // Wait for approval confirmation
        if (usdcHash) {
          // Process toll payment
          await writeTollContract({
            address: TOLL_COLLECTION_ADDRESS,
            abi: TOLL_COLLECTION_ABI,
            functionName: 'processTollPayment',
            args: [selectedVehicle, zkProofHash as `0x${string}`, amountInUSDC],
          });
        }
      }
      
      setIsProcessingPayment(false);
      
    } catch (err) {
      console.error('Error processing toll payment:', err);
      setIsProcessingPayment(false);
    }
  };

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return '0.00';
    return (Number(balance) / 1e6).toFixed(2);
  };

  if (!address) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Please connect your wallet to make toll payments</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* RFID Detection Status */}
      {rfidDetected && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <div>
              <p className="text-green-300 font-semibold">RFID Tag Detected</p>
              <p className="text-green-400 text-sm">Vehicle approaching toll plaza</p>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Balance */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-80">FASTag Balance</p>
            <p className="text-2xl font-bold">₹{formatBalance(usdcBalance)}</p>
            <p className="text-sm opacity-80 mt-1">USDC</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-3">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleTollPayment} className="space-y-4">
        {/* Vehicle Selection */}
        <div>
          <label htmlFor="vehicle" className="block text-sm font-medium text-white mb-2">
            Select Vehicle
          </label>
          <select
            id="vehicle"
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="input-field w-full"
            required
          >
            <option value="">Choose your vehicle</option>
            <option value="MJ20CA1343">MJ20CA1343 (Car)</option>
            <option value="DL01AB1234">DL01AB1234 (Truck)</option>
            <option value="KA03CD5678">KA03CD5678 (Bus)</option>
          </select>
        </div>

        {/* Toll Location Selection */}
        <div>
          <label className="block text-sm font-medium text-white mb-3">
            Select Toll Location
          </label>
          <div className="space-y-2">
            {TOLL_LOCATIONS.map((location) => (
              <button
                key={location.id}
                type="button"
                onClick={() => setSelectedLocation(location)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedLocation?.id === location.id
                    ? 'bg-blue-900 border-blue-600 text-blue-300'
                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{location.name}</p>
                    <p className="text-sm opacity-80">{location.distance}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">₹{location.amount}</p>
                    <p className="text-xs opacity-80">Toll Fee</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium text-white mb-3">
            Transaction Type
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                checked={useGaslessTransaction}
                onChange={() => setUseGaslessTransaction(true)}
                className="mr-3"
              />
              <div>
                <p className="text-white font-medium">Gasless Transaction</p>
                <p className="text-gray-400 text-sm">Powered by Paymaster - No gas fees</p>
              </div>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={!useGaslessTransaction}
                onChange={() => setUseGaslessTransaction(false)}
                className="mr-3"
              />
              <div>
                <p className="text-white font-medium">Regular Transaction</p>
                <p className="text-gray-400 text-sm">Standard blockchain transaction</p>
              </div>
            </label>
          </div>
        </div>

        {/* Payment Button */}
        <button
          type="submit"
          disabled={isProcessingPayment || isGeneratingProof || !selectedLocation || !selectedVehicle}
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
          ) : isProcessingPayment ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing Contactless Payment...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
              </svg>
              Pay ₹{selectedLocation?.amount || 0} Toll Fee
            </>
          )}
        </button>
      </form>

      {/* Error State */}
      {(tollError || usdcError) && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">
            Error: {tollError?.message || usdcError?.message}
          </p>
        </div>
      )}

      {/* Success State */}
      {isTollSuccess && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <div>
              <p className="text-green-300 font-semibold">Payment Successful!</p>
              <p className="text-green-400 text-sm">Contactless payment processed via RFID</p>
            </div>
          </div>
        </div>
      )}

      {/* Features Info */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3">FASTag Features</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span>Contactless payments using RFID technology</span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span>Gasless transactions powered by Paymaster</span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span>Anonymous payments with zero-knowledge proofs</span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span>Real-time transaction processing</span>
          </div>
        </div>
      </div>
    </div>
  );
};