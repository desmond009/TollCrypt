import mongoose, { Document, Schema } from 'mongoose';

export interface IVehicle extends Document {
  vehicleId: string;
  owner: string;
  isActive: boolean;
  isBlacklisted: boolean;
  registrationTime: Date;
  lastTollTime?: Date;
  metadata?: {
    make?: string;
    model?: string;
    year?: number;
    color?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>({
  vehicleId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  owner: {
    type: String,
    required: true,
    index: true
  },
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
  metadata: {
    make: String,
    model: String,
    year: Number,
    color: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
VehicleSchema.index({ vehicleId: 1, owner: 1 });
VehicleSchema.index({ isActive: 1, isBlacklisted: 1 });

export const Vehicle = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
