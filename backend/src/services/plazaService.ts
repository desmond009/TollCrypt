import { TollPlaza, ITollPlaza, VehicleCategory, PlazaStatus, TravelDirection, PaymentMethod } from '../models/TollPlaza';
import { TollRate, ITollRate } from '../models/TollRate';
import mongoose from 'mongoose';

export interface PlazaSearchFilters {
  regionCode?: string;
  status?: PlazaStatus;
  travelDirection?: TravelDirection;
  paymentMethod?: PaymentMethod;
  is24x7?: boolean;
  minLanes?: number;
  maxLanes?: number;
}

export interface PlazaProximitySearch {
  latitude: number;
  longitude: number;
  radiusInKm?: number;
  maxResults?: number;
}

export interface PlazaCreateData {
  identification: {
    uniqueId: string;
    name: string;
    regionCode: string;
    operatorName: string;
    licenseNumber: string;
  };
  location: {
    gpsCoordinates: {
      latitude: number;
      longitude: number;
    };
    physicalAddress: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
    };
    nearestLandmark: string;
    travelDirection: TravelDirection;
  };
  tollRates: {
    vehicleCategories: {
      [key in VehicleCategory]: number;
    };
    timeBasedMultipliers: {
      peakHourMultiplier: number;
      offPeakMultiplier: number;
      peakHours: {
        start: string;
        end: string;
      };
    };
    discountCodes?: any[];
    returnJourneyValidity: number;
  };
  operational: {
    operatingHours: {
      is24x7: boolean;
      specificTimings?: {
        start: string;
        end: string;
      };
    };
    laneConfiguration: {
      totalLanes: number;
      etcEnabledLanes: number;
      manualLanes: number;
    };
    paymentMethods: PaymentMethod[];
    smartContractAddress: string;
    lastRateRevisionDate: Date;
    nextRevisionDate?: Date;
  };
  compliance: {
    governmentAuthorizationNumber: string;
    taxId: string;
    auditTrailHash: string;
    rateApprovalDocumentHash: string;
    complianceStatus: 'compliant' | 'pending' | 'non_compliant';
    lastAuditDate: Date;
    nextAuditDate: Date;
  };
}

export interface PlazaUpdateData {
  identification?: Partial<PlazaCreateData['identification']>;
  location?: Partial<PlazaCreateData['location']>;
  tollRates?: Partial<PlazaCreateData['tollRates']>;
  operational?: Partial<PlazaCreateData['operational']>;
  compliance?: Partial<PlazaCreateData['compliance']>;
  status?: PlazaStatus;
  assignedOperators?: string[];
}

export class PlazaService {
  /**
   * Create a new toll plaza
   */
  static async createPlaza(plazaData: PlazaCreateData): Promise<ITollPlaza> {
    try {
      // Validate unique constraints
      const existingPlaza = await TollPlaza.findOne({
        $or: [
          { 'identification.uniqueId': plazaData.identification.uniqueId },
          { 'identification.licenseNumber': plazaData.identification.licenseNumber },
          { 'compliance.governmentAuthorizationNumber': plazaData.compliance.governmentAuthorizationNumber },
          { 'compliance.taxId': plazaData.compliance.taxId }
        ]
      });

      if (existingPlaza) {
        throw new Error('Plaza with this unique ID, license number, authorization number, or tax ID already exists');
      }

      // Validate lane configuration
      const { totalLanes, etcEnabledLanes, manualLanes } = plazaData.operational.laneConfiguration;
      if (etcEnabledLanes + manualLanes > totalLanes) {
        throw new Error('Sum of ETC and manual lanes cannot exceed total lanes');
      }

      const plaza = new TollPlaza(plazaData);
      await plaza.save();

      // Create initial toll rates for each vehicle category
      await this.createInitialTollRates(plaza.identification.uniqueId, plazaData.tollRates);

      return plaza;
    } catch (error) {
      throw new Error(`Failed to create plaza: ${error.message}`);
    }
  }

  /**
   * Get plaza by unique ID
   */
  static async getPlazaByUniqueId(uniqueId: string): Promise<ITollPlaza | null> {
    try {
      return await TollPlaza.findOne({ 'identification.uniqueId': uniqueId });
    } catch (error) {
      throw new Error(`Failed to get plaza: ${error.message}`);
    }
  }

