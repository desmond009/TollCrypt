import React, { useState, useEffect, useCallback } from 'react';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { 
  CurrencyDollarIcon, 
  TruckIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { processRevenueData, processVehicleTypeData, isValidChartData } from '../utils/chartUtils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardStats {
  totalVehicles: number;
  totalRevenue: number;
  averageWaitTime: number;
  successRate: number;
  todayTransactions: number;
  todayRevenue: number;
  activePlazas: number;
  failedTransactions: number;
}

interface Transaction {
  id: string;
  vehicleId: string;
  amount: number;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  plazaId: string;
  adminId: string;
  transactionHash?: string;
}

interface Plaza {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'maintenance' | 'inactive';
  todayTransactions: number;
  todayRevenue: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface LiveDashboardProps {
  socket: any;
  notifications: any[];
}

export const LiveDashboard: React.FC<LiveDashboardProps> = ({ socket, notifications }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    totalRevenue: 0,
    averageWaitTime: 0,
    successRate: 0,
    todayTransactions: 0,
    todayRevenue: 0,
    activePlazas: 0,
    failedTransactions: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [vehicleTypeData, setVehicleTypeData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch stats
      const statsResponse = await api.get('/api/dashboard/stats');
      setStats(statsResponse.data.data);

      // Fetch recent transactions
      const transactionsResponse = await api.get('/api/admin/transactions/recent?limit=10');
      setRecentTransactions(transactionsResponse.data.data || []);

      // Fetch plazas
      const plazasResponse = await api.get('/api/admin/plazas');
      setPlazas(plazasResponse.data.data || []);

      // Fetch revenue chart data
      const revenueResponse = await api.get('/api/admin/analytics/revenue?period=7d');
      const revenueData = processRevenueData(revenueResponse.data.data);
      setRevenueData(revenueData);

      // Fetch vehicle type distribution
      const vehicleTypeResponse = await api.get('/api/admin/analytics/vehicle-types');
      const vehicleData = processVehicleTypeData(vehicleTypeResponse.data.data);
      setVehicleTypeData(vehicleData);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time updates - reduced frequency to 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Listen for real-time updates via socket
  useEffect(() => {
    if (socket) {
      socket.on('transaction_update', (data: Transaction) => {
        setRecentTransactions(prev => [data, ...prev.slice(0, 9)]);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          todayTransactions: prev.todayTransactions + 1,
          todayRevenue: prev.todayRevenue + data.amount,
        }));
      });

      socket.on('plaza_status_update', (data: Plaza) => {
        setPlazas(prev => prev.map(plaza => 
          plaza.id === data.id ? data : plaza
        ));
      });

      return () => {
        socket.off('transaction_update');
        socket.off('plaza_status_update');
      };
    }
  }, [socket]);

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(4)} ETH`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-300 bg-green-900 border-green-700';
      case 'failed':
        return 'text-red-300 bg-red-900 border-red-700';
      case 'pending':
        return 'text-yellow-300 bg-yellow-900 border-yellow-700';
      default:
        return 'text-gray-300 bg-gray-700 border-gray-600';
    }
  };

  const getPlazaStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-300 bg-green-900 border-green-700';
      case 'maintenance':
        return 'text-yellow-300 bg-yellow-900 border-yellow-700';
      case 'inactive':
        return 'text-red-300 bg-red-900 border-red-700';
      default:
        return 'text-gray-300 bg-gray-700 border-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Live Dashboard</h1>
          <p className="text-gray-400">Real-time toll collection monitoring</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-400">Live</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="admin-card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-900/20 rounded-lg">
              <TruckIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Total Vehicles</p>
              <p className="text-2xl font-semibold text-white">{stats.totalVehicles}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-400 ml-1">+12% from yesterday</span>
          </div>
        </div>

        <div className="admin-card">
          <div className="flex items-center">
            <div className="p-2 bg-green-900/20 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Today's Revenue</p>
              <p className="text-2xl font-semibold text-white">{formatCurrency(stats.todayRevenue)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-400 ml-1">+8% from yesterday</span>
          </div>
        </div>

        <div className="admin-card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-900/20 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Avg Wait Time</p>
              <p className="text-2xl font-semibold text-white">{stats.averageWaitTime}s</p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowDownIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-400 ml-1">-15% from yesterday</span>
          </div>
        </div>

        <div className="admin-card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-900/20 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Success Rate</p>
              <p className="text-2xl font-semibold text-white">{stats.successRate}%</p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-400 ml-1">+2% from yesterday</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="admin-card">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend (7 Days)</h3>
          {isValidChartData(revenueData) ? (
            <Line
              data={revenueData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      color: '#ffffff'
                    }
                  },
                  title: {
                    display: false,
                  },
                },
                scales: {
                  x: {
                    ticks: {
                      color: '#9ca3af'
                    },
                    grid: {
                      color: '#374151'
                    }
                  },
                  y: {
                    beginAtZero: true,
                    ticks: {
                      color: '#9ca3af',
                      callback: function(value: any) {
                        return formatCurrency(Number(value));
                      }
                    },
                    grid: {
                      color: '#374151'
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="text-gray-400">No revenue data available</div>
            </div>
          )}
        </div>

        {/* Vehicle Type Distribution */}
        <div className="admin-card">
          <h3 className="text-lg font-semibold text-white mb-4">Vehicle Type Distribution</h3>
          {isValidChartData(vehicleTypeData) ? (
            <Doughnut
              data={vehicleTypeData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                    labels: {
                      color: '#ffffff'
                    }
                  },
                },
              }}
            />
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="text-gray-400">No vehicle type data available</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions and Plaza Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-gray-800 rounded-lg shadow border border-gray-700">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
          </div>
          <div className="divide-y divide-gray-700">
            {recentTransactions && recentTransactions.length > 0 ? recentTransactions.map((transaction) => (
              <div key={transaction.id} className="px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TruckIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-white">
                        {transaction.vehicleId}
                      </p>
                      <p className="text-sm text-gray-400">
                        {formatTime(transaction.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(transaction.amount)}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="px-4 sm:px-6 py-4 text-center text-sm text-gray-400">
                No recent transactions
              </div>
            )}
          </div>
        </div>

        {/* Plaza Status */}
        <div className="bg-gray-800 rounded-lg shadow border border-gray-700">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Toll Plaza Status</h3>
          </div>
          <div className="divide-y divide-gray-700">
            {plazas && plazas.length > 0 ? plazas.map((plaza) => (
              <div key={plaza.id} className="px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <MapPinIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-white">
                        {plaza.name}
                      </p>
                      <p className="text-sm text-gray-400">
                        {plaza.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                    <span className="text-sm text-gray-400">
                      {plaza.todayTransactions} transactions
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPlazaStatusColor(plaza.status)}`}>
                      {plaza.status}
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="px-4 sm:px-6 py-4 text-center text-sm text-gray-400">
                No plazas found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {notifications.length > 0 && (
        <div className="bg-gray-800 rounded-lg shadow border border-gray-700">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">System Alerts</h3>
          </div>
          <div className="divide-y divide-gray-700">
            {notifications.slice(0, 5).map((notification, index) => (
              <div key={index} className="px-4 sm:px-6 py-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3" />
                  <div>
                    <p className="text-sm text-white">{notification.message}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(notification.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
