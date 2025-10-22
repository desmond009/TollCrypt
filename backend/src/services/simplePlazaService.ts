import { SimplePlaza, ISimplePlaza } from '../models/SimplePlaza';

export interface SimplePlazaCreateData {
  id: string;
  name: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'maintenance' | 'inactive';
  tollRates: {
    '2-wheeler': number;
    '4-wheeler': number;
    'car': number;
    'lcv': number;
    'hcv': number;
    'truck': number;
    'bus': number;
  };
  operatingHours: {
    start: string;
    end: string;
  };
  assignedOperators?: string[];
  todayTransactions?: number;
  todayRevenue?: number;
}

export class SimplePlazaService {
  /**
   * Create a new simple plaza
   */
  static async createSimplePlaza(plazaData: SimplePlazaCreateData): Promise<ISimplePlaza> {
    try {
      // Check if plaza with same ID already exists
      const existingPlaza = await SimplePlaza.findOne({ id: plazaData.id });
      if (existingPlaza) {
        throw new Error('Plaza with this ID already exists');
      }

      const plaza = new SimplePlaza(plazaData);
      await plaza.save();
      return plaza;
    } catch (error: any) {
      throw new Error(`Failed to create simple plaza: ${error.message}`);
    }
  }

  /**
   * Get all simple plazas
   */
  static async getAllSimplePlazas(): Promise<ISimplePlaza[]> {
    try {
      return await SimplePlaza.find().sort({ createdAt: -1 });
    } catch (error: any) {
      throw new Error(`Failed to get simple plazas: ${error.message}`);
    }
  }

  /**
   * Get simple plaza by ID
   */
  static async getSimplePlazaById(id: string): Promise<ISimplePlaza | null> {
    try {
      return await SimplePlaza.findOne({ id });
    } catch (error: any) {
      throw new Error(`Failed to get simple plaza: ${error.message}`);
    }
  }

  /**
   * Update simple plaza
   */
  static async updateSimplePlaza(id: string, updateData: Partial<SimplePlazaCreateData>): Promise<ISimplePlaza | null> {
    try {
      const plaza = await SimplePlaza.findOne({ id });
      if (!plaza) {
        throw new Error('Simple plaza not found');
      }

      Object.assign(plaza, updateData);
      await plaza.save();
      return plaza;
    } catch (error: any) {
      throw new Error(`Failed to update simple plaza: ${error.message}`);
    }
  }

  /**
   * Delete simple plaza
   */
  static async deleteSimplePlaza(id: string): Promise<boolean> {
    try {
      const result = await SimplePlaza.deleteOne({ id });
      return result.deletedCount > 0;
    } catch (error: any) {
      throw new Error(`Failed to delete simple plaza: ${error.message}`);
    }
  }