  /**
   * Get plaza by ID
   */
  static async getPlazaById(id: string): Promise<ITollPlaza | null> {
    try {
      return await TollPlaza.findById(id);
    } catch (error) {
      throw new Error(`Failed to get plaza: ${error.message}`);
    }
  }

  /**
   * Search plazas with filters
   */
  static async searchPlazas(filters: PlazaSearchFilters = {}, page: number = 1, limit: number = 10): Promise<{
    plazas: ITollPlaza[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query: any = {};

      if (filters.regionCode) {
        query['identification.regionCode'] = filters.regionCode;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.travelDirection) {
        query['location.travelDirection'] = filters.travelDirection;
      }

      if (filters.paymentMethod) {
        query['operational.paymentMethods'] = filters.paymentMethod;
      }

      if (filters.is24x7 !== undefined) {
        query['operational.operatingHours.is24x7'] = filters.is24x7;
      }

      if (filters.minLanes || filters.maxLanes) {
        query['operational.laneConfiguration.totalLanes'] = {};
        if (filters.minLanes) {
          query['operational.laneConfiguration.totalLanes'].$gte = filters.minLanes;
        }
        if (filters.maxLanes) {
          query['operational.laneConfiguration.totalLanes'].$lte = filters.maxLanes;
        }
      }

      const skip = (page - 1) * limit;
      const [plazas, total] = await Promise.all([
        TollPlaza.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
        TollPlaza.countDocuments(query)
      ]);

      return {
        plazas,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Failed to search plazas: ${error.message}`);
    }
  }

  /**
   * Find plazas by proximity
   */
  static async findPlazasByProximity(searchParams: PlazaProximitySearch): Promise<ITollPlaza[]> {
    try {
      const { latitude, longitude, radiusInKm = 10, maxResults = 20 } = searchParams;

      // Use MongoDB's geospatial query
      const plazas = await TollPlaza.find({
        'location.gpsCoordinates.latitude': {
          $gte: latitude - (radiusInKm / 111),
          $lte: latitude + (radiusInKm / 111)
        },
        'location.gpsCoordinates.longitude': {
          $gte: longitude - (radiusInKm / (111 * Math.cos(latitude * Math.PI / 180))),
          $lte: longitude + (radiusInKm / (111 * Math.cos(latitude * Math.PI / 180)))
        },
        status: PlazaStatus.ACTIVE
      }).limit(maxResults);

      // Calculate actual distances and sort
      const plazasWithDistance = plazas.map(plaza => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          plaza.location.gpsCoordinates.latitude,
          plaza.location.gpsCoordinates.longitude
        );
        return { plaza, distance };
      });

      return plazasWithDistance
        .sort((a, b) => a.distance - b.distance)
        .map(item => item.plaza);
    } catch (error) {
      throw new Error(`Failed to find plazas by proximity: ${error.message}`);
    }
  }

  /**
   * Update plaza
   */
  static async updatePlaza(uniqueId: string, updateData: PlazaUpdateData): Promise<ITollPlaza | null> {
    try {
      const plaza = await TollPlaza.findOne({ 'identification.uniqueId': uniqueId });
      if (!plaza) {
        throw new Error('Plaza not found');
      }

      // Validate lane configuration if provided
      if (updateData.operational?.laneConfiguration) {
        const { totalLanes, etcEnabledLanes, manualLanes } = updateData.operational.laneConfiguration;
        if (etcEnabledLanes + manualLanes > totalLanes) {
          throw new Error('Sum of ETC and manual lanes cannot exceed total lanes');
        }
      }

      Object.assign(plaza, updateData);
      await plaza.save();

      return plaza;
    } catch (error) {
      throw new Error(`Failed to update plaza: ${error.message}`);
    }
  }

  /**
   * Delete plaza
   */
  static async deletePlaza(uniqueId: string): Promise<boolean> {
    try {
      const result = await TollPlaza.deleteOne({ 'identification.uniqueId': uniqueId });
      
      // Also delete associated toll rates
      await TollRate.deleteMany({ plazaUniqueId: uniqueId });
      
      return result.deletedCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete plaza: ${error.message}`);
    }
  }

