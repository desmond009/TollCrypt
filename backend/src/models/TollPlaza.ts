import mongoose, { Document, Schema } from 'mongoose';

export interface ITollPlaza extends Document {
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

const TollPlazaSchema = new Schema<ITollPlaza>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  coordinates: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active'
  },
  tollRates: {
    '2-wheeler': {
      type: Number,
      required: true,
      default: 0
    },
    '4-wheeler': {
      type: Number,
      required: true,
      default: 0
    },
    'car': {
      type: Number,
      required: true,
      default: 0
    },
    'lcv': {
      type: Number,
      required: true,
      default: 0
    },
    'hcv': {
      type: Number,
      required: true,
      default: 0
    },
    'truck': {
      type: Number,
      required: true,
      default: 0
    },
    'bus': {
      type: Number,
      required: true,
      default: 0
    }
  },
  operatingHours: {
    start: {
      type: String,
      required: true,
      default: '00:00'
    },
    end: {
      type: String,
      required: true,
      default: '23:59'
    }
  },
  assignedOperators: [{
    type: String,
    ref: 'AdminUser'
  }],
  todayTransactions: {
    type: Number,
    default: 0
  },
  todayRevenue: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
TollPlazaSchema.index({ status: 1 });
TollPlazaSchema.index({ assignedOperators: 1 });
TollPlazaSchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1 });

export const TollPlaza = mongoose.model<ITollPlaza>('TollPlaza', TollPlazaSchema);
