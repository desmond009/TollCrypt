import mongoose, { Document, Schema } from 'mongoose';

export interface IWalletActivity extends Document {
  walletAddress: string;
  userId?: string;
  activityType: 'registration' | 'topup' | 'payment' | 'withdrawal' | 'suspicious' | 'flagged';
  amount?: number;
  transactionHash?: string;
  description: string;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    riskScore?: number;
    flags?: string[];
    adminNotes?: string;
  };
  timestamp: Date;
  isSuspicious: boolean;
  isFlagged: boolean;
  flaggedBy?: string; // Admin user ID
  flaggedAt?: Date;
  resolvedAt?: Date;
  resolution?: string;
}

const WalletActivitySchema = new Schema<IWalletActivity>({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  userId: {
    type: String,
    index: true
  },
  activityType: {
    type: String,
    enum: ['registration', 'topup', 'payment', 'withdrawal', 'suspicious', 'flagged'],
    required: true
  },
  amount: {
    type: Number
  },
  transactionHash: {
    type: String,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: String,
    riskScore: {
      type: Number,
      min: 0,
      max: 100
    },
    flags: [String],
    adminNotes: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  isSuspicious: {
    type: Boolean,
    default: false,
    index: true
  },
  isFlagged: {
    type: Boolean,
    default: false,
    index: true
  },
  flaggedBy: {
    type: String,
    ref: 'AdminUser'
  },
  flaggedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  resolution: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
WalletActivitySchema.index({ walletAddress: 1, timestamp: -1 });
WalletActivitySchema.index({ isSuspicious: 1, timestamp: -1 });
WalletActivitySchema.index({ isFlagged: 1, timestamp: -1 });
WalletActivitySchema.index({ activityType: 1, timestamp: -1 });

export const WalletActivity = mongoose.model<IWalletActivity>('WalletActivity', WalletActivitySchema);

