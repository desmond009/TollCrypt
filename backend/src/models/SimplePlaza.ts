import mongoose, { Document, Schema } from 'mongoose';

// Simple Plaza Interface for Admin Dashboard
export interface ISimplePlaza extends Document {
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
  assignedOperators: string[];
  todayTransactions: number;
  todayRevenue: number;
  createdAt: Date;
  updatedAt: Date;
}

// Simple Plaza Schema
const SimplePlazaSchema = new Schema<ISimplePlaza>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 200
  },
  location: {
    type: String,
    required: true,
    maxlength: 500
  },
  coordinates: {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active',
    required: true
  },
  tollRates: {
    '2-wheeler': {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    '4-wheeler': {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    'car': {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    'lcv': {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    'hcv': {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    'truck': {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    'bus': {
      type: Number,
      required: true,
      min: 0,
      default: 0
    }
  },
  operatingHours: {
    start: {
      type: String,
      required: true,
      default: '06:00'
    },
    end: {
      type: String,
      required: true,
      default: '22:00'
    }
  },
  assignedOperators: [{
    type: String,
    ref: 'AdminUser'
  }],
  todayTransactions: {
    type: Number,
    default: 0,
    min: 0
  },
  todayRevenue: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes
SimplePlazaSchema.index({ id: 1 });
SimplePlazaSchema.index({ status: 1 });
SimplePlazaSchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1 });

export const SimplePlaza = mongoose.model<ISimplePlaza>('SimplePlaza', SimplePlazaSchema);
