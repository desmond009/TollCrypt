import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITollTransaction extends Document {
  transactionId: string;
  vehicleId: Types.ObjectId;
  payer: string;
  amount: number;
  currency: string;
  zkProofHash: string;
  tollLocation: string;
  useGaslessTransaction: boolean;
  status: 'pending' | 'confirmed' | 'failed' | 'disputed';
  blockchainTxHash?: string;
  blockNumber?: number;
  gasUsed?: number;
  gasPrice?: number;
  timestamp: Date;
  processedAt?: Date;
  metadata?: {
    tollBoothId?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    vehicleType?: string;
    discountApplied?: number;
    rfidDetected?: boolean;
    processedAt?: Date;
    gaslessTransaction?: boolean;
    paymasterAddress?: string;
    accountAbstractionWallet?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TollTransactionSchema = new Schema<ITollTransaction>({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  vehicleId: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true,
    index: true
  },
  payer: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USDC'
  },
  zkProofHash: {
    type: String,
    required: true
  },
  tollLocation: {
    type: String,
    required: true
  },
  useGaslessTransaction: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed', 'disputed'],
    default: 'pending'
  },
  blockchainTxHash: {
    type: String,
    index: true
  },
  blockNumber: {
    type: Number
  },
  gasUsed: {
    type: Number
  },
  gasPrice: {
    type: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },
  metadata: {
    tollBoothId: String,
    location: {
      latitude: Number,
      longitude: Number
    },
    vehicleType: String,
    discountApplied: Number,
    rfidDetected: {
      type: Boolean,
      default: false
    },
    processedAt: Date,
    gaslessTransaction: Boolean,
    paymasterAddress: String,
    accountAbstractionWallet: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
TollTransactionSchema.index({ vehicleId: 1, timestamp: -1 });
TollTransactionSchema.index({ payer: 1, timestamp: -1 });
TollTransactionSchema.index({ status: 1, timestamp: -1 });
TollTransactionSchema.index({ zkProofHash: 1 });
TollTransactionSchema.index({ tollLocation: 1 });
TollTransactionSchema.index({ useGaslessTransaction: 1 });

export const TollTransaction = mongoose.model<ITollTransaction>('TollTransaction', TollTransactionSchema);
