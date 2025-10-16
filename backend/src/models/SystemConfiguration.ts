import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemConfiguration extends Document {
  key: string;
  value: any;
  description: string;
  category: 'general' | 'blockchain' | 'security' | 'notifications' | 'toll_rates';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SystemConfigurationSchema = new Schema<ISystemConfiguration>({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'blockchain', 'security', 'notifications', 'toll_rates'],
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
SystemConfigurationSchema.index({ category: 1, isActive: 1 });
SystemConfigurationSchema.index({ key: 1, isActive: 1 });

export const SystemConfiguration = mongoose.model<ISystemConfiguration>('SystemConfiguration', SystemConfigurationSchema);
