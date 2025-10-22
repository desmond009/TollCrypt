import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { format } from 'date-fns';

interface Vehicle {
  id: string;
  vehicleId: string;
  vehicleType: string;
  owner: string;
  ownerHash: string;
  walletAddress: string;
  isActive: boolean;
  isBlacklisted: boolean;
  registrationDate: string;
  lastTransactionDate?: string;
  totalTransactions: number;
  totalAmount: number;
  currentBalance: number;
  status: 'active' | 'inactive' | 'blacklisted' | 'suspended';
}

interface VehicleFilters {
  search: string;
  vehicleType: string;
  status: string;
  dateRange: {
    start: string;
    end: string;
  };
}

interface VehicleManagementProps {
  socket: any;
}

export const VehicleManagement: React.FC<VehicleManagementProps> = ({ socket }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Vehicle; direction: 'asc' | 'desc' } | null>(null);

  const { register, handleSubmit, watch, reset } = useForm<VehicleFilters>();
  const watchedFilters = watch();

  // Fetch vehicles data
  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/admin/vehicles');
      setVehicles(response.data.data);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      // Listen for toll payment completion
      socket.on('toll_payment_completed', (data: any) => {
        console.log('Toll payment completed, refreshing vehicle data:', data);
        // Refresh vehicle data to update transaction counts
        fetchVehicles();
      });

      // Listen for new transactions
      socket.on('new_transaction', (data: any) => {
        console.log('New transaction received, refreshing vehicle data:', data);
        fetchVehicles();
      });

      return () => {
        socket.off('toll_payment_completed');
        socket.off('new_transaction');
      };
    }
  }, [socket]);

  // Filter and sort vehicles
  useEffect(() => {
    let filtered = [...vehicles];

    // Apply search filter
    if (watchedFilters.search) {
      const searchTerm = watchedFilters.search.toLowerCase();
      filtered = filtered.filter(vehicle =>
        vehicle.vehicleId.toLowerCase().includes(searchTerm) ||
        vehicle.owner.toLowerCase().includes(searchTerm) ||
        vehicle.walletAddress.toLowerCase().includes(searchTerm)
      );
    }

    // Apply vehicle type filter
    if (watchedFilters.vehicleType) {
      filtered = filtered.filter(vehicle => vehicle.vehicleType === watchedFilters.vehicleType);
    }

    // Apply status filter
    if (watchedFilters.status) {
      filtered = filtered.filter(vehicle => vehicle.status === watchedFilters.status);
    }

    // Apply date range filter
    if (watchedFilters.dateRange?.start && watchedFilters.dateRange?.end) {
      const startDate = new Date(watchedFilters.dateRange.start);
      const endDate = new Date(watchedFilters.dateRange.end);
      filtered = filtered.filter(vehicle => {
        const regDate = new Date(vehicle.registrationDate);
        return regDate >= startDate && regDate <= endDate;
      });
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue == null || bValue == null) {
          return 0;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredVehicles(filtered);
  }, [vehicles, watchedFilters.search, watchedFilters.vehicleType, watchedFilters.status, watchedFilters.dateRange?.start, watchedFilters.dateRange?.end, sortConfig]);

  const handleSort = (key: keyof Vehicle) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleBlacklistToggle = async (vehicleId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/vehicles/${vehicleId}/blacklist`, {
        isBlacklisted: !currentStatus
      });
      
      setVehicles(prev => prev.map(vehicle =>
        vehicle.id === vehicleId
          ? { ...vehicle, isBlacklisted: !currentStatus, status: !currentStatus ? 'blacklisted' : 'active' }
          : vehicle
      ));
    } catch (error) {
      console.error('Failed to update blacklist status:', error);
    }
  };

  const handleStatusChange = async (vehicleId: string, newStatus: Vehicle['status']) => {
    try {
      await api.patch(`/vehicles/${vehicleId}/status`, { status: newStatus });
      
      setVehicles(prev => prev.map(vehicle =>
        vehicle.id === vehicleId ? { ...vehicle, status: newStatus } : vehicle
      ));
    } catch (error) {
      console.error('Failed to update vehicle status:', error);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Vehicle ID', 'Type', 'Owner', 'Wallet Address', 'Status', 'Registration Date', 'Total Transactions', 'Total Amount', 'Current Balance'],
      ...filteredVehicles.map(vehicle => [
        vehicle.vehicleId,
        vehicle.vehicleType,
        vehicle.owner,
        vehicle.walletAddress,
        vehicle.status,
        format(new Date(vehicle.registrationDate), 'yyyy-MM-dd'),
        vehicle.totalTransactions.toString(),
        vehicle.totalAmount.toFixed(2),
        vehicle.currentBalance.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vehicles-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: Vehicle['status']) => {
    const statusConfig = {
      active: { color: 'bg-green-900 text-green-300 border-green-700', icon: CheckCircleIcon },
      inactive: { color: 'bg-gray-700 text-gray-300 border-gray-600', icon: XCircleIcon },
      blacklisted: { color: 'bg-red-900 text-red-300 border-red-700', icon: ExclamationTriangleIcon },
      suspended: { color: 'bg-yellow-900 text-yellow-300 border-yellow-700', icon: ExclamationTriangleIcon },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  const vehicleTypes = useMemo(() => {
    const types = Array.from(new Set(vehicles.map(v => v.vehicleType)));
    return types;
  }, [vehicles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Vehicle Management</h1>
          <p className="text-gray-400">Manage registered vehicles and monitor their status</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={fetchVehicles}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
          >
            <ArrowUpTrayIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Vehicle
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg shadow p-4 sm:p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Filters</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 hover:text-white transition-colors"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>

        {showFilters && (
          <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  {...register('search')}
                  type="text"
                  placeholder="Vehicle ID, Owner, Wallet..."
                  className="pl-10 w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Vehicle Type</label>
              <select
                {...register('vehicleType')}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">All Types</option>
                {vehicleTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blacklisted">Blacklisted</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date Range</label>
              <div className="flex space-x-2">
                <input
                  {...register('dateRange.start')}
                  type="date"
                  className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <input
                  {...register('dateRange.end')}
                  type="date"
                  className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Vehicles Table */}
      <div className="bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th
                  onClick={() => handleSort('vehicleId')}
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors"
                >
                  Vehicle ID
                  {sortConfig?.key === 'vehicleId' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  onClick={() => handleSort('vehicleType')}
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors"
                >
                  Type
                  {sortConfig?.key === 'vehicleType' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Top-up Wallet Address
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors"
                >
                  Status
                  {sortConfig?.key === 'status' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  onClick={() => handleSort('totalTransactions')}
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors"
                >
                  Transactions
                  {sortConfig?.key === 'totalTransactions' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  onClick={() => handleSort('totalAmount')}
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors"
                >
                  Total Amount
                  {sortConfig?.key === 'totalAmount' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-700 transition-colors">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {vehicle.vehicleId}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {vehicle.vehicleType}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div>
                      <div className="font-medium text-white">{vehicle.owner}</div>
                      <div className="text-xs text-gray-400">{vehicle.ownerHash}</div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                    <div className="flex flex-col">
                      <span className="text-white">{vehicle.walletAddress.slice(0, 6)}...{vehicle.walletAddress.slice(-4)}</span>
                      <span className="text-xs text-gray-400">Top-up Wallet</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(vehicle.status)}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {vehicle.totalTransactions}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    ${vehicle.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                      <button
                        onClick={() => setSelectedVehicle(vehicle)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleBlacklistToggle(vehicle.id, vehicle.isBlacklisted)}
                        className={`text-sm ${vehicle.isBlacklisted ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'} transition-colors`}
                      >
                        {vehicle.isBlacklisted ? 'Unblacklist' : 'Blacklist'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVehicles.length === 0 && (
          <div className="text-center py-12">
            <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-white">No vehicles found</h3>
            <p className="mt-1 text-sm text-gray-400">
              Try adjusting your search criteria or add a new vehicle.
            </p>
          </div>
        )}
      </div>

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 sm:top-20 mx-auto p-3 sm:p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-gray-800 border-gray-700">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">Vehicle Details</h3>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Vehicle ID</label>
                    <p className="mt-1 text-sm text-white">{selectedVehicle.vehicleId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Vehicle Type</label>
                    <p className="mt-1 text-sm text-white">{selectedVehicle.vehicleType}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">Owner</label>
                  <p className="mt-1 text-sm text-white">{selectedVehicle.owner}</p>
                  <p className="text-xs text-gray-400">{selectedVehicle.ownerHash}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">Top-up Wallet Address</label>
                  <p className="mt-1 text-sm text-white font-mono">{selectedVehicle.walletAddress}</p>
                  <p className="text-xs text-gray-400">Used for toll transactions</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedVehicle.status)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Current Balance</label>
                    <p className="mt-1 text-sm text-white">${selectedVehicle.currentBalance.toFixed(2)} USDC</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Total Transactions</label>
                    <p className="mt-1 text-sm text-white">{selectedVehicle.totalTransactions}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Total Amount</label>
                    <p className="mt-1 text-sm text-white">${selectedVehicle.totalAmount.toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">Registration Date</label>
                  <p className="mt-1 text-sm text-white">
                    {format(new Date(selectedVehicle.registrationDate), 'PPP')}
                  </p>
                </div>

                {selectedVehicle.lastTransactionDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Last Transaction</label>
                    <p className="mt-1 text-sm text-white">
                      {format(new Date(selectedVehicle.lastTransactionDate), 'PPP')}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleBlacklistToggle(selectedVehicle.id, selectedVehicle.isBlacklisted)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedVehicle.isBlacklisted
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {selectedVehicle.isBlacklisted ? 'Remove from Blacklist' : 'Add to Blacklist'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};