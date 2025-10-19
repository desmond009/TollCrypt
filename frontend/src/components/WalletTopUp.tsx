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
  const [fastagBalance, setFastagBalance] = useState<string>('0');
  const [topUpWalletInfo, setTopUpWalletInfo] = useState<TopUpWalletInfo | null>(null);
  const [hasTopUpWallet, setHasTopUpWallet] = useState<boolean>(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [walletCreatedMessage, setWalletCreatedMessage] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<string>('');

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
    if (!address || !hasTopUpWallet || !topUpWalletInfo) return;
    
    try {
      // Try to get balance from blockchain first
      if (topUpWalletInfo.walletAddress && topUpWalletInfo.walletAddress !== '0x0000000000000000000000000000000000000000') {
        // Try multiple RPC endpoints for better reliability
        const rpcEndpoints = [
          process.env.REACT_APP_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
          'https://rpc.ankr.com/eth_sepolia'
        ].filter(Boolean); // Remove any undefined values
        
        for (const rpcUrl of rpcEndpoints as string[]) {
          try {
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [topUpWalletInfo.walletAddress, 'latest'],
                id: 1
              }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              
              if (data && data.result && !data.error) {
                const balanceInWei = parseInt(data.result, 16);
                const balanceInEth = balanceInWei / Math.pow(10, 18);
                setFastagBalance(balanceInEth.toString());
                console.log('Balance refreshed from blockchain:', balanceInEth, 'ETH');
                return;
              }
            }
          } catch (rpcError) {
            console.warn(`RPC endpoint ${rpcUrl} failed:`, rpcError);
            continue; // Try next endpoint
          }
        }
        
        console.warn('All RPC endpoints failed, falling back to API');
      }
      
      // Fallback to API
      const balanceResponse = await topUpWalletAPI.getTopUpWalletBalance();
      setFastagBalance(balanceResponse.balance);
      console.log('Balance refreshed from API:', balanceResponse.balance, 'ETH');
    } catch (error) {
      console.error('Error refreshing balance:', error);
      // Fallback to API on error
      try {
        const balanceResponse = await topUpWalletAPI.getTopUpWalletBalance();
        setFastagBalance(balanceResponse.balance);
        console.log('Balance refreshed from API (fallback):', balanceResponse.balance, 'ETH');
      } catch (apiError) {
        console.error('API fallback also failed:', apiError);
      }
    }
  }, [address, hasTopUpWallet, topUpWalletInfo]);

  // Check if user has a top-up wallet and load wallet info
  // Only create wallet if user explicitly requests it
  useEffect(() => {
    const checkTopUpWallet = async () => {
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
          // First-time user - show create wallet option but don't auto-create
          setHasTopUpWallet(false);
          setTopUpWalletInfo(null);
          setFastagBalance('0');
        }
      } catch (error) {
        console.error('Error checking top-up wallet:', error);
        setErrorMessage('Failed to check top-up wallet status');
      }
    };

    checkTopUpWallet();
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
    if (isSuccess && selectedAmount) {
      // Refresh balance from blockchain after successful transaction
      refreshBalance();
      setSelectedAmount(''); // Reset selected amount
      setIsProcessing(false);
    }
  }, [isSuccess, selectedAmount, refreshBalance]);

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

      // Check if user already has a top-up wallet, if not create one
      let walletInfo;
      try {
        const existsResponse = await topUpWalletAPI.hasTopUpWallet();
        if (existsResponse.exists) {
          // User already has a wallet, get the info
          walletInfo = await topUpWalletAPI.getTopUpWalletInfo();
          setWalletCreatedMessage('Your existing smart contract wallet has been loaded.');
        } else {
          // Create new top-up wallet
          walletInfo = await topUpWalletAPI.createTopUpWallet();
          setWalletCreatedMessage('Smart contract wallet created successfully! You can now top up your wallet.');
        }
      } catch (error) {
        console.error('Error handling top-up wallet:', error);
        // Fallback: try to create wallet
        walletInfo = await topUpWalletAPI.createTopUpWallet();
        setWalletCreatedMessage('Smart contract wallet created successfully! You can now top up your wallet.');
      }
      
      setTopUpWalletInfo(walletInfo);
      setHasTopUpWallet(true);
      setFastagBalance(walletInfo.balance);
      
      // Store private key securely (in a real app, you'd use a secure key management system)
      localStorage.setItem(`topup-private-key-${address}`, walletInfo.privateKey);
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

      // Real blockchain transaction - send ETH from user's wallet to top-up wallet
      try {
        // Send transaction from user's wallet to top-up wallet
        await sendTransaction({
          to: topUpWalletInfo!.walletAddress as `0x${string}`,
          value: parseEther(amount),
        });
        
        // Transaction will be handled by the useEffect that watches for isSuccess
        // No need to manually update balance here as it will be refreshed from blockchain
        
      } catch (error) {
        console.error('Transaction failed:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Transaction failed');
        setIsProcessing(false);
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

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(`${type} copied to clipboard!`);
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      setCopySuccess('Failed to copy');
      setTimeout(() => setCopySuccess(''), 3000);
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
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
                {isCreatingWallet ? 'Creating Smart Contract Wallet' : 'Smart Contract Wallet'}
              </h3>
              <p className="text-blue-200 text-sm">
                {isCreatingWallet 
                  ? 'Setting up your dedicated smart contract wallet for secure toll payments...'
                  : 'Create a dedicated smart contract wallet for secure toll payments. Each wallet has its own private/public key pair.'
                }
              </p>
            </div>
            <div className="flex-shrink-0">
              {!isCreatingWallet && (
                <button
                  onClick={createTopUpWallet}
                  disabled={isCreatingWallet}
                  className="btn-primary px-4 sm:px-6 py-2 disabled:opacity-50 w-full sm:w-auto"
                >
                  Create Wallet
                </button>
              )}
              {isCreatingWallet && (
                <div className="flex items-center justify-center sm:justify-start">
                  <svg className="animate-spin h-5 w-5 text-blue-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-blue-300">Creating...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top-up Wallet Info */}
      {hasTopUpWallet && topUpWalletInfo && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Smart Contract Wallet</h3>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <p className="text-green-200 text-sm">Address:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-green-300 text-xs bg-green-800 px-2 py-1 rounded break-all">
                      {topUpWalletInfo.walletAddress.slice(0, 10)}...{topUpWalletInfo.walletAddress.slice(-8)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(topUpWalletInfo.walletAddress, 'Wallet address')}
                      className="text-green-400 hover:text-green-300 text-xs flex-shrink-0"
                      title="Copy full address"
                    >
                      📋
                    </button>
                  </div>
                </div>
                {topUpWalletInfo.publicKey && (
                  <div className="flex items-center gap-2">
                    <p className="text-green-200 text-sm">Public Key:</p>
                    <code className="text-green-300 text-xs bg-green-800 px-2 py-1 rounded">
                      {topUpWalletInfo.publicKey.slice(0, 10)}...{topUpWalletInfo.publicKey.slice(-8)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(topUpWalletInfo.publicKey, 'Public key')}
                      className="text-green-400 hover:text-green-300 text-xs"
                      title="Copy full public key"
                    >
                      📋
                    </button>
                  </div>
                )}
                <p className="text-green-200 text-sm">
                  Status: {topUpWalletInfo.isInitialized ? 'Initialized' : 'Not Initialized'}
                </p>
              </div>
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

      {/* Copy Success Message */}
      {copySuccess && (
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <p className="text-blue-300">{copySuccess}</p>
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
            <p className="text-sm opacity-80 mt-1">
              Sepolia ETH {hasTopUpWallet && '(Real Blockchain)'}
            </p>
            <p className="text-xs opacity-60 mt-1">
              Your Main Wallet ETH: {ethBalance ? formatEther(ethBalance.value) : '0'} ETH
            </p>
            {hasTopUpWallet && topUpWalletInfo && (
              <div className="text-xs opacity-60 mt-1">
                <p>Smart Contract: {topUpWalletInfo.walletAddress.slice(0, 6)}...{topUpWalletInfo.walletAddress.slice(-4)}</p>
                <p className="text-green-300">✓ Connected to Sepolia Testnet</p>
              </div>
            )}
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-3">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Blockchain Payment Method */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Payment Method</h3>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
              </svg>
            </div>
            <div>
              <p className="font-medium">Blockchain Wallet</p>
              <p className="text-sm opacity-80">ETH - Direct Transfer</p>
            </div>
          </div>
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
                    {formatCryptoAmount(option.amount)}
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
                ETH
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
            Minimum top-up amount: 0.001 ETH
          </p>
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
              Signing transaction with MetaMask...
            </p>
          </div>
          {hash && (
            <div className="mt-3 text-sm text-blue-200">
              <p>Transaction Hash: {hash.slice(0, 10)}...{hash.slice(-8)}</p>
              <p>Status: {isConfirming ? 'Confirming...' : isSuccess ? 'Confirmed!' : 'Pending'}</p>
            </div>
          )}
        </div>
      )}

      {/* Success State */}
      {isSuccess && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <p className="text-green-300">
              Transaction confirmed! ETH sent to your smart contract wallet on Sepolia testnet.
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