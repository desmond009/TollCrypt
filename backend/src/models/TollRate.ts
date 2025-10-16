import mongoose, { Document, Schema } from 'mongoose';

export interface ITollRate extends Document {
  id: string;
  plazaId: string;
  vehicleType: string;
  baseRate: number;
  peakHourMultiplier: number;
  discountRules: {
    type: 'percentage' | 'fixed';
    value: number;
    conditions: any;
  }[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
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
    required: true
  },
  conditions: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

const TollRateSchema = new Schema<ITollRate>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  plazaId: {
    type: String,
    required: true,
    ref: 'TollPlaza',
    index: true
  },
  vehicleType: {
    type: String,
    required: true,
    enum: ['2-wheeler', '4-wheeler', 'car', 'lcv', 'hcv', 'truck', 'bus']
  },
  baseRate: {
    type: Number,
    required: true
  },
  peakHourMultiplier: {
    type: Number,
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
  }
}, {
  timestamps: true
});

// Indexes for better query performance
TollRateSchema.index({ plazaId: 1, vehicleType: 1, isActive: 1 });
TollRateSchema.index({ effectiveFrom: 1, effectiveTo: 1 });
TollRateSchema.index({ isActive: 1 });

export const TollRate = mongoose.model<ITollRate>('TollRate', TollRateSchema);
