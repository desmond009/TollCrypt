import { useState, useEffect, useCallback } from 'react';
import { dashboardStatsService, DashboardStats } from '../services/dashboardStatsService';
import socketService from '../services/socketService';

interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
  isConnected: boolean;
}

export const useDashboardStats = (userAddress?: string): UseDashboardStatsReturn => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    if (!userAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await dashboardStatsService.getUserStats(userAddress);
      
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to fetch dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  // Refresh stats manually
  const refreshStats = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Set up real-time listeners
  useEffect(() => {
    if (!userAddress) return;

    // Join user room for real-time updates
    socketService.joinUserRoom(userAddress);

    // Listen for new transactions
    const handleNewTransaction = (data: any) => {
      console.log('New transaction received, updating dashboard stats:', data);
      // Refresh stats when a new transaction is received
      fetchStats();
    };

    // Listen for transaction updates
    const handleTransactionUpdate = (data: any) => {
      console.log('Transaction update received, updating dashboard stats:', data);
      fetchStats();
    };

    // Listen for toll payment completion
    const handleTollPaymentCompleted = (data: any) => {
      console.log('Toll payment completed, updating dashboard stats:', data);
      fetchStats();
    };

    // Set up socket listeners
    socketService.on('transaction:new', handleNewTransaction);
    socketService.on('transaction:update', handleTransactionUpdate);
    socketService.on('toll:payment:completed', handleTollPaymentCompleted);

    // Check connection status
    const checkConnection = () => {
      const status = socketService.getConnectionStatus();
      setIsConnected(status.isConnected);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    // Cleanup
    return () => {
      socketService.off('transaction:new', handleNewTransaction);
      socketService.off('transaction:update', handleTransactionUpdate);
      socketService.off('toll:payment:completed', handleTollPaymentCompleted);
      clearInterval(interval);
    };
  }, [userAddress, fetchStats]);

  // Periodic refresh as fallback (every 30 seconds)
  useEffect(() => {
    if (!userAddress) return;

    const interval = setInterval(() => {
      fetchStats();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [userAddress, fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refreshStats,
    isConnected
  };
};
