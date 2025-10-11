import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAdminUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'admin' | 'operator' | 'viewer';
  isActive: boolean;
  lastLogin?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  permissions: {
    canManageVehicles: boolean;
    canProcessTolls: boolean;
    canViewAnalytics: boolean;
    canManageUsers: boolean;
    canHandleDisputes: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  toJSON(): any;
}

const AdminUserSchema = new Schema<IAdminUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'operator', 'viewer'],
    default: 'viewer'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  permissions: {
    canManageVehicles: {
      type: Boolean,
      default: false
    },
    canProcessTolls: {
      type: Boolean,
      default: false
    },
    canViewAnalytics: {
      type: Boolean,
      default: false
    },
    canManageUsers: {
      type: Boolean,
      default: false
    },
    canHandleDisputes: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Set permissions based on role
AdminUserSchema.pre('save', function(next) {
  switch (this.role) {
    case 'super_admin':
      this.permissions = {
        canManageVehicles: true,
        canProcessTolls: true,
        canViewAnalytics: true,
        canManageUsers: true,
        canHandleDisputes: true
      };
      break;
    case 'admin':
      this.permissions = {
        canManageVehicles: true,
        canProcessTolls: true,
        canViewAnalytics: true,
        canManageUsers: false,
        canHandleDisputes: true
      };
      break;
    case 'operator':
      this.permissions = {
        canManageVehicles: true,
        canProcessTolls: true,
        canViewAnalytics: false,
        canManageUsers: false,
        canHandleDisputes: false
      };
      break;
    case 'viewer':
      this.permissions = {
        canManageVehicles: false,
        canProcessTolls: false,
        canViewAnalytics: true,
        canManageUsers: false,
        canHandleDisputes: false
      };
      break;
  }
  next();
});

// Hash password before saving
AdminUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
AdminUserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
AdminUserSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  return userObject;
};

export const AdminUser = mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);
