import mongoose, { Document, Schema } from 'mongoose';

export interface IDispute extends Document {
  id: string;
  transactionId: string;
  vehicleId: string;
  reason: string;
  status: 'pending' | 'under_review' | 'resolved' | 'rejected';
  submittedBy: string;
  assignedTo?: string;
  resolution?: string;
  evidence?: {
    type: 'image' | 'document' | 'text';
    url?: string;
    content?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

const EvidenceSchema = new Schema({
  type: {
    type: String,
    enum: ['image', 'document', 'text'],
    required: true
  },
  url: {
    type: String
  },
  content: {
    type: String
  }
});

const DisputeSchema = new Schema<IDispute>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  transactionId: {
    type: String,
    required: true,
    ref: 'TollTransaction',
    index: true
  },
  vehicleId: {
    type: String,
    required: true,
    ref: 'Vehicle',
    index: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'resolved', 'rejected'],
    default: 'pending',
    index: true
  },
  submittedBy: {
    type: String,
    required: true,
    index: true
  },
  assignedTo: {
    type: String,
    ref: 'AdminUser',
    index: true
  },
  resolution: {
    type: String
  },
  evidence: [EvidenceSchema],
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
DisputeSchema.index({ status: 1, assignedTo: 1 });
DisputeSchema.index({ submittedBy: 1, status: 1 });
DisputeSchema.index({ transactionId: 1 });
DisputeSchema.index({ vehicleId: 1 });
DisputeSchema.index({ createdAt: -1 });

export const Dispute = mongoose.model<IDispute>('Dispute', DisputeSchema);
