import mongoose, { Document, Schema } from 'mongoose';

// Vehicle Categories Enum
export enum VehicleCategory {
  TWO_WHEELER = '2-wheeler',
  FOUR_WHEELER = '4-wheeler',
  LCV = 'lcv',
  HCV = 'hcv',
  BUS = 'bus',
  MAV = 'mav' // Multi-Axle Vehicle
}

// Direction of Travel Enum
export enum TravelDirection {
  NORTH = 'north',
  SOUTH = 'south',
  EAST = 'east',
  WEST = 'west'
}

// Payment Methods Enum
export enum PaymentMethod {
  ETH_WALLET = 'eth_wallet',
  POLYGON_WALLET = 'polygon_wallet',
  USDC_WALLET = 'usdc_wallet',
  CREDIT_CARD = 'credit_card',
  UPI = 'upi'
}

// Operating Status Enum
export enum PlazaStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
  EMERGENCY_CLOSED = 'emergency_closed'
}

// Plaza Identification Interface
export interface PlazaIdentification {
  uniqueId: string; // Format: PLAZA-{REGION}-{NUMBER}
  name: string; // Format: {Highway/Road Name} - Plaza {Letter/Name}
  regionCode: string; // ISO 3166-2 format
  operatorName: string;
  licenseNumber: string;
}

// Location Data Interface
export interface LocationData {
  gpsCoordinates: {
    latitude: number; // 6 decimal precision
    longitude: number; // 6 decimal precision
  };
  physicalAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  nearestLandmark: string; // within 5 km
  travelDirection: TravelDirection;
}

// Toll Rate Structure Interface
export interface TollRateStructure {
  vehicleCategories: {
    [VehicleCategory.TWO_WHEELER]: number;
    [VehicleCategory.FOUR_WHEELER]: number;
    [VehicleCategory.LCV]: number;
    [VehicleCategory.HCV]: number;
    [VehicleCategory.BUS]: number;
    [VehicleCategory.MAV]: number;
  };
  timeBasedMultipliers: {
    peakHourMultiplier: number;
    offPeakMultiplier: number;
    peakHours: {
      start: string; // HH:MM format
      end: string; // HH:MM format
    };
  };
  discountCodes: {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    validFrom: Date;
    validTo: Date;
    maxUsage: number;
    currentUsage: number;
  }[];
  returnJourneyValidity: number; // hours
}

// Operational Metadata Interface
export interface OperationalMetadata {
  operatingHours: {
    is24x7: boolean;
    specificTimings?: {
      start: string; // HH:MM format
      end: string; // HH:MM format
    };
  };
  laneConfiguration: {
    totalLanes: number;
    etcEnabledLanes: number;
    manualLanes: number;
  };
  paymentMethods: PaymentMethod[];
  smartContractAddress: string; // Sepolia testnet
  lastRateRevisionDate: Date;
  nextRevisionDate?: Date;
}

// Compliance & Audit Interface
export interface ComplianceAudit {
  governmentAuthorizationNumber: string;
  taxId: string; // GST Number
  auditTrailHash: string; // blockchain transaction reference
  rateApprovalDocumentHash: string;
  complianceStatus: 'compliant' | 'pending' | 'non_compliant';
  lastAuditDate: Date;
  nextAuditDate: Date;
}

// Main Plaza Interface
export interface ITollPlaza extends Document {
  // Plaza Identification
  identification: PlazaIdentification;
  
  // Location Data
  location: LocationData;
  
  // Toll Rate Structure
  tollRates: TollRateStructure;
  
  // Operational Metadata
  operational: OperationalMetadata;
  
  // Compliance & Audit
  compliance: ComplianceAudit;
  
  // Status and Management
  status: PlazaStatus;
  assignedOperators: string[];
  
