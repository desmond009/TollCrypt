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
    } catch (error: any) {
      throw new Error(`Failed to create plaza: ${error.message}`);
    }
  }

  /**
   * Get plaza by unique ID
   */
  static async getPlazaByUniqueId(uniqueId: string): Promise<ITollPlaza | null> {
    try {
      return await TollPlaza.findOne({ 'identification.uniqueId': uniqueId });
    } catch (error: any) {
      throw new Error(`Failed to get plaza: ${error.message}`);
    }
  }

  /**
   * Get plaza by ID
   */
  static async getPlazaById(id: string): Promise<ITollPlaza | null> {
    try {
      return await TollPlaza.findById(id);
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      throw new Error(`Failed to create initial toll rates: ${error.message}`);
    }
  }

  /**
   * Seed multiple plazas with predefined data
   */
  static async seedPlazas(plazaDataArray: PlazaCreateData[]): Promise<{
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
        await this.createPlaza(plazaData);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed to create plaza ${plazaData.identification.uniqueId}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Seed plazas with predefined Indian toll plaza data
   */
  static async seedIndianPlazas(): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const indianPlazas: PlazaCreateData[] = [
      {
        identification: {
          uniqueId: 'PLAZA-MH-001',
          name: 'Mumbai-Pune Expressway - Khalapur Plaza',
          regionCode: 'MH-PU',
          operatorName: 'Maharashtra State Road Development Corporation',
          licenseNumber: 'MSRDC-LIC-001'
        },
        location: {
          gpsCoordinates: {
            latitude: 18.5204,
            longitude: 73.8567
          },
          physicalAddress: {
            street: 'Mumbai-Pune Expressway',
            city: 'Khalapur',
            state: 'Maharashtra',
            postalCode: '410202',
            country: 'India'
          },
          nearestLandmark: 'Khalapur Toll Plaza',
          travelDirection: TravelDirection.EAST
        },
        tollRates: {
          vehicleCategories: {
            [VehicleCategory.TWO_WHEELER]: 0.0001,
            [VehicleCategory.FOUR_WHEELER]: 0.0003,
            [VehicleCategory.LCV]: 0.0005,
            [VehicleCategory.HCV]: 0.0008,
            [VehicleCategory.BUS]: 0.0006,
            [VehicleCategory.MAV]: 0.0012
          },
          timeBasedMultipliers: {
            peakHourMultiplier: 1.5,
            offPeakMultiplier: 1.0,
            peakHours: {
              start: '07:00',
              end: '19:00'
            }
          },
          discountCodes: [],
          returnJourneyValidity: 24
        },
        operational: {
          operatingHours: {
            is24x7: true
          },
          laneConfiguration: {
            totalLanes: 8,
            etcEnabledLanes: 6,
            manualLanes: 2
          },
          paymentMethods: [PaymentMethod.ETH_WALLET, PaymentMethod.POLYGON_WALLET, PaymentMethod.UPI],
          smartContractAddress: '0x1234567890123456789012345678901234567890',
          lastRateRevisionDate: new Date(),
          nextRevisionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        compliance: {
          governmentAuthorizationNumber: 'GOV-MH-2024-001',
          taxId: '27AABCU9603R1ZX',
          auditTrailHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          rateApprovalDocumentHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          complianceStatus: 'compliant',
          lastAuditDate: new Date(),
          nextAuditDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        }
      },
      {
        identification: {
          uniqueId: 'PLAZA-KA-001',
          name: 'Bangalore-Mysore Highway - Ramanagara Plaza',
          regionCode: 'KA-BG',
          operatorName: 'Karnataka State Highways Development Corporation',
          licenseNumber: 'KSHDC-LIC-001'
        },
        location: {
          gpsCoordinates: {
            latitude: 12.7159,
            longitude: 77.2771
          },
          physicalAddress: {
            street: 'Bangalore-Mysore Highway',
            city: 'Ramanagara',
            state: 'Karnataka',
            postalCode: '562159',
            country: 'India'
          },
          nearestLandmark: 'Ramanagara Toll Plaza',
          travelDirection: TravelDirection.SOUTH
        },
        tollRates: {
          vehicleCategories: {
            [VehicleCategory.TWO_WHEELER]: 0.00008,
            [VehicleCategory.FOUR_WHEELER]: 0.00025,
            [VehicleCategory.LCV]: 0.0004,
            [VehicleCategory.HCV]: 0.0007,
            [VehicleCategory.BUS]: 0.0005,
            [VehicleCategory.MAV]: 0.001
          },
          timeBasedMultipliers: {
            peakHourMultiplier: 1.3,
            offPeakMultiplier: 1.0,
            peakHours: {
              start: '08:00',
              end: '20:00'
            }
          },
          discountCodes: [],
          returnJourneyValidity: 24
        },
        operational: {
          operatingHours: {
            is24x7: true
          },
          laneConfiguration: {
            totalLanes: 6,
            etcEnabledLanes: 4,
            manualLanes: 2
          },
          paymentMethods: [PaymentMethod.ETH_WALLET, PaymentMethod.POLYGON_WALLET, PaymentMethod.UPI],
          smartContractAddress: '0x2345678901234567890123456789012345678901',
          lastRateRevisionDate: new Date(),
          nextRevisionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        compliance: {
          governmentAuthorizationNumber: 'GOV-KA-2024-001',
          taxId: '29ABCDE1234F1Z5',
          auditTrailHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          rateApprovalDocumentHash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
          complianceStatus: 'compliant',
          lastAuditDate: new Date(),
          nextAuditDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        }
      },
      {
        identification: {
          uniqueId: 'PLAZA-TN-001',
          name: 'Chennai-Bangalore Highway - Krishnagiri Plaza',
          regionCode: 'TN-CH',
          operatorName: 'Tamil Nadu Highways Department',
          licenseNumber: 'TNHD-LIC-001'
        },
        location: {
          gpsCoordinates: {
            latitude: 12.5207,
            longitude: 78.2138
          },
          physicalAddress: {
            street: 'Chennai-Bangalore Highway',
            city: 'Krishnagiri',
            state: 'Tamil Nadu',
            postalCode: '635001',
            country: 'India'
          },
          nearestLandmark: 'Krishnagiri Toll Plaza',
          travelDirection: TravelDirection.WEST
        },
        tollRates: {
          vehicleCategories: {
            [VehicleCategory.TWO_WHEELER]: 0.00009,
            [VehicleCategory.FOUR_WHEELER]: 0.00028,
            [VehicleCategory.LCV]: 0.00045,
            [VehicleCategory.HCV]: 0.00075,
            [VehicleCategory.BUS]: 0.00055,
            [VehicleCategory.MAV]: 0.0011
          },
          timeBasedMultipliers: {
            peakHourMultiplier: 1.4,
            offPeakMultiplier: 1.0,
            peakHours: {
              start: '07:30',
              end: '19:30'
            }
          },
          discountCodes: [],
          returnJourneyValidity: 24
        },
        operational: {
          operatingHours: {
            is24x7: true
          },
          laneConfiguration: {
            totalLanes: 10,
            etcEnabledLanes: 8,
            manualLanes: 2
          },
          paymentMethods: [PaymentMethod.ETH_WALLET, PaymentMethod.POLYGON_WALLET, PaymentMethod.UPI],
          smartContractAddress: '0x3456789012345678901234567890123456789012',
          lastRateRevisionDate: new Date(),
          nextRevisionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        compliance: {
          governmentAuthorizationNumber: 'GOV-TN-2024-001',
          taxId: '33ABCDE1234F1Z5',
          auditTrailHash: '0x2345678901bcdef2345678901bcdef2345678901bcdef2345678901bcdef234567',
          rateApprovalDocumentHash: '0x8765432109edcba8765432109edcba8765432109edcba8765432109edcba876543',
          complianceStatus: 'compliant',
          lastAuditDate: new Date(),
          nextAuditDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        }
      },
      {
        identification: {
          uniqueId: 'PLAZA-GJ-001',
          name: 'Ahmedabad-Vadodara Expressway - Anand Plaza',
          regionCode: 'GJ-AH',
          operatorName: 'Gujarat State Road Development Corporation',
          licenseNumber: 'GSRDC-LIC-001'
        },
        location: {
          gpsCoordinates: {
            latitude: 22.5645,
            longitude: 72.9289
          },
          physicalAddress: {
            street: 'Ahmedabad-Vadodara Expressway',
            city: 'Anand',
            state: 'Gujarat',
            postalCode: '388001',
            country: 'India'
          },
          nearestLandmark: 'Anand Toll Plaza',
          travelDirection: TravelDirection.NORTH
        },
        tollRates: {
          vehicleCategories: {
            [VehicleCategory.TWO_WHEELER]: 0.00007,
            [VehicleCategory.FOUR_WHEELER]: 0.00022,
            [VehicleCategory.LCV]: 0.00035,
            [VehicleCategory.HCV]: 0.0006,
            [VehicleCategory.BUS]: 0.00045,
            [VehicleCategory.MAV]: 0.0009
          },
          timeBasedMultipliers: {
            peakHourMultiplier: 1.2,
            offPeakMultiplier: 1.0,
            peakHours: {
              start: '08:00',
              end: '20:00'
            }
          },
          discountCodes: [],
          returnJourneyValidity: 24
        },
        operational: {
          operatingHours: {
            is24x7: true
          },
          laneConfiguration: {
            totalLanes: 8,
            etcEnabledLanes: 6,
            manualLanes: 2
          },
          paymentMethods: [PaymentMethod.ETH_WALLET, PaymentMethod.POLYGON_WALLET, PaymentMethod.UPI],
          smartContractAddress: '0x4567890123456789012345678901234567890123',
          lastRateRevisionDate: new Date(),
          nextRevisionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        compliance: {
          governmentAuthorizationNumber: 'GOV-GJ-2024-001',
          taxId: '24ABCDE1234F1Z5',
          auditTrailHash: '0x3456789012cdef3456789012cdef3456789012cdef3456789012cdef3456789012',
          rateApprovalDocumentHash: '0x7654321098dcba7654321098dcba7654321098dcba7654321098dcba7654321098',
          complianceStatus: 'compliant',
          lastAuditDate: new Date(),
          nextAuditDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        }
      },
      {
        identification: {
          uniqueId: 'PLAZA-DL-001',
          name: 'Delhi-Gurgaon Expressway - Kherki Daula Plaza',
          regionCode: 'DL-GG',
          operatorName: 'Delhi-Gurgaon Expressway Limited',
          licenseNumber: 'DGEL-LIC-001'
        },
        location: {
          gpsCoordinates: {
            latitude: 28.4595,
            longitude: 77.0266
          },
          physicalAddress: {
            street: 'Delhi-Gurgaon Expressway',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122001',
            country: 'India'
          },
          nearestLandmark: 'Kherki Daula Toll Plaza',
          travelDirection: TravelDirection.SOUTH
        },
        tollRates: {
          vehicleCategories: {
            [VehicleCategory.TWO_WHEELER]: 0.00012,
            [VehicleCategory.FOUR_WHEELER]: 0.00035,
            [VehicleCategory.LCV]: 0.00055,
            [VehicleCategory.HCV]: 0.0009,
            [VehicleCategory.BUS]: 0.0007,
            [VehicleCategory.MAV]: 0.0013
          },
          timeBasedMultipliers: {
            peakHourMultiplier: 1.6,
            offPeakMultiplier: 1.0,
            peakHours: {
              start: '07:00',
              end: '21:00'
            }
          },
          discountCodes: [],
          returnJourneyValidity: 24
        },
        operational: {
          operatingHours: {
            is24x7: true
          },
          laneConfiguration: {
            totalLanes: 12,
            etcEnabledLanes: 10,
            manualLanes: 2
          },
          paymentMethods: [PaymentMethod.ETH_WALLET, PaymentMethod.POLYGON_WALLET, PaymentMethod.UPI],
          smartContractAddress: '0x5678901234567890123456789012345678901234',
          lastRateRevisionDate: new Date(),
          nextRevisionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        compliance: {
          governmentAuthorizationNumber: 'GOV-DL-2024-001',
          taxId: '07ABCDE1234F1Z5',
          auditTrailHash: '0x4567890123def4567890123def4567890123def4567890123def4567890123def456',
          rateApprovalDocumentHash: '0x6543210987cba6543210987cba6543210987cba6543210987cba6543210987cba654',
          complianceStatus: 'compliant',
          lastAuditDate: new Date(),
          nextAuditDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        }
      }
    ];

    return await this.seedPlazas(indianPlazas);
  }

  /**
   * Clear all plazas (for testing purposes)
   */
  static async clearAllPlazas(): Promise<{ deletedCount: number }> {
    try {
      const result = await TollPlaza.deleteMany({});
      await TollRate.deleteMany({});
      return { deletedCount: result.deletedCount };
    } catch (error: any) {
      throw new Error(`Failed to clear plazas: ${error.message}`);
    }
  }

  /**
   * Get plaza seeding statistics
   */
  static async getSeedingStats(): Promise<{
    totalPlazas: number;
    activePlazas: number;
    inactivePlazas: number;
    maintenancePlazas: number;
    regions: string[];
  }> {
    try {
      const [totalPlazas, activePlazas, inactivePlazas, maintenancePlazas, regions] = await Promise.all([
        TollPlaza.countDocuments(),
        TollPlaza.countDocuments({ status: PlazaStatus.ACTIVE }),
        TollPlaza.countDocuments({ status: PlazaStatus.INACTIVE }),
        TollPlaza.countDocuments({ status: PlazaStatus.MAINTENANCE }),
        TollPlaza.distinct('identification.regionCode')
      ]);

      return {
        totalPlazas,
        activePlazas,
        inactivePlazas,
        maintenancePlazas,
        regions
      };
    } catch (error: any) {
      throw new Error(`Failed to get seeding stats: ${error.message}`);
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
