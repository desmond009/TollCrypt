import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// USDC Contract (Polygon Mumbai Testnet) - Valid contract address
const USDC_ADDRESS = '0x0FA8781a83E46826621b3DC094Fa0e9C4C8d9Cc6' as const;

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
      {"name": "to", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
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

interface TopUpOption {
  amount: string;
  label: string;
  description: string;
}

const TOP_UP_OPTIONS: TopUpOption[] = [
  { amount: '10', label: '₹10', description: 'Quick top-up' },
  { amount: '50', label: '₹50', description: 'Small trip' },
  { amount: '100', label: '₹100', description: 'City travel' },
  { amount: '500', label: '₹500', description: 'Long journey' },
  { amount: '1000', label: '₹1000', description: 'Monthly pass' },
];

const formatCryptoAmount = (amount: string) => {
  return `${amount} USDC`;
};

export const WalletTopUp: React.FC = () => {
  const { address } = useAccount();
  const [selectedAmount, setSelectedAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'fiat' | 'crypto'>('crypto');

  // Get USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { writeContract, data: hash, error, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return '0.00';
    return (Number(balance) / 1e6).toFixed(2); // USDC has 6 decimals
  };

  const handleTopUp = async (amount: string) => {
    if (!address || !amount) return;

    setIsProcessing(true);
    
    try {
      if (paymentMethod === 'crypto') {
        // Convert amount to USDC (6 decimals)
        const amountInUSDC = BigInt(Math.floor(parseFloat(amount) * 1e6));
        
        // Check if user has enough USDC balance
        if (usdcBalance && usdcBalance < amountInUSDC) {
          alert(`Insufficient USDC balance. You have ${formatBalance(usdcBalance)} USDC but need ${amount} USDC.`);
          setIsProcessing(false);
          return;
        }

        // Transfer USDC to the FASTag contract
        // Note: In a real implementation, you would transfer to a specific FASTag contract address
        // For now, we'll simulate the transfer
        writeContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'transfer',
          args: [address, amountInUSDC], // Transfer to self for demo
        });
        
      } else {
        // Fiat payment simulation
        await new Promise(resolve => setTimeout(resolve, 2000));
        alert(`Successfully topped up ₹${amount} to your FASTag wallet!`);
        setIsProcessing(false);
      }
      
    } catch (err) {
      console.error('Error topping up wallet:', err);
      setIsProcessing(false);
    }
  };

  const handleCustomTopUp = () => {
    if (customAmount && parseFloat(customAmount) > 0) {
      handleTopUp(customAmount);
    }
  };

  if (!address) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Please connect your wallet to top up your FASTag balance</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Balance */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-80">FASTag Balance</p>
            <p className="text-2xl font-bold">₹{formatBalance(usdcBalance)}</p>
            <p className="text-sm opacity-80 mt-1">USDC</p>
            <p className="text-xs opacity-60 mt-1">Your Wallet USDC: {formatBalance(usdcBalance)} USDC</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-3">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Payment Method Selector */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Choose Payment Method</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPaymentMethod('crypto')}
            className={`p-4 rounded-lg border transition-colors ${
              paymentMethod === 'crypto'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium">Crypto Wallet</p>
                <p className="text-sm opacity-80">USDC</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setPaymentMethod('fiat')}
            className={`p-4 rounded-lg border transition-colors ${
              paymentMethod === 'fiat'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium">Fiat Payment</p>
                <p className="text-sm opacity-80">Card, UPI, Net Banking</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Quick Top-up Options */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Quick Top-up</h3>
        <div className="grid grid-cols-2 gap-3">
          {TOP_UP_OPTIONS.map((option) => (
            <button
              key={option.amount}
              onClick={() => handleTopUp(option.amount)}
              disabled={isProcessing}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg p-4 text-left transition-colors disabled:opacity-50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-semibold">
                    {paymentMethod === 'crypto' ? formatCryptoAmount(option.amount) : option.label}
                  </p>
                  <p className="text-gray-400 text-sm">{option.description}</p>
                  {paymentMethod === 'crypto' && (
                    <p className="text-gray-500 text-xs mt-1">≈ {option.label}</p>
                  )}
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Amount */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Custom Amount</h3>
        <div className="space-y-3">
          <div className="flex">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                {paymentMethod === 'crypto' ? 'USDC' : '₹'}
              </span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                className="input-field w-full pl-12"
                min="1"
                step="0.01"
              />
            </div>
            <button
              onClick={handleCustomTopUp}
              disabled={isProcessing || !customAmount || parseFloat(customAmount) <= 0}
              className="btn-primary ml-3 px-6 disabled:opacity-50"
            >
              Top Up
            </button>
          </div>
          <p className="text-gray-500 text-sm">
            Minimum top-up amount: {paymentMethod === 'crypto' ? '1 USDC' : '₹1.00'}
          </p>
          {paymentMethod === 'crypto' && customAmount && (
            <p className="text-gray-400 text-sm">
              ≈ ₹{customAmount} (1 USDC = ₹1)
            </p>
          )}
        </div>
      </div>

      {/* Payment Methods */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Payment Methods</h3>
        <div className="space-y-3">
          {/* Crypto Payment Method */}
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Crypto Wallet</p>
                <p className="text-gray-400 text-sm">USDC, Direct Transfer</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-green-400 text-sm mr-2">Available</span>
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Credit/Debit Card</p>
                <p className="text-gray-400 text-sm">Visa, Mastercard, RuPay</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
            </svg>
          </div>

          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">UPI</p>
                <p className="text-gray-400 text-sm">PhonePe, Google Pay, Paytm</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
            </svg>
          </div>

          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Net Banking</p>
                <p className="text-gray-400 text-sm">All major banks</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="animate-spin h-5 w-5 text-blue-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-blue-300">
              {paymentMethod === 'crypto' ? 'Processing crypto transaction...' : 'Processing payment...'}
            </p>
          </div>
          {paymentMethod === 'crypto' && hash && (
            <div className="mt-3 text-sm text-blue-200">
              <p>Transaction Hash: {hash.slice(0, 10)}...{hash.slice(-8)}</p>
              <p>Status: {isConfirming ? 'Confirming...' : isSuccess ? 'Confirmed!' : 'Pending'}</p>
            </div>
          )}
        </div>
      )}

      {/* Success State */}
      {isSuccess && paymentMethod === 'crypto' && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <p className="text-green-300">Crypto top-up successful!</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">
            Error: {error.message}
          </p>
        </div>
      )}
    </div>
  );
};
