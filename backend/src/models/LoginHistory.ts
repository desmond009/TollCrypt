import mongoose, { Document, Schema } from 'mongoose';

export interface ILoginHistory extends Document {
  adminId: string;
  email: string;
  loginTime: Date;
  logoutTime?: Date;
  ipAddress: string;
  userAgent: string;
  location?: string;
  isSuccessful: boolean;
  failureReason?: string;
  sessionDuration?: number; // in minutes
  deviceInfo: {
    browser?: string;
    os?: string;
    device?: string;
  };
  metadata: {
    riskScore?: number;
    isSuspicious?: boolean;
    flags?: string[];
  };
}

const LoginHistorySchema = new Schema<ILoginHistory>({
  adminId: {
    type: String,
    required: true,
    ref: 'AdminUser',
    index: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  loginTime: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  logoutTime: {
    type: Date
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    required: true
  },
  location: {
    type: String
  },
  isSuccessful: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  },
  failureReason: {
    type: String
  },
  sessionDuration: {
    type: Number // in minutes
  },
  deviceInfo: {
    browser: String,
    os: String,
    device: String
  },
  metadata: {
    riskScore: {
      type: Number,
      min: 0,
      max: 100
    },
    isSuspicious: {
      type: Boolean,
      default: false
    },
    flags: [String]
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
LoginHistorySchema.index({ adminId: 1, loginTime: -1 });
LoginHistorySchema.index({ email: 1, loginTime: -1 });
LoginHistorySchema.index({ ipAddress: 1, loginTime: -1 });
LoginHistorySchema.index({ isSuccessful: 1, loginTime: -1 });

export const LoginHistory = mongoose.model<ILoginHistory>('LoginHistory', LoginHistorySchema);

