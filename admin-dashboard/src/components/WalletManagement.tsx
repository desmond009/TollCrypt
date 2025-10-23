import React, { useState, useEffect } from 'react';
import { 
  WalletIcon, 
  ExclamationTriangleIcon, 
  FlagIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { WalletInfo, WalletActivity, FlagWalletForm, PaginatedResponse } from '../types/adminManagement';

interface WalletManagementProps {
  user: any;
}

export const WalletManagement: React.FC<WalletManagementProps> = ({ user }) => {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [flaggedFilter, setFlaggedFilter] = useState('');
  const [suspiciousFilter, setSuspiciousFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Check if user has permission to manage wallets
  const canManageWallets = user?.permissions?.canManageWallets;

  useEffect(() => {
    fetchWallets();
  }, [currentPage, searchTerm, flaggedFilter, suspiciousFilter]);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(flaggedFilter && { flagged: flaggedFilter }),
        ...(suspiciousFilter && { suspicious: suspiciousFilter })
      });

      const response = await fetch(`/api/admin-management/wallets?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wallets');
      }

      const data: PaginatedResponse<WalletInfo> = await response.json();
      setWallets(data.data);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFlagWallet = async (formData: FlagWalletForm) => {
    if (!selectedWallet) return;

    try {
      const response = await fetch(`/api/admin-management/wallets/${selectedWallet.walletAddress}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to flag wallet');
      }

      setShowFlagModal(false);
      setSelectedWallet(null);
      fetchWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flag wallet');
    }
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'registration':
        return 'bg-blue-100 text-blue-800';
      case 'topup':
        return 'bg-green-100 text-green-800';
      case 'payment':
        return 'bg-purple-100 text-purple-800';
      case 'withdrawal':
        return 'bg-orange-100 text-orange-800';
      case 'suspicious':
        return 'bg-red-100 text-red-800';
      case 'flagged':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!canManageWallets) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Access Denied</h3>
        <p className="text-gray-400">You don't have permission to manage wallets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallet Management</h1>
          <p className="text-gray-400">Monitor and manage user wallets</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search wallets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={flaggedFilter}
            onChange={(e) => setFlaggedFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Wallets</option>
            <option value="true">Flagged Only</option>
            <option value="false">Not Flagged</option>
          </select>
          <select
            value={suspiciousFilter}
            onChange={(e) => setSuspiciousFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Activity</option>
            <option value="true">Suspicious Only</option>
            <option value="false">Normal Activity</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setFlaggedFilter('');
              setSuspiciousFilter('');
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <FunnelIcon className="h-5 w-5" />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Wallets Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading wallets...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Wallet Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Top-Up Wallet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Activity Flags
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Last Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {wallets.map((wallet) => (
                    <tr key={wallet.id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <WalletIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-white font-mono">
                              {formatWalletAddress(wallet.walletAddress)}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              {wallet.walletAddress}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {wallet.topUpWalletAddress ? (
                          <div>
                            <div className="text-sm text-white font-mono">
                              {formatWalletAddress(wallet.topUpWalletAddress)}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              {wallet.topUpWalletAddress}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not created</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            wallet.isVerified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {wallet.isVerified ? (
                              <>
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                Verified
                              </>
                            ) : (
                              <>
                                <XCircleIcon className="h-3 w-3 mr-1" />
                                Unverified
                              </>
                            )}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            wallet.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {wallet.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          {wallet.isFlagged && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              <FlagIcon className="h-3 w-3 mr-1" />
                              Flagged ({wallet.flaggedActivityCount})
                            </span>
                          )}
                          {wallet.isSuspicious && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                              Suspicious ({wallet.suspiciousActivityCount})
                            </span>
                          )}
                          {!wallet.isFlagged && !wallet.isSuspicious && (
                            <span className="text-gray-400 text-xs">Normal</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {wallet.lastLogin ? new Date(wallet.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedWallet(wallet);
                              setShowActivityModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300"
                            title="View Activity"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedWallet(wallet);
                              setShowFlagModal(true);
                            }}
                            className="text-yellow-400 hover:text-yellow-300"
                            title="Flag Wallet"
                          >
                            <FlagIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-700 px-6 py-3 flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-500"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-500"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showFlagModal && selectedWallet && (
        <FlagWalletModal
          wallet={selectedWallet}
          onClose={() => {
            setShowFlagModal(false);
            setSelectedWallet(null);
          }}
          onSubmit={handleFlagWallet}
        />
      )}

      {showActivityModal && selectedWallet && (
        <WalletActivityModal
          wallet={selectedWallet}
          onClose={() => {
            setShowActivityModal(false);
            setSelectedWallet(null);
          }}
        />
      )}
    </div>
  );
};

// Flag Wallet Modal Component
const FlagWalletModal: React.FC<{
  wallet: WalletInfo;
  onClose: () => void;
  onSubmit: (data: FlagWalletForm) => void;
}> = ({ wallet, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<FlagWalletForm>({
    reason: '',
    adminNotes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Flag Wallet</h2>
        <div className="mb-4 p-3 bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-300">Wallet Address:</p>
          <p className="text-white font-mono text-sm">{wallet.walletAddress}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Reason for Flagging
            </label>
            <select
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a reason</option>
              <option value="suspicious_activity">Suspicious Activity</option>
              <option value="high_risk_transactions">High Risk Transactions</option>
              <option value="fraud_detection">Fraud Detection</option>
              <option value="compliance_issue">Compliance Issue</option>
              <option value="manual_review">Manual Review Required</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Admin Notes
            </label>
            <textarea
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional details about why this wallet is being flagged..."
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Flag Wallet
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Wallet Activity Modal Component
const WalletActivityModal: React.FC<{
  wallet: WalletInfo;
  onClose: () => void;
}> = ({ wallet, onClose }) => {
  const [activities, setActivities] = useState<WalletActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/admin-management/wallets/${wallet.walletAddress}/activity`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data: PaginatedResponse<WalletActivity> = await response.json();
      setActivities(data.data);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'registration':
        return 'bg-blue-100 text-blue-800';
      case 'topup':
        return 'bg-green-100 text-green-800';
      case 'payment':
        return 'bg-purple-100 text-purple-800';
      case 'withdrawal':
        return 'bg-orange-100 text-orange-800';
      case 'suspicious':
        return 'bg-red-100 text-red-800';
      case 'flagged':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Wallet Activity</h2>
        <div className="mb-4 p-3 bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-300">Wallet Address:</p>
          <p className="text-white font-mono text-sm">{wallet.walletAddress}</p>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading activities...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActivityTypeColor(activity.activityType)}`}>
                    {activity.activityType.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-400">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-white mb-2">{activity.description}</p>
                {activity.amount && (
                  <p className="text-green-400 font-medium">Amount: {activity.amount} USDC</p>
                )}
                {activity.transactionHash && (
                  <p className="text-gray-400 text-sm font-mono">
                    TX: {activity.transactionHash.slice(0, 10)}...{activity.transactionHash.slice(-8)}
                  </p>
                )}
                {activity.metadata.adminNotes && (
                  <div className="mt-2 p-2 bg-gray-600 rounded">
                    <p className="text-sm text-gray-300">Admin Notes:</p>
                    <p className="text-white text-sm">{activity.metadata.adminNotes}</p>
                  </div>
                )}
                {activity.metadata.flags && activity.metadata.flags.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-300">Flags:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {activity.metadata.flags.map((flag, index) => (
                        <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {activities.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No activity found for this wallet.
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
