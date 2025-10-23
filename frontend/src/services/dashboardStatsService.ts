const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

export interface DashboardStats {
  totalTransactions: number;
  totalSpent: number;
  totalVehicles: number;
  recentTransactions: Array<{
    transactionId: string;
    vehicleId: string;
    amount: number;
    status: string;
    timestamp: string;
    tollLocation?: string;
  }>;
}

export interface DashboardStatsResponse {
  success: boolean;
  data?: DashboardStats;
  error?: string;
}

class DashboardStatsService {
  /**
   * Get dashboard statistics for a specific user
   */
  async getUserStats(userAddress: string): Promise<DashboardStatsResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tolls/stats/${userAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        success: false,
        error: 'Failed to fetch dashboard statistics'
      };
    }
  }

  /**
   * Get wallet statistics for a specific user
   */
  async getWalletStats(userAddress: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/topup-wallet/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Address': userAddress
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
      return {
        success: false,
        error: 'Failed to fetch wallet statistics'
      };
    }
  }
}

export const dashboardStatsService = new DashboardStatsService();