  // Analytics and Tracking
  analytics: {
    todayTransactions: number;
    todayRevenue: number;
    monthlyTransactions: number;
    monthlyRevenue: number;
    averageTransactionTime: number; // seconds
    peakHourTraffic: number;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Schema Definitions
const PlazaIdentificationSchema = new Schema({
  uniqueId: {
    type: String,
    required: true,
    unique: true,
    match: /^PLAZA-[A-Z]{2,3}-\d{3,4}$/,
    index: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 200
  },
  regionCode: {
    type: String,
    required: true,
    match: /^[A-Z]{2,3}-[A-Z]{2,3}$/ // ISO 3166-2 format
  },
  operatorName: {
    type: String,
    required: true,
    maxlength: 100
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50
  }
});

const LocationDataSchema = new Schema({
  gpsCoordinates: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
      validate: {
        validator: function(v: number) {
          return Number(v.toFixed(6)) === v;
        },
        message: 'Latitude must have 6 decimal precision'
      }
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
      validate: {
        validator: function(v: number) {
          return Number(v.toFixed(6)) === v;
        },
        message: 'Longitude must have 6 decimal precision'
      }
    }
  },
  physicalAddress: {
    street: {
      type: String,
      required: true,
      maxlength: 200
    },
    city: {
      type: String,
      required: true,
      maxlength: 100
    },
    state: {
      type: String,
      required: true,
      maxlength: 100
    },
    postalCode: {
      type: String,
      required: true,
      maxlength: 20
    },
    country: {
      type: String,
      required: true,
      maxlength: 100,
      default: 'India'
    }
  },
  nearestLandmark: {
    type: String,
    required: true,
    maxlength: 200
  },
  travelDirection: {
    type: String,
    required: true,
    enum: Object.values(TravelDirection)
  }
});

const DiscountCodeSchema = new Schema({
  code: {
    type: String,
    required: true,
    maxlength: 20
  },
  discountType: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed']
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  validFrom: {
    type: Date,
    required: true
  },
  validTo: {
    type: Date,
    required: true
  },
  maxUsage: {
    type: Number,
    required: true,
    min: 1
  },
  currentUsage: {
    type: Number,
    default: 0,
    min: 0
  }
});

const TollRateStructureSchema = new Schema({
  vehicleCategories: {
    '2-wheeler': {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function(v: number) {
          return Number(v.toFixed(6)) === v;
        },
        message: 'Rate must have 6 decimal precision for ETH'
      }
    },
    '4-wheeler': {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function(v: number) {
          return Number(v.toFixed(6)) === v;
        },
        message: 'Rate must have 6 decimal precision for ETH'
      }
    },
    lcv: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function(v: number) {
          return Number(v.toFixed(6)) === v;
        },
        message: 'Rate must have 6 decimal precision for ETH'
      }
    },
    hcv: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function(v: number) {
          return Number(v.toFixed(6)) === v;
        },
        message: 'Rate must have 6 decimal precision for ETH'
      }
    },
    bus: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function(v: number) {
          return Number(v.toFixed(6)) === v;
        },
        message: 'Rate must have 6 decimal precision for ETH'
      }
    },
    mav: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function(v: number) {
          return Number(v.toFixed(6)) === v;
        },
        message: 'Rate must have 6 decimal precision for ETH'
      }
    }
  },
  timeBasedMultipliers: {
    peakHourMultiplier: {
      type: Number,
      required: true,
      min: 1.0,
      max: 3.0,
      default: 1.5
    },
    offPeakMultiplier: {
      type: Number,
      required: true,
      min: 0.5,
      max: 1.0,
      default: 1.0
    },
    peakHours: {
      start: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        default: '07:00'
      },
      end: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        default: '19:00'
      }
    }
  },
  discountCodes: [DiscountCodeSchema],
  returnJourneyValidity: {
    type: Number,
    required: true,
    min: 1,
    max: 48,
    default: 24 // hours
  }
});

const OperationalMetadataSchema = new Schema({
  operatingHours: {
    is24x7: {
      type: Boolean,
      required: true,
      default: true
    },
    specificTimings: {
      start: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      end: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      }
    }
  },
  laneConfiguration: {
    totalLanes: {
      type: Number,
      required: true,
      min: 1,
      max: 20
    },
    etcEnabledLanes: {
      type: Number,
      required: true,
      min: 0
    },
    manualLanes: {
      type: Number,
      required: true,
      min: 0
    }
  },
  paymentMethods: [{
    type: String,
    enum: Object.values(PaymentMethod),
    required: true
  }],
  smartContractAddress: {
    type: String,
    required: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    index: true
  },
  lastRateRevisionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  nextRevisionDate: {
    type: Date
  }
});

const ComplianceAuditSchema = new Schema({
  governmentAuthorizationNumber: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50
  },
  taxId: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50
  },
  auditTrailHash: {
    type: String,
    required: true,
    match: /^0x[a-fA-F0-9]{64}$/,
    index: true
  },
  rateApprovalDocumentHash: {
    type: String,
    required: true,
    match: /^0x[a-fA-F0-9]{64}$/
  },
  complianceStatus: {
    type: String,
    required: true,
    enum: ['compliant', 'pending', 'non_compliant'],
    default: 'pending'
  },
  lastAuditDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  nextAuditDate: {
    type: Date,
    required: true
  }
});

