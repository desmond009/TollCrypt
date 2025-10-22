import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { blockchainService, TransactionResult } from '../services/blockchainService';

interface ContractStats {
  totalRevenue: string;
  formattedRevenue: string;
  totalTransactions: number;
  totalVehicles: number;
  tollRate: string;
  formattedTollRate: string;
}

interface TreasuryWalletBalance {
  balance: string;
  formattedBalance: string;
  decimals: number;
}

const RevenueManagement: React.FC = () => {
  const [contractStats, setContractStats] = useState<ContractStats | null>(null);
  const [treasuryBalance, setTreasuryBalance] = useState<TreasuryWalletBalance | null>(null);
  const [treasuryWallet, setTreasuryWallet] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [adminWallet, setAdminWallet] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [withdrawalHistory, setWithdrawalHistory] = useState<TransactionResult[]>([]);

  // Load contract stats and treasury balance on component mount
  useEffect(() => {
    loadContractStats();
    loadTreasuryBalance();
  }, [treasuryWallet]);

  const loadContractStats = async () => {
    try {
      setIsLoading(true);
      const stats = await blockchainService.getContractStats();
      setContractStats(stats);
      setError(null);
    } catch (err: any) {
      setError(`Failed to load contract stats: ${err.message}`);
      console.error('Error loading contract stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTreasuryBalance = async () => {
    if (!treasuryWallet) return;
    
    try {
      const balance = await blockchainService.getTreasuryWalletBalance(treasuryWallet);
      setTreasuryBalance(balance);
    } catch (err: any) {
      console.error('Error loading treasury balance:', err);
    }
  };

  const handleWithdrawRevenue = async () => {
    if (!treasuryWallet || !withdrawalAmount || !adminWallet) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const result = await blockchainService.withdrawRevenue(
        treasuryWallet,
        withdrawalAmount,
        adminWallet
      );

      if (result.success) {
        setSuccess(`Successfully withdrew ${withdrawalAmount} ETH to treasury wallet!`);
        setWithdrawalHistory(prev => [result, ...prev]);
        setWithdrawalAmount('');
        
        // Refresh stats and balance
        await Promise.all([
          loadContractStats(),
          loadTreasuryBalance()
        ]);
      } else {
        setError(result.error || 'Withdrawal failed');
      }
    } catch (err: any) {
      setError(`Withdrawal failed: ${err.message}`);
      console.error('Error withdrawing revenue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdrawAllRevenue = async () => {
    if (!treasuryWallet || !adminWallet) {
      setError('Please fill in treasury wallet and admin wallet');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const result = await blockchainService.withdrawAllRevenue(
        treasuryWallet,
        adminWallet
      );

      if (result.success) {
        setSuccess('Successfully withdrew all available revenue to treasury wallet!');
        setWithdrawalHistory(prev => [result, ...prev]);
        
        // Refresh stats and balance
        await Promise.all([
          loadContractStats(),
          loadTreasuryBalance()
        ]);
      } else {
        setError(result.error || 'Withdrawal failed');
      }
    } catch (err: any) {
      setError(`Withdrawal failed: ${err.message}`);
      console.error('Error withdrawing all revenue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Address copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Revenue Management</h1>
          <p className="mt-2 text-gray-300">
            Manage toll collection revenue and treasury wallet operations
          </p>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-700 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-900/20 border border-green-700 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-300">{success}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contract Statistics */}
          <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Contract Statistics</h2>
            
            {isLoading && !contractStats ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-700 rounded w-2/3"></div>
              </div>
            ) : contractStats ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-300">Total Revenue</span>
                  <span className="font-semibold text-green-400">
                    {contractStats.formattedRevenue} ETH
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-300">Total Transactions</span>
                  <span className="font-semibold text-white">{contractStats.totalTransactions}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-300">Total Vehicles</span>
                  <span className="font-semibold text-white">{contractStats.totalVehicles}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-300">Current Toll Rate</span>
                  <span className="font-semibold text-blue-400">{contractStats.formattedTollRate} ETH</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">Failed to load contract statistics</p>
            )}

            <button
              onClick={loadContractStats}
              disabled={isLoading}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Refresh Stats'}
            </button>
          </div>

          {/* Treasury Wallet Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Treasury Wallet</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Treasury Wallet Address
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={treasuryWallet}
                    onChange={(e) => setTreasuryWallet(e.target.value)}
                    placeholder="0x..."
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {treasuryWallet && (
                    <button
                      onClick={() => copyToClipboard(treasuryWallet)}
                      className="ml-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>

              {treasuryBalance && (
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Treasury Balance</span>
                    <span className="font-semibold text-blue-600">
                      {treasuryBalance.formattedBalance} ETH
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Address: {formatAddress(treasuryWallet)}
                  </div>
                </div>
              )}

              <button
                onClick={loadTreasuryBalance}
                disabled={!treasuryWallet || isLoading}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Check Balance'}
              </button>
            </div>
          </div>
        </div>

        {/* Revenue Withdrawal */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Withdraw Revenue</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Wallet Address
                </label>
                <input
                  type="text"
                  value={adminWallet}
                  onChange={(e) => setAdminWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Withdrawal Amount (ETH)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="0.0001"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleWithdrawRevenue}
                  disabled={!treasuryWallet || !withdrawalAmount || !adminWallet || isLoading}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Withdraw Amount'}
                </button>

                <button
                  onClick={handleWithdrawAllRevenue}
                  disabled={!treasuryWallet || !adminWallet || isLoading || !contractStats || contractStats.totalRevenue === '0'}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Withdraw All'}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <h3 className="font-medium text-gray-900 mb-2">Withdrawal Information</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Only the contract owner can withdraw revenue</p>
                <p>• Withdrawals are processed on-chain</p>
                <p>• Gas fees apply to withdrawal transactions</p>
                <p>• All transactions are recorded on blockchain</p>
              </div>
            </div>
          </div>
        </div>

        {/* Withdrawal History */}
        {withdrawalHistory.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Withdrawals</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction Hash
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Block Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gas Used
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {withdrawalHistory.map((tx, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          tx.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {tx.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.transactionHash ? formatAddress(tx.transactionHash) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.blockNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.gasUsed || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueManagement;
