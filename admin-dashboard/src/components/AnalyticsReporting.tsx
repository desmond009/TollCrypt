import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import {
  ArrowDownTrayIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { format, subDays, subMonths, subYears } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  processRevenueData, 
  processVehicleTypeData, 
  processTransactionData, 
  processVehicleRegistrationData, 
  processRevenueByPlazaData, 
  isValidChartData 
} from '../utils/chartUtils';

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

interface AnalyticsFilters {
  dateRange: {
    start: string;
    end: string;
  };
  period: '7d' | '30d' | '90d' | '1y' | 'custom';
  plazaId: string;
  vehicleType: string;
  reportType: 'revenue' | 'transactions' | 'vehicles' | 'performance';
}

interface AnalyticsData {
  revenue: {
    total: number;
    daily: Array<{ date: string; amount: number }>;
    byPlaza: Array<{ plaza: string; amount: number }>;
    byVehicleType: Array<{ type: string; amount: number }>;
    growth: number;
  };
  transactions: {
    total: number;
    daily: Array<{ date: string; count: number }>;
    successRate: number;
    averageAmount: number;
    peakHours: Array<{ hour: number; count: number }>;
  };
  vehicles: {
    total: number;
    newRegistrations: Array<{ date: string; count: number }>;
    byType: Array<{ type: string; count: number }>;
    blacklisted: number;
    active: number;
  };
  performance: {
    averageWaitTime: number;
    plazaPerformance: Array<{
      plaza: string;
      transactions: number;
      revenue: number;
      waitTime: number;
      successRate: number;
    }>;
    systemUptime: number;
    errorRate: number;
  };
}

interface AnalyticsReportingProps {
  socket: any;
}

