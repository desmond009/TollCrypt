const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface VehicleRegistrationData {
  vehicleId: string;
  vehicleType: string;
  owner: string;
  documents: Array<{
    type: 'rc' | 'insurance' | 'pollution';
    name: string;
    uploadedAt: Date;
  }>;
  metadata?: {
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    engineNumber?: string;
    chassisNumber?: string;
  };
}

export interface VehicleResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface VehicleStats {
  totalVehicles: number;
  activeVehicles: number;
  blacklistedVehicles: number;
}

class VehicleAPIService {
  /**
   * Register a new vehicle in the database
   */
  async registerVehicle(vehicleData: VehicleRegistrationData): Promise<VehicleResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicles/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicleData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Vehicle registration error:', error);
      return {
        success: false,
        error: 'Failed to register vehicle in database'
      };
    }
  }

  /**
   * Get all vehicles for a user
   */
  async getUserVehicles(userAddress: string): Promise<VehicleResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicles/user/${userAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching user vehicles:', error);
      return {
        success: false,
        error: 'Failed to fetch user vehicles'
      };
    }
  }

  /**
   * Get vehicle by ID
   */
  async getVehicle(vehicleId: string): Promise<VehicleResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      return {
        success: false,
        error: 'Failed to fetch vehicle'
      };
    }
  }

  /**
   * Update vehicle information
   */
  async updateVehicle(vehicleId: string, updates: Partial<VehicleRegistrationData>): Promise<VehicleResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error updating vehicle:', error);
      return {
        success: false,
        error: 'Failed to update vehicle'
      };
    }
  }

  /**
   * Deactivate vehicle
   */
  async deactivateVehicle(vehicleId: string): Promise<VehicleResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error deactivating vehicle:', error);
      return {
        success: false,
        error: 'Failed to deactivate vehicle'
      };
    }
  }

  /**
   * Get vehicle statistics for a user
   */
  async getVehicleStats(userAddress: string): Promise<VehicleResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicles/stats/${userAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching vehicle stats:', error);
      return {
        success: false,
        error: 'Failed to fetch vehicle statistics'
      };
    }
  }

  /**
   * Sync local session data with backend
   */
  async syncSessionWithBackend(userAddress: string, vehicles: any[]): Promise<VehicleResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicles/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          vehicles
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error syncing session with backend:', error);
      return {
        success: false,
        error: 'Failed to sync session with backend'
      };
    }
  }
}

export const vehicleAPIService = new VehicleAPIService();
