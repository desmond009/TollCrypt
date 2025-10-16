import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  type: 'transaction' | 'vehicle' | 'system' | 'alert' | 'dispute';
  title: string;
  message: string;
  recipientId?: string;
  recipientRole?: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
  createdAt: Date;
  readAt?: Date;
}

const NotificationSchema = new Schema<INotification>({
  type: {
    type: String,
    enum: ['transaction', 'vehicle', 'system', 'alert', 'dispute'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  recipientId: {
    type: String,
    ref: 'AdminUser',
    index: true
  },
  recipientRole: {
    type: String,
    enum: ['super_admin', 'admin', 'operator', 'viewer'],
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
NotificationSchema.index({ recipientId: 1, isRead: 1 });
NotificationSchema.index({ recipientRole: 1, isRead: 1 });
NotificationSchema.index({ type: 1, priority: 1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
