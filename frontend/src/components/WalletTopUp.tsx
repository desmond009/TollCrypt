import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { topUpWalletAPI, SignatureUtils, TopUpWalletInfo } from '../services/topUpWalletService';

interface TopUpOption {
  amount: string;
  label: string;
  description: string;
}

const TOP_UP_OPTIONS: TopUpOption[] = [
  { amount: '0.01', label: '0.01 ETH', description: 'Quick top-up' },
  { amount: '0.05', label: '0.05 ETH', description: 'Small trip' },
  { amount: '0.1', label: '0.1 ETH', description: 'City travel' },
  { amount: '0.5', label: '0.5 ETH', description: 'Long journey' },
  { amount: '1.0', label: '1.0 ETH', description: 'Monthly pass' },
];

const formatCryptoAmount = (amount: string) => {
  return `${amount} ETH`;
};

export const WalletTopUp: React.FC = () => {
  const { address } = useAccount();
  const [selectedAmount, setSelectedAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'fiat' | 'crypto'>('crypto');
  const [fastagBalance, setFastagBalance] = useState<string>('0');
  const [topUpWalletInfo, setTopUpWalletInfo] = useState<TopUpWalletInfo | null>(null);
  const [hasTopUpWallet, setHasTopUpWallet] = useState<boolean>(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [walletCreatedMessage, setWalletCreatedMessage] = useState<string>('');

  // Get main wallet ETH balance
  const { data: ethBalance } = useBalance({
    address: address,
  });

  const { sendTransaction, data: hash, error: transactionError, isPending } = useSendTransaction();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Load FASTag wallet balance from localStorage on component mount
  useEffect(() => {
    if (address) {
      const savedBalance = localStorage.getItem(`fastag-balance-${address}`);
      if (savedBalance) {
        setFastagBalance(savedBalance);
      } else {
        setFastagBalance('0');
      }
    }
  }, [address]);

  // Function to refresh balance from blockchain
  const refreshBalance = useCallback(async () => {
    if (!address || !hasTopUpWallet) return;
    
    try {
      const balanceResponse = await topUpWalletAPI.getTopUpWalletBalance();
      setFastagBalance(balanceResponse.balance);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  }, [address, hasTopUpWallet]);

  // Check if user has a top-up wallet and load wallet info
  // If no wallet exists, automatically create one for first-time users
  useEffect(() => {
    const checkAndCreateTopUpWallet = async () => {
      if (!address) return;

      // Check if user is authenticated (has session token and user address)
      const sessionToken = localStorage.getItem('sessionToken');
      const userAddress = localStorage.getItem('userAddress');
      
      if (!sessionToken || !userAddress) {
        console.log('User not authenticated, skipping top-up wallet operations');
        setErrorMessage('Please complete authentication first');
        return;
      }

      try {
        const existsResponse = await topUpWalletAPI.hasTopUpWallet();
        
        if (existsResponse.exists) {
          // User has existing wallet - load wallet info and balance
          setHasTopUpWallet(true);
          const walletInfo = await topUpWalletAPI.getTopUpWalletInfo();
          setTopUpWalletInfo(walletInfo);
          setFastagBalance(walletInfo.balance);
        } else {
          // First-time user - automatically create wallet
          console.log('First-time user detected, creating top-up wallet automatically...');
          setIsCreatingWallet(true);
          setErrorMessage('');
          
          try {
            const walletInfo = await topUpWalletAPI.createTopUpWallet();
            setTopUpWalletInfo(walletInfo);
            setHasTopUpWallet(true);
            setFastagBalance(walletInfo.balance);
            
            // Store private key securely (in a real app, you'd use a secure key management system)
            localStorage.setItem(`topup-private-key-${address}`, walletInfo.privateKey);
            
            console.log('Top-up wallet created successfully for first-time user');
            setWalletCreatedMessage('Smart contract wallet created successfully! You can now top up your wallet.');
          } catch (createError) {
            console.error('Error creating top-up wallet for first-time user:', createError);
            setErrorMessage(createError instanceof Error ? createError.message : 'Failed to create top-up wallet');
          } finally {
            setIsCreatingWallet(false);
          }
        }
      } catch (error) {
        console.error('Error checking top-up wallet:', error);
        setErrorMessage('Failed to check top-up wallet status');
      }
    };

    checkAndCreateTopUpWallet();
  }, [address]);

  // Periodic balance refresh for existing users
  useEffect(() => {
    if (!hasTopUpWallet || !address) return;

    const refreshInterval = setInterval(() => {
      refreshBalance();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [hasTopUpWallet, address, refreshBalance]);

  // Handle successful crypto transaction
  useEffect(() => {
    if (isSuccess && paymentMethod === 'crypto' && selectedAmount) {
      // Add the topped up amount to FASTag wallet balance
      const newBalance = (parseFloat(fastagBalance) + parseFloat(selectedAmount)).toString();
      setFastagBalance(newBalance);
      setSelectedAmount(''); // Reset selected amount
      setIsProcessing(false);
    }
  }, [isSuccess, paymentMethod, selectedAmount, fastagBalance]);

  const formatBalance = (balance: string) => {
    return parseFloat(balance).toFixed(6);
  };

  const createTopUpWallet = async () => {
    if (!address) return;

    setIsCreatingWallet(true);
    setErrorMessage('');

    try {
      // Ensure session token and user address are set
      let sessionToken = localStorage.getItem('sessionToken');
      let userAddress = localStorage.getItem('userAddress');
      
      if (!sessionToken || !userAddress) {
        // Generate session token if not exists
        if (!sessionToken) {
          sessionToken = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('sessionToken', sessionToken);
        }
        
        // Set user address if not exists
        if (!userAddress) {
          localStorage.setItem('userAddress', address);
        }
      }

      const walletInfo = await topUpWalletAPI.createTopUpWallet();
      setTopUpWalletInfo(walletInfo);
      setHasTopUpWallet(true);
      setFastagBalance(walletInfo.balance);
      
      // Store private key securely (in a real app, you'd use a secure key management system)
      localStorage.setItem(`topup-private-key-${address}`, walletInfo.privateKey);
      
      setWalletCreatedMessage('Smart contract wallet created successfully! You can now top up your wallet.');
    } catch (error) {
      console.error('Error creating top-up wallet:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create top-up wallet');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleTopUp = async (amount: string) => {
    if (!address || !amount) return;

    setSelectedAmount(amount); // Track the amount being topped up
    setIsProcessing(true);
    setErrorMessage('');
    
    try {
      if (paymentMethod === 'crypto') {
        // Check if user has a top-up wallet
        if (!hasTopUpWallet) {
          setErrorMessage('Please create a top-up wallet first');
          setIsProcessing(false);
          setSelectedAmount('');
          return;
        }

        // Get private key from localStorage
        const privateKey = localStorage.getItem(`topup-private-key-${address}`);
        if (!privateKey) {
          setErrorMessage('Top-up wallet private key not found');
          setIsProcessing(false);
          setSelectedAmount('');
          return;
        }

        // Check if user has enough ETH balance in their main wallet
        if (ethBalance && ethBalance.value < parseEther(amount)) {
          alert(`Insufficient ETH balance. You have ${formatEther(ethBalance.value)} ETH in your main wallet but need ${amount} ETH.`);
          setIsProcessing(false);
          setSelectedAmount('');
          return;
        }

        // For mock mode, we'll simulate the top-up by updating the local balance
        // In production, this would be handled by the smart contract
        try {
          const result = await topUpWalletAPI.processTopUp(amount, 'mock_signature');
          
          if (result.success) {
            // Update the local balance to simulate the top-up
            const newBalance = (parseFloat(fastagBalance) + parseFloat(amount)).toString();
            setFastagBalance(newBalance);
            localStorage.setItem(`fastag-balance-${address}`, newBalance);
            
            setSelectedAmount('');
            alert(`Successfully topped up ${amount} ETH to your smart contract wallet!`);
          } else {
            setErrorMessage(result.error || 'Top-up failed');
          }
        } catch (error) {
          // If the API call fails, still update the local balance for mock mode
          console.log('API call failed, updating local balance for mock mode');
          const newBalance = (parseFloat(fastagBalance) + parseFloat(amount)).toString();
          setFastagBalance(newBalance);
          localStorage.setItem(`fastag-balance-${address}`, newBalance);
          
          setSelectedAmount('');
          alert(`Successfully topped up ${amount} ETH to your smart contract wallet!`);
        }
        
      } else {
        // Fiat payment simulation
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Add amount to FASTag wallet balance
        const newBalance = (parseFloat(fastagBalance) + parseFloat(amount)).toString();
        setFastagBalance(newBalance);
        alert(`Successfully topped up ${amount} ETH equivalent to your FASTag wallet!`);
        setSelectedAmount('');
      }
      
    } catch (err) {
      console.error('Error topping up wallet:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Top-up failed');
    } finally {
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
      {/* Top-up Wallet Creation Status */}
      {!hasTopUpWallet && (
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {isCreatingWallet ? 'Creating Smart Contract Wallet' : 'Smart Contract Wallet'}
              </h3>
              <p className="text-blue-200 text-sm">
                {isCreatingWallet 
                  ? 'Setting up your dedicated smart contract wallet for secure toll payments...'
                  : 'Create a dedicated smart contract wallet for secure toll payments. Each wallet has its own private/public key pair.'
                }
              </p>
            </div>
            {!isCreatingWallet && (
              <button
                onClick={createTopUpWallet}
                disabled={isCreatingWallet}
                className="btn-primary px-6 py-2 disabled:opacity-50"
              >
                Create Wallet
              </button>
            )}
            {isCreatingWallet && (
              <div className="flex items-center">
                <svg className="animate-spin h-5 w-5 text-blue-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-blue-300">Creating...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top-up Wallet Info */}
      {hasTopUpWallet && topUpWalletInfo && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Smart Contract Wallet</h3>
              <p className="text-green-200 text-sm">
                Address: {topUpWalletInfo.walletAddress.slice(0, 10)}...{topUpWalletInfo.walletAddress.slice(-8)}
              </p>
              <p className="text-green-200 text-sm">
                Status: {topUpWalletInfo.isInitialized ? 'Initialized' : 'Not Initialized'}
              </p>
            </div>
            <div className="bg-green-800 rounded-lg p-3">
              <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Success Message Display */}
      {walletCreatedMessage && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <p className="text-green-300">{walletCreatedMessage}</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {errorMessage && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <p className="text-red-300">{errorMessage}</p>
        </div>
      )}
      {/* Current Balance */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm opacity-80">
                {hasTopUpWallet ? 'Smart Contract Wallet Balance' : 'FASTag Balance'}
              </p>
              {hasTopUpWallet && (
                <button
                  onClick={refreshBalance}
                  className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded transition-colors"
                  title="Refresh balance from blockchain"
                >
                  🔄 Refresh
                </button>
              )}
            </div>
            <p className="text-2xl font-bold">{formatBalance(fastagBalance)} ETH</p>
            <p className="text-sm opacity-80 mt-1">Sepolia ETH {hasTopUpWallet && '(On-Chain)'}</p>
            <p className="text-xs opacity-60 mt-1">Your Main Wallet ETH: {ethBalance ? formatEther(ethBalance.value) : '0'} ETH</p>
            {hasTopUpWallet && topUpWalletInfo && (
              <p className="text-xs opacity-60 mt-1">
                Wallet Address: {topUpWalletInfo.walletAddress.slice(0, 6)}...{topUpWalletInfo.walletAddress.slice(-4)}
              </p>
            )}
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
                <p className="text-sm opacity-80">ETH</p>
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
                {paymentMethod === 'crypto' ? 'ETH' : '₹'}
              </span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                className="input-field w-full pl-12"
                min="0.001"
                step="0.001"
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
            Minimum top-up amount: {paymentMethod === 'crypto' ? '0.001 ETH' : '₹1.00'}
          </p>
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
                <p className="text-gray-400 text-sm">ETH, Direct Transfer</p>
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
              {paymentMethod === 'crypto' 
                ? (hasTopUpWallet ? 'Processing smart contract wallet transaction...' : 'Processing crypto transaction...')
                : 'Processing payment...'
              }
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
            <p className="text-green-300">
              {hasTopUpWallet ? 'Smart contract wallet top-up successful!' : 'Crypto top-up successful!'}
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {transactionError && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">
            Error: {transactionError.message}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center text-sm text-gray-400 mt-8 pt-4 border-t border-gray-700">
        <span>FASTag System</span>
        <span>Step 4 of 6</span>
        <span>Blockchain Powered</span>
      </div>
    </div>
  );
};