import React, { useState, useEffect } from 'react';
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
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch stats
        const statsResponse = await api.get('/dashboard/stats');
        setStats(statsResponse.data.data);

        // Fetch recent transactions
        const transactionsResponse = await api.get('/transactions/recent?limit=10');
        setRecentTransactions(transactionsResponse.data.data);

        // Fetch plazas
        const plazasResponse = await api.get('/plazas');
        setPlazas(plazasResponse.data.data);

        // Fetch revenue chart data
        const revenueResponse = await api.get('/analytics/revenue?period=7d');
        setRevenueData(revenueResponse.data.data);

        // Fetch vehicle type distribution
        const vehicleTypeResponse = await api.get('/analytics/vehicle-types');
        setVehicleTypeData(vehicleTypeResponse.data.data);

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    // Set up real-time updates
    const interval = setInterval(fetchDashboardData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

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
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPlazaStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-100';
      case 'inactive':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Dashboard</h1>
          <p className="text-gray-600">Real-time toll collection monitoring</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Live</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TruckIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalVehicles}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 ml-1">+12% from yesterday</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.todayRevenue)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 ml-1">+8% from yesterday</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.averageWaitTime}s</p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowDownIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 ml-1">-15% from yesterday</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.successRate}%</p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 ml-1">+2% from yesterday</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (7 Days)</h3>
          {revenueData ? (
            <Line
              data={revenueData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value: any) {
                        return formatCurrency(Number(value));
                      }
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="text-gray-500">Loading chart data...</div>
            </div>
          )}
        </div>

        {/* Vehicle Type Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Type Distribution</h3>
          {vehicleTypeData ? (
            <Doughnut
              data={vehicleTypeData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
              }}
            />
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="text-gray-500">Loading chart data...</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions and Plaza Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TruckIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.vehicleId}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatTime(transaction.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plaza Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Toll Plaza Status</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {plazas.map((plaza) => (
              <div key={plaza.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <MapPinIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {plaza.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {plaza.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {plaza.todayTransactions} transactions
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlazaStatusColor(plaza.status)}`}>
                      {plaza.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {notifications.slice(0, 5).map((notification, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-900">{notification.message}</p>
                    <p className="text-xs text-gray-500">
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
