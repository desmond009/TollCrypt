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
        address: USDC_ADDRESS as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [TOLL_COLLECTION_ADDRESS as `0x${string}`, amountWei],
      });

      // Wait for approval, then process toll payment
      if (isUsdcSuccess) {
        const zkProofHash = await generateZKProof();
        
        writeTollContract({
          address: TOLL_COLLECTION_ADDRESS as `0x${string}`,
          abi: TOLL_COLLECTION_ABI,
          functionName: 'processTollPayment',
          args: [vehicleId, zkProofHash as `0x${string}`, amountWei],
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
    <div className="space-y-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-2">
          USDC Balance
        </h4>
        <p className="text-lg font-semibold text-yellow-400">
          {formatBalance(usdcBalance)} USDC
        </p>
      </div>

      <form onSubmit={handleTollPayment} className="space-y-4">
        <div>
          <label htmlFor="paymentVehicleId" className="block text-sm font-medium text-white mb-2">
            Vehicle ID
          </label>
          <input
            type="text"
            id="paymentVehicleId"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            placeholder="MJ20CA1343"
            className="input-field w-full"
            required
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-white mb-2">
            Amount (USDC)
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.01"
            step="0.01"
            className="input-field w-full"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isTollPending || isTollConfirming || isUsdcPending || isUsdcConfirming || isGeneratingProof}
          className="btn-primary w-full"
        >
          {isGeneratingProof ? 'Generating ZK Proof...' : 
           isUsdcPending || isUsdcConfirming ? 'Approving USDC...' :
           isTollPending || isTollConfirming ? 'Processing Payment...' : 
           'Pay Toll'}
        </button>
      </form>

      {(tollError || usdcError) && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">
            Error: {tollError?.message || usdcError?.message}
          </p>
        </div>
      )}

      {isTollSuccess && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-4">
          <p className="text-sm text-green-300">
            Toll payment processed successfully! Transaction hash: {tollHash}
          </p>
        </div>
      )}
    </div>
  );
};