  /**
   * Calculate toll for a vehicle at a plaza
   */
  static async calculateToll(
    plazaUniqueId: string,
    vehicleType: VehicleCategory,
    timestamp: Date = new Date(),
    discountCode?: string
  ): Promise<{
    baseRate: number;
    multiplier: number;
    finalRate: number;
    discountApplied: number;
    currency: string;
  }> {
    try {
      const plaza = await TollPlaza.findOne({ 'identification.uniqueId': plazaUniqueId });
      if (!plaza) {
        throw new Error('Plaza not found');
      }

      const baseRate = plaza.tollRates.vehicleCategories[vehicleType];
      if (baseRate === undefined) {
        throw new Error(`Vehicle type ${vehicleType} not supported at this plaza`);
      }

      // Calculate time-based multiplier
      const hour = timestamp.getHours();
      const minute = timestamp.getMinutes();
      const currentTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      const { peakHours, peakHourMultiplier, offPeakMultiplier } = plaza.tollRates.timeBasedMultipliers;
      
      let multiplier = offPeakMultiplier;
      if (currentTime >= peakHours.start && currentTime <= peakHours.end) {
        multiplier = peakHourMultiplier;
      }

      let finalRate = baseRate * multiplier;
      let discountApplied = 0;

      // Apply discount code if provided
      if (discountCode) {
        const discount = plaza.tollRates.discountCodes.find(
          d => d.code === discountCode && 
               d.validFrom <= timestamp && 
               d.validTo >= timestamp &&
               d.currentUsage < d.maxUsage
        );

        if (discount) {
          if (discount.discountType === 'percentage') {
            discountApplied = finalRate * (discount.discountValue / 100);
          } else {
            discountApplied = discount.discountValue;
          }
          finalRate = Math.max(0, finalRate - discountApplied);
        }
      }

      return {
        baseRate,
        multiplier,
        finalRate: Number(finalRate.toFixed(6)),
        discountApplied: Number(discountApplied.toFixed(6)),
        currency: 'ETH'
      };
    } catch (error) {
      throw new Error(`Failed to calculate toll: ${error.message}`);
    }
  }

  /**
   * Get plaza analytics
   */
  static async getPlazaAnalytics(uniqueId: string, period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<any> {
    try {
      const plaza = await TollPlaza.findOne({ 'identification.uniqueId': uniqueId });
      if (!plaza) {
        throw new Error('Plaza not found');
      }

      // This would typically involve querying transaction data
      // For now, return the stored analytics
      return {
        plazaId: uniqueId,
        plazaName: plaza.identification.name,
        period,
        analytics: plaza.analytics,
        lastUpdated: plaza.updatedAt
      };
    } catch (error) {
      throw new Error(`Failed to get plaza analytics: ${error.message}`);
    }
  }

  /**
   * Update plaza analytics
   */
  static async updatePlazaAnalytics(
    uniqueId: string,
    analyticsUpdate: Partial<ITollPlaza['analytics']>
  ): Promise<ITollPlaza | null> {
    try {
      const plaza = await TollPlaza.findOne({ 'identification.uniqueId': uniqueId });
      if (!plaza) {
        throw new Error('Plaza not found');
      }

      Object.assign(plaza.analytics, analyticsUpdate);
      await plaza.save();

      return plaza;
    } catch (error) {
      throw new Error(`Failed to update plaza analytics: ${error.message}`);
    }
  }

  /**
   * Create initial toll rates for a plaza
   */
  private static async createInitialTollRates(
    plazaUniqueId: string,
    tollRatesData: PlazaCreateData['tollRates']
  ): Promise<void> {
    try {
      const tollRates = Object.entries(tollRatesData.vehicleCategories).map(([vehicleType, baseRate]) => ({
        id: `${plazaUniqueId}-${vehicleType}-${Date.now()}`,
        plazaUniqueId,
        vehicleType: vehicleType as VehicleCategory,
        baseRate,
        peakHourMultiplier: tollRatesData.timeBasedMultipliers.peakHourMultiplier,
        offPeakMultiplier: tollRatesData.timeBasedMultipliers.offPeakMultiplier,
        discountRules: [],
        effectiveFrom: new Date(),
        isActive: true,
        revisionNumber: 1,
        approvedBy: 'system', // This should be the admin who created the plaza
        approvalDocumentHash: '0x' + '0'.repeat(64) // Placeholder hash
      }));

      await TollRate.insertMany(tollRates);
    } catch (error) {
      throw new Error(`Failed to create initial toll rates: ${error.message}`);
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export default PlazaService;
