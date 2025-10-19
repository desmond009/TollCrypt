import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  walletAddress: string;
  topUpWalletAddress?: string; // Address of the persistent top-up wallet
  aadhaarHash: string; // Hash of the Aadhaar number for verification
  isVerified: boolean;
  verificationDate: Date;
  lastLogin: Date;
  sessionTokens: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  topUpWalletAddress: {
    type: String,
    required: false,
    unique: true,
    sparse: true, // Allows multiple null values but enforces uniqueness for non-null values
    lowercase: true
  },
  aadhaarHash: {
    type: String,
    required: true,
    unique: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDate: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  sessionTokens: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster lookups
UserSchema.index({ walletAddress: 1 });
UserSchema.index({ topUpWalletAddress: 1 });
UserSchema.index({ aadhaarHash: 1 });
UserSchema.index({ isVerified: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
