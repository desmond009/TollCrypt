import mongoose, { Document, Schema } from 'mongoose';
import { VehicleCategory } from './TollPlaza';

export interface ITollRate extends Document {
  id: string;
  plazaUniqueId: string; // Reference to plaza's unique ID
  vehicleType: VehicleCategory;
  baseRate: number; // In Sepolia ETH with 6 decimal precision
  peakHourMultiplier: number;
  offPeakMultiplier: number;
  discountRules: {
    type: 'percentage' | 'fixed';
    value: number;
    conditions: {
      minTransactions?: number;
      validDays?: string[];
      userType?: string[];
      [key: string]: any;
    };
  }[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  revisionNumber: number;
  approvedBy: string; // Admin user ID who approved this rate
  approvalDocumentHash: string; // Blockchain hash of approval document
  createdAt: Date;
  updatedAt: Date;
}

const DiscountRuleSchema = new Schema({
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  conditions: {
    minTransactions: {
      type: Number,
      min: 0
    },
    validDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    userType: [{
      type: String,
      enum: ['regular', 'premium', 'corporate']
    }],
    additionalConditions: {
      type: Schema.Types.Mixed,
      default: {}
    }
  }
});

const TollRateSchema = new Schema<ITollRate>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  plazaUniqueId: {
    type: String,
    required: true,
    ref: 'TollPlaza',
    index: true
  },
  vehicleType: {
    type: String,
    required: true,
    enum: Object.values(VehicleCategory)
  },
  baseRate: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v: number) {
        return Number(v.toFixed(6)) === v;
      },
      message: 'Base rate must have 6 decimal precision for ETH'
    }
  },
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
  discountRules: [DiscountRuleSchema],
  effectiveFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  effectiveTo: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  revisionNumber: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  approvedBy: {
    type: String,
    required: true,
    ref: 'AdminUser'
  },
  approvalDocumentHash: {
    type: String,
    required: true,
    match: /^0x[a-fA-F0-9]{64}$/
  }
}, {
  timestamps: true
});

// Compound Indexes for better query performance
TollRateSchema.index({ plazaUniqueId: 1, vehicleType: 1, isActive: 1 });
TollRateSchema.index({ plazaUniqueId: 1, effectiveFrom: 1, effectiveTo: 1 });
TollRateSchema.index({ effectiveFrom: 1, effectiveTo: 1 });
TollRateSchema.index({ isActive: 1 });
TollRateSchema.index({ revisionNumber: 1 });
TollRateSchema.index({ approvedBy: 1 });

export const TollRate = mongoose.model<ITollRate>('TollRate', TollRateSchema);