  /**
   * Seed multiple simple plazas
   */
  static async seedSimplePlazas(plazaDataArray: SimplePlazaCreateData[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const plazaData of plazaDataArray) {
      try {
        await this.createSimplePlaza(plazaData);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed to create simple plaza ${plazaData.id}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Seed simple plazas with predefined data
   */
  static async seedPredefinedSimplePlazas(): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const predefinedPlazas: SimplePlazaCreateData[] = [
      {
        id: 'SIMPLE-MH-001',
        name: 'Mumbai-Pune Expressway - Khalapur',
        location: 'Khalapur, Maharashtra',
        coordinates: {
          lat: 18.5204,
          lng: 73.8567
        },
        status: 'active',
        tollRates: {
          '2-wheeler': 0.0001,
          '4-wheeler': 0.0003,
          'car': 0.0003,
          'lcv': 0.0005,
          'hcv': 0.0008,
          'truck': 0.0008,
          'bus': 0.0006
        },
        operatingHours: {
          start: '06:00',
          end: '22:00'
        },
        todayTransactions: 0,
        todayRevenue: 0
      },
      {
        id: 'SIMPLE-KA-001',
        name: 'Bangalore-Mysore Highway - Ramanagara',
        location: 'Ramanagara, Karnataka',
        coordinates: {
          lat: 12.7159,
          lng: 77.2771
        },
        status: 'active',
        tollRates: {
          '2-wheeler': 0.00008,
          '4-wheeler': 0.00025,
          'car': 0.00025,
          'lcv': 0.0004,
          'hcv': 0.0007,
          'truck': 0.0007,
          'bus': 0.0005
        },
        operatingHours: {
          start: '06:00',
          end: '22:00'
        },
        todayTransactions: 0,
        todayRevenue: 0
      },
      {
        id: 'SIMPLE-TN-001',
        name: 'Chennai-Bangalore Highway - Krishnagiri',
        location: 'Krishnagiri, Tamil Nadu',
        coordinates: {
          lat: 12.5207,
          lng: 78.2138
        },
        status: 'active',
        tollRates: {
          '2-wheeler': 0.00009,
          '4-wheeler': 0.00028,
          'car': 0.00028,
          'lcv': 0.00045,
          'hcv': 0.00075,
          'truck': 0.00075,
          'bus': 0.00055
        },
        operatingHours: {
          start: '06:00',
          end: '22:00'
        },
        todayTransactions: 0,
        todayRevenue: 0
      },
      {
        id: 'SIMPLE-GJ-001',
        name: 'Ahmedabad-Vadodara Expressway - Anand',
        location: 'Anand, Gujarat',
        coordinates: {
          lat: 22.5645,
          lng: 72.9289
        },
        status: 'active',
        tollRates: {
          '2-wheeler': 0.00007,
          '4-wheeler': 0.00022,
          'car': 0.00022,
          'lcv': 0.00035,
          'hcv': 0.0006,
          'truck': 0.0006,
          'bus': 0.00045
        },
        operatingHours: {
          start: '06:00',
          end: '22:00'
        },
        todayTransactions: 0,
        todayRevenue: 0
      },
      {
        id: 'SIMPLE-DL-001',
        name: 'Delhi-Gurgaon Expressway - Kherki Daula',
        location: 'Gurgaon, Haryana',
        coordinates: {
          lat: 28.4595,
          lng: 77.0266
        },
        status: 'active',
        tollRates: {
          '2-wheeler': 0.00012,
          '4-wheeler': 0.00035,
          'car': 0.00035,
          'lcv': 0.00055,
          'hcv': 0.0009,
          'truck': 0.0009,
          'bus': 0.0007
        },
        operatingHours: {
          start: '06:00',
          end: '22:00'
        },
        todayTransactions: 0,
        todayRevenue: 0
      },
      {
        id: 'SIMPLE-UP-001',
        name: 'Agra-Lucknow Expressway - Etawah',
        location: 'Etawah, Uttar Pradesh',
        coordinates: {
          lat: 26.7768,
          lng: 79.0235
        },
        status: 'active',
        tollRates: {
          '2-wheeler': 0.0001,
          '4-wheeler': 0.0003,
          'car': 0.0003,
          'lcv': 0.0005,
          'hcv': 0.0008,
          'truck': 0.0008,
          'bus': 0.0006
        },
        operatingHours: {
          start: '06:00',
          end: '22:00'
        },
        todayTransactions: 0,
        todayRevenue: 0
      },
      {
        id: 'SIMPLE-RJ-001',
        name: 'Jaipur-Delhi Highway - Behror',
        location: 'Behror, Rajasthan',
        coordinates: {
          lat: 27.8883,
          lng: 76.2833
        },
        status: 'active',
        tollRates: {
          '2-wheeler': 0.00008,
          '4-wheeler': 0.00025,
          'car': 0.00025,
          'lcv': 0.0004,
          'hcv': 0.0007,
          'truck': 0.0007,
          'bus': 0.0005
        },
        operatingHours: {
          start: '06:00',
          end: '22:00'
        },
        todayTransactions: 0,
        todayRevenue: 0
      },
      {
        id: 'SIMPLE-WB-001',
        name: 'Kolkata-Durgapur Expressway - Bardhaman',
        location: 'Bardhaman, West Bengal',
        coordinates: {
          lat: 23.2402,
          lng: 87.8694
        },
        status: 'active',
        tollRates: {
          '2-wheeler': 0.00009,
          '4-wheeler': 0.00028,
          'car': 0.00028,
          'lcv': 0.00045,
          'hcv': 0.00075,
          'truck': 0.00075,
          'bus': 0.00055
        },
        operatingHours: {
          start: '06:00',
          end: '22:00'
        },
        todayTransactions: 0,
        todayRevenue: 0
      }
    ];

    return await this.seedSimplePlazas(predefinedPlazas);
  }

  /**
   * Clear all simple plazas
   */
  static async clearAllSimplePlazas(): Promise<{ deletedCount: number }> {
    try {
      const result = await SimplePlaza.deleteMany({});
      return { deletedCount: result.deletedCount };
    } catch (error: any) {
      throw new Error(`Failed to clear simple plazas: ${error.message}`);
    }
  }

  /**
   * Get simple plaza statistics
   */
  static async getSimplePlazaStats(): Promise<{
    totalPlazas: number;
    activePlazas: number;
    inactivePlazas: number;
    maintenancePlazas: number;
    totalTransactions: number;
    totalRevenue: number;
  }> {
    try {
      const [totalPlazas, activePlazas, inactivePlazas, maintenancePlazas, plazas] = await Promise.all([
        SimplePlaza.countDocuments(),
        SimplePlaza.countDocuments({ status: 'active' }),
        SimplePlaza.countDocuments({ status: 'inactive' }),
        SimplePlaza.countDocuments({ status: 'maintenance' }),
        SimplePlaza.find()
      ]);

      const totalTransactions = plazas.reduce((sum, plaza) => sum + plaza.todayTransactions, 0);
      const totalRevenue = plazas.reduce((sum, plaza) => sum + plaza.todayRevenue, 0);

      return {
        totalPlazas,
        activePlazas,
        inactivePlazas,
        maintenancePlazas,
        totalTransactions,
        totalRevenue
      };
    } catch (error: any) {
      throw new Error(`Failed to get simple plaza stats: ${error.message}`);
    }
  }
}

export default SimplePlazaService;