const AnalyticsSchema = new Schema({
  todayTransactions: {
    type: Number,
    default: 0,
    min: 0
  },
  todayRevenue: {
    type: Number,
    default: 0,
    min: 0
  },
  monthlyTransactions: {
    type: Number,
    default: 0,
    min: 0
  },
  monthlyRevenue: {
    type: Number,
    default: 0,
    min: 0
  },
  averageTransactionTime: {
    type: Number,
    default: 0,
    min: 0
  },
  peakHourTraffic: {
    type: Number,
    default: 0,
    min: 0
  }
});

// Main Plaza Schema
const TollPlazaSchema = new Schema<ITollPlaza>({
  identification: {
    type: PlazaIdentificationSchema,
    required: true
  },
  location: {
    type: LocationDataSchema,
    required: true
  },
  tollRates: {
    type: TollRateStructureSchema,
    required: true
  },
  operational: {
    type: OperationalMetadataSchema,
    required: true
  },
  compliance: {
    type: ComplianceAuditSchema,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(PlazaStatus),
    default: PlazaStatus.ACTIVE,
    required: true
  },
  assignedOperators: [{
    type: String,
    ref: 'AdminUser'
  }],
  analytics: {
    type: AnalyticsSchema,
    required: true,
    default: {}
  }
}, {
  timestamps: true
});

// Compound Indexes for better query performance
TollPlazaSchema.index({ 'identification.uniqueId': 1 });
TollPlazaSchema.index({ 'identification.regionCode': 1 });
TollPlazaSchema.index({ 'location.gpsCoordinates.latitude': 1, 'location.gpsCoordinates.longitude': 1 });
TollPlazaSchema.index({ 'location.travelDirection': 1 });
TollPlazaSchema.index({ status: 1 });
TollPlazaSchema.index({ 'operational.smartContractAddress': 1 });
TollPlazaSchema.index({ 'compliance.complianceStatus': 1 });
TollPlazaSchema.index({ assignedOperators: 1 });

// Geospatial index for proximity searches
TollPlazaSchema.index({ 
  'location.gpsCoordinates.latitude': 1, 
  'location.gpsCoordinates.longitude': 1 
}, { 
  name: 'location_2dsphere',
  '2dsphere': true 
});

// Text index for search functionality
TollPlazaSchema.index({
  'identification.name': 'text',
  'identification.operatorName': 'text',
  'location.physicalAddress.city': 'text',
  'location.physicalAddress.state': 'text',
  'location.nearestLandmark': 'text'
});

// Pre-save middleware to validate lane configuration
TollPlazaSchema.pre('save', function(next) {
  const plaza = this as ITollPlaza;
  const { totalLanes, etcEnabledLanes, manualLanes } = plaza.operational.laneConfiguration;
  
  if (etcEnabledLanes + manualLanes > totalLanes) {
    return next(new Error('Sum of ETC and manual lanes cannot exceed total lanes'));
  }
  
  next();
});

// Static method to find plazas by proximity
TollPlazaSchema.statics.findByProximity = function(
  latitude: number, 
  longitude: number, 
  radiusInKm: number = 10
) {
  return this.find({
    'location.gpsCoordinates.latitude': {
      $gte: latitude - (radiusInKm / 111), // Rough conversion: 1 degree ≈ 111 km
      $lte: latitude + (radiusInKm / 111)
    },
    'location.gpsCoordinates.longitude': {
      $gte: longitude - (radiusInKm / (111 * Math.cos(latitude * Math.PI / 180))),
      $lte: longitude + (radiusInKm / (111 * Math.cos(latitude * Math.PI / 180)))
    }
  });
};

// Instance method to calculate toll based on vehicle type and time
TollPlazaSchema.methods.calculateToll = function(
  vehicleType: VehicleCategory, 
  timestamp: Date = new Date()
) {
  const plaza = this as ITollPlaza;
  const baseRate = plaza.tollRates.vehicleCategories[vehicleType];
  
  if (!baseRate) {
    throw new Error(`Vehicle type ${vehicleType} not supported`);
  }
  
  const hour = timestamp.getHours();
  const minute = timestamp.getMinutes();
  const currentTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  const { peakHours, peakHourMultiplier, offPeakMultiplier } = plaza.tollRates.timeBasedMultipliers;
  
  let multiplier = offPeakMultiplier;
  if (currentTime >= peakHours.start && currentTime <= peakHours.end) {
    multiplier = peakHourMultiplier;
  }
  
  return Number((baseRate * multiplier).toFixed(6));
};

export const TollPlaza = mongoose.model<ITollPlaza>('TollPlaza', TollPlazaSchema);