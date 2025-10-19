// Utility functions for safe chart data processing

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    [key: string]: any;
  }>;
}

/**
 * Safely processes revenue data for Chart.js
 */
export const processRevenueData = (data: any): ChartData | null => {
  if (!data || !data.daily || !Array.isArray(data.daily)) {
    return null;
  }

  return {
    labels: data.daily.map((item: any) => 
      item.date ? new Date(item.date).toLocaleDateString() : 'Unknown'
    ),
    datasets: [{
      label: 'Revenue',
      data: data.daily.map((item: any) => item.revenue || 0),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.1,
    }]
  };
};

/**
 * Safely processes vehicle type data for Chart.js
 */
export const processVehicleTypeData = (data: any): ChartData | null => {
  if (!data || !data.distribution || !Array.isArray(data.distribution)) {
    return null;
  }

  return {
    labels: data.distribution.map((item: any) => item._id || 'Unknown'),
    datasets: [{
      label: 'Vehicle Types',
      data: data.distribution.map((item: any) => item.count || 0),
      backgroundColor: [
        '#3B82F6',
        '#10B981',
        '#F59E0B',
        '#EF4444',
        '#8B5CF6',
        '#06B6D4',
        '#84CC16',
      ],
    }]
  };
};

/**
 * Safely processes transaction data for Chart.js
 */
export const processTransactionData = (data: any): ChartData | null => {
  if (!data || !data.daily || !Array.isArray(data.daily)) {
    return null;
  }

  return {
    labels: data.daily.map((item: any) => 
      item.date ? new Date(item.date).toLocaleDateString() : 'Unknown'
    ),
    datasets: [{
      label: 'Transactions',
      data: data.daily.map((item: any) => item.count || 0),
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.1,
    }]
  };
};

/**
 * Safely processes vehicle registration data for Chart.js
 */
export const processVehicleRegistrationData = (data: any): ChartData | null => {
  if (!data || !data.newRegistrations || !Array.isArray(data.newRegistrations)) {
    return null;
  }

  return {
    labels: data.newRegistrations.map((item: any) => 
      item.date ? new Date(item.date).toLocaleDateString() : 'Unknown'
    ),
    datasets: [{
      label: 'New Registrations',
      data: data.newRegistrations.map((item: any) => item.count || 0),
      borderColor: 'rgb(245, 158, 11)',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      tension: 0.1,
    }]
  };
};

/**
 * Safely processes revenue by plaza data for Chart.js
 */
export const processRevenueByPlazaData = (data: any): ChartData | null => {
  if (!data || !data.byPlaza || !Array.isArray(data.byPlaza)) {
    return null;
  }

  return {
    labels: data.byPlaza.map((item: any) => item.plaza || 'Unknown'),
    datasets: [{
      label: 'Revenue',
      data: data.byPlaza.map((item: any) => item.amount || 0),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
    }]
  };
};

/**
 * Validates if chart data has the correct structure for Chart.js
 */
export const isValidChartData = (data: any): data is ChartData => {
  return (
    data &&
    Array.isArray(data.labels) &&
    Array.isArray(data.datasets) &&
    data.datasets.length > 0 &&
    Array.isArray(data.datasets[0].data)
  );
};
