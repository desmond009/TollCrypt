import mongoose, { Document, Schema } from 'mongoose';

export interface IVehicleDocument {
  type: 'rc' | 'insurance' | 'pollution';
  name: string;
  uploadedAt: Date;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface IVehicle extends Document {
  vehicleId: string;
  vehicleType: string;
  owner: string;
  documents: IVehicleDocument[];
  isActive: boolean;
  isBlacklisted: boolean;
  registrationTime: Date;
  lastTollTime?: Date;
  fastagWalletAddress?: string;
  metadata?: {
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    engineNumber?: string;
    chassisNumber?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const VehicleDocumentSchema = new Schema<IVehicleDocument>({
  type: {
    type: String,
    enum: ['rc', 'insurance', 'pollution'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  verifiedBy: {
    type: String
  }
});

const VehicleSchema = new Schema<IVehicle>({
  vehicleId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  vehicleType: {
    type: String,
    required: true,
    enum: ['car', 'truck', 'bus', 'motorcycle', 'commercial']
  },
  owner: {
    type: String,
    required: true,
    index: true
  },
  documents: [VehicleDocumentSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  isBlacklisted: {
    type: Boolean,
    default: false
  },
  registrationTime: {
    type: Date,
    default: Date.now
  },
  lastTollTime: {
    type: Date
  },
  fastagWalletAddress: {
    type: String,
    index: true
  },
  metadata: {
    make: String,
    model: String,
    year: Number,
    color: String,
    engineNumber: String,
    chassisNumber: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
VehicleSchema.index({ vehicleId: 1, owner: 1 });
VehicleSchema.index({ isActive: 1, isBlacklisted: 1 });
VehicleSchema.index({ vehicleType: 1 });
VehicleSchema.index({ fastagWalletAddress: 1 });

export const Vehicle = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
