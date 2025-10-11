import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';

// Mock contract addresses
const TOLL_COLLECTION_ADDRESS = '0x...'; // Replace with actual contract address
const USDC_ADDRESS = '0x...'; // Replace with actual USDC contract address

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
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const TollPayment: React.FC = () => {
  const { address } = useAccount();
  const [vehicleId, setVehicleId] = useState('');
  const [amount, setAmount] = useState('1'); // Default 1 USDC
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

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

  const generateZKProof = async (): Promise<string> => {
    // In a real implementation, this would generate an actual ZK proof
    // using the anon-aadhaar library
    setIsGeneratingProof(true);
    
    // Simulate proof generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsGeneratingProof(false);
    
    // Return a mock proof hash
    return '0x' + Math.random().toString(16).substr(2, 64);
  };

  const handleTollPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId.trim() || !address || !amount) return;

    try {
      // First, approve USDC spending
      const amountWei = parseEther(amount);
      
      writeUsdcContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [TOLL_COLLECTION_ADDRESS, amountWei],
      });

      // Wait for approval, then process toll payment
      if (isUsdcSuccess) {
        const zkProofHash = await generateZKProof();
        
        writeTollContract({
          address: TOLL_COLLECTION_ADDRESS,
          abi: TOLL_COLLECTION_ABI,
          functionName: 'processTollPayment',
          args: [vehicleId, zkProofHash, amountWei],
        });
      }
    } catch (err) {
      console.error('Error processing toll payment:', err);
    }
  };

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return '0';
    return (Number(balance) / 1e6).toFixed(2); // Assuming 6 decimals for USDC
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">
          USDC Balance
        </h4>
        <p className="text-sm text-blue-700">
          {formatBalance(usdcBalance)} USDC
        </p>
      </div>

      <form onSubmit={handleTollPayment} className="space-y-4">
        <div>
          <label htmlFor="paymentVehicleId" className="block text-sm font-medium text-gray-700">
            Vehicle ID
          </label>
          <input
            type="text"
            id="paymentVehicleId"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            placeholder="Enter vehicle ID for toll payment"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            required
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount (USDC)
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.01"
            step="0.01"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isTollPending || isTollConfirming || isUsdcPending || isUsdcConfirming || isGeneratingProof}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingProof ? 'Generating ZK Proof...' : 
           isUsdcPending || isUsdcConfirming ? 'Approving USDC...' :
           isTollPending || isTollConfirming ? 'Processing Payment...' : 
           'Pay Toll'}
        </button>
      </form>

      {(tollError || usdcError) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">
            Error: {tollError?.message || usdcError?.message}
          </p>
        </div>
      )}

      {isTollSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-sm text-green-600">
            Toll payment processed successfully! Transaction hash: {tollHash}
          </p>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-yellow-800 mb-2">
          Privacy Protection
        </h4>
        <p className="text-sm text-yellow-700">
          Your toll payment uses zero-knowledge proofs to verify your Aadhaar identity 
          without revealing any personal information. The payment is processed anonymously 
          on the blockchain.
        </p>
      </div>
    </div>
  );
};