export const AnalyticsReporting: React.FC<AnalyticsReportingProps> = ({ socket }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plazas, setPlazas] = useState<any[]>([]);
  const [vehicleTypes] = useState([
    '2-wheeler', '4-wheeler', 'car', 'lcv', 'hcv', 'truck', 'bus'
  ]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AnalyticsFilters>({
    defaultValues: {
      period: '30d',
      reportType: 'revenue',
    }
  });

  const filters = watch();

  // Fetch analytics data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Set default date range based on period
        let startDate: Date;
        let endDate = new Date();
        
        switch (filters.period) {
          case '7d':
            startDate = subDays(endDate, 7);
            break;
          case '30d':
            startDate = subDays(endDate, 30);
            break;
          case '90d':
            startDate = subDays(endDate, 90);
            break;
          case '1y':
            startDate = subYears(endDate, 1);
            break;
          default:
            startDate = filters.dateRange?.start ? new Date(filters.dateRange.start) : subDays(endDate, 30);
            endDate = filters.dateRange?.end ? new Date(filters.dateRange.end) : endDate;
        }

        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          plazaId: filters.plazaId || '',
          vehicleType: filters.vehicleType || '',
          reportType: filters.reportType || 'revenue',
        });

        const response = await api.get(`/api/analytics?${params}`);
        
        if (response.data && response.data.success) {
          setData(response.data.data);
        } else {
          throw new Error('Invalid response format from analytics API');
        }
      } catch (error: any) {
        console.error('Failed to fetch analytics data:', error);
        setError(error.message || 'Failed to fetch analytics data');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  // Fetch plazas for filter
  useEffect(() => {
    const fetchPlazas = async () => {
      try {
        const response = await api.get('/api/admin/plazas');
        setPlazas(response.data.data);
      } catch (error) {
        console.error('Failed to fetch plazas:', error);
      }
    };

    fetchPlazas();
  }, []);

  const handlePeriodChange = (period: string) => {
    setValue('period', period as any);
    if (period !== 'custom') {
      setValue('dateRange', { start: '', end: '' });
    }
  };

  const exportToPDF = async () => {
    const element = document.getElementById('analytics-report');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`analytics-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    let csvContent = '';
    
    switch (filters.reportType) {
      case 'revenue':
        csvContent = [
          ['Date', 'Revenue'],
          ...(data.revenue?.daily || []).map(item => [item.date, item.amount.toString()])
        ].map(row => row.join(',')).join('\n');
        break;
      case 'transactions':
        csvContent = [
          ['Date', 'Transaction Count'],
          ...(data.transactions?.daily || []).map(item => [item.date, item.count.toString()])
        ].map(row => row.join(',')).join('\n');
        break;
      case 'vehicles':
        csvContent = [
          ['Date', 'New Registrations'],
          ...(data.vehicles?.newRegistrations || []).map(item => [item.date, item.count.toString()])
        ].map(row => row.join(',')).join('\n');
        break;
      default:
        csvContent = 'No data available';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${filters.reportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(4)} ETH`;
  };

  const getChartData = () => {
    if (!data) return null;

    switch (filters.reportType) {
      case 'revenue':
        return data.revenue ? processRevenueData(data.revenue) : null;
      case 'transactions':
        return data.transactions ? processTransactionData(data.transactions) : null;
      case 'vehicles':
        return data.vehicles ? processVehicleRegistrationData(data.vehicles) : null;
      default:
        return null;
    }
  };

  const getVehicleTypeData = () => {
    if (!data || !data.vehicles) return null;
    return processVehicleTypeData(data.vehicles);
  };

  const getRevenueByPlazaData = () => {
    if (!data || !data.revenue) return null;
    return processRevenueByPlazaData(data.revenue);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading analytics data</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reporting</h1>
          <p className="text-gray-600">Comprehensive analytics and reporting for toll collection system</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              {...register('reportType')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="revenue">Revenue</option>
              <option value="transactions">Transactions</option>
              <option value="vehicles">Vehicles</option>
              <option value="performance">Performance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <select
              {...register('period')}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="custom">Custom range</option>
            </select>
          </div>

          {filters.period === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  {...register('dateRange.start')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  {...register('dateRange.end')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plaza</label>
            <select
              {...register('plazaId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Plazas</option>
              {plazas.map(plaza => (
                <option key={plaza.id} value={plaza.id}>{plaza.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
            <select
              {...register('vehicleType')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              {vehicleTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Analytics Report */}
      <div id="analytics-report" className="space-y-6">
        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(data.revenue?.total || 0)}
                    </p>
                    <p className="text-sm text-green-600">
                      {data.revenue?.growth ? (data.revenue.growth > 0 ? '+' : '') + data.revenue.growth.toFixed(1) + '%' : '0%'} from previous period
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TruckIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-semibold text-gray-900">{data.transactions?.total || 0}</p>
                    <p className="text-sm text-blue-600">
                      {data.transactions?.successRate ? data.transactions.successRate.toFixed(1) : '0'}% success rate
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <TruckIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                    <p className="text-2xl font-semibold text-gray-900">{data.vehicles?.total || 0}</p>
                    <p className="text-sm text-yellow-600">
                      {data.vehicles?.active || 0} active, {data.vehicles?.blacklisted || 0} blacklisted
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <ClockIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {data.performance?.averageWaitTime ? data.performance.averageWaitTime.toFixed(1) : '0'}s
                    </p>
                    <p className="text-sm text-purple-600">
                      {data.performance?.systemUptime ? data.performance.systemUptime.toFixed(1) : '0'}% uptime
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Main Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {filters.reportType === 'revenue' && 'Revenue Trend'}
                  {filters.reportType === 'transactions' && 'Transaction Volume'}
                  {filters.reportType === 'vehicles' && 'Vehicle Registrations'}
                  {filters.reportType === 'performance' && 'Performance Metrics'}
                </h3>
                {isValidChartData(getChartData()) ? (
                  <Line
                    data={getChartData()!}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-gray-500">No chart data available</div>
                  </div>
                )}
              </div>

              {/* Vehicle Type Distribution */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Type Distribution</h3>
                {isValidChartData(getVehicleTypeData()) ? (
                  <Doughnut
                    data={getVehicleTypeData()!}
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
                    <div className="text-gray-500">No vehicle type data available</div>
                  </div>
                )}
              </div>
            </div>

            {/* Revenue by Plaza */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Plaza</h3>
              {isValidChartData(getRevenueByPlazaData()) ? (
                <Bar
                  data={getRevenueByPlazaData()!}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top' as const,
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
                  <div className="text-gray-500">No revenue by plaza data available</div>
                </div>
              )}
            </div>

            {/* Performance Table */}
            {filters.reportType === 'performance' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Plaza Performance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Plaza
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transactions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Wait Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Success Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(data.performance?.plazaPerformance || []).map((plaza, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {plaza.plaza}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {plaza.transactions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(plaza.revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {plaza.waitTime.toFixed(1)}s
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {plaza.successRate.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
