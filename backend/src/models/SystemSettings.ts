import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSettings extends Document {
  // General Configuration
  systemName: string;
  systemLogo?: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
  
  // Blockchain Configuration
  rpcUrl: string;
  contractAddresses: {
    tollCollection: string;
    topUpWalletFactory: string;
    anonAadhaarVerifier: string;
  };
  adminWalletAddress: string;
  gasSettings: {
    gasPrice: number;
    gasLimit: number;
    maxGasPrice: number;
  };
  
  // Notification Settings
  emailNotifications: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    criticalEvents: boolean;
    highValueTransactions: boolean;
    systemAlerts: boolean;
  };
  smsNotifications: {
    enabled: boolean;
    provider: string;
    apiKey: string;
    highValueThreshold: number;
  };
  pushNotifications: {
    enabled: boolean;
    serverKey: string;
    adminAlerts: boolean;
  };
  
  // Security Settings
  twoFactorAuth: {
    enabled: boolean;
    requiredForAdmins: boolean;
    backupCodes: boolean;
  };
  sessionSettings: {
    timeoutDuration: number; // in minutes
    maxConcurrentSessions: number;
    requireReauthForSensitive: boolean;
  };
  ipWhitelist: {
    enabled: boolean;
    allowedIPs: string[];
  };
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number; // in days
  };
  
  // Backup & Maintenance
  backupSettings: {
    enabled: boolean;
    frequency: string; // daily, weekly, monthly
    retentionDays: number;
    cloudStorage: boolean;
    localStorage: boolean;
  };
  maintenanceMode: {
    enabled: boolean;
    message: string;
    allowedIPs: string[];
  };
  logRetention: {
    auditLogs: number; // days
    systemLogs: number; // days
    transactionLogs: number; // days
  };
  
  // Alert Thresholds
  alertThresholds: {
    lowBalance: number;
    highTransactionValue: number;
    failedTransactionRate: number;
    systemLoadThreshold: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>({
  // General Configuration
  systemName: {
    type: String,
    required: true,
    default: 'TollChain Admin Dashboard'
  },
  systemLogo: {
    type: String
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  dateFormat: {
    type: String,
    default: 'YYYY-MM-DD'
  },
  timeFormat: {
    type: String,
    default: '24h'
  },
  language: {
    type: String,
    default: 'en'
  },
  
  // Blockchain Configuration
  rpcUrl: {
    type: String,
    required: true,
    default: 'https://sepolia.base.org'
  },
  contractAddresses: {
    tollCollection: {
      type: String,
      required: true
    },
    topUpWalletFactory: {
      type: String,
      required: true
    },
    anonAadhaarVerifier: {
      type: String,
      required: true
    }
  },
  adminWalletAddress: {
    type: String,
    required: true
  },
  gasSettings: {
    gasPrice: {
      type: Number,
      default: 2000000000 // 2 gwei
    },
    gasLimit: {
      type: Number,
      default: 300000
    },
    maxGasPrice: {
      type: Number,
      default: 5000000000 // 5 gwei
    }
  },
  
  // Notification Settings
  emailNotifications: {
    enabled: {
      type: Boolean,
      default: false
    },
    smtpHost: {
      type: String,
      default: ''
    },
    smtpPort: {
      type: Number,
      default: 587
    },
    smtpUser: {
      type: String,
      default: ''
    },
    smtpPassword: {
      type: String,
      default: ''
    },
    fromEmail: {
      type: String,
      default: ''
    },
    criticalEvents: {
      type: Boolean,
      default: true
    },
    highValueTransactions: {
      type: Boolean,
      default: true
    },
    systemAlerts: {
      type: Boolean,
      default: true
    }
  },
  smsNotifications: {
    enabled: {
      type: Boolean,
      default: false
    },
    provider: {
      type: String,
      default: 'twilio'
    },
    apiKey: {
      type: String,
      default: ''
    },
    highValueThreshold: {
      type: Number,
      default: 1000 // USDC
    }
  },
  pushNotifications: {
    enabled: {
      type: Boolean,
      default: false
    },
    serverKey: {
      type: String,
      default: ''
    },
    adminAlerts: {
      type: Boolean,
      default: true
    }
  },
  
  // Security Settings
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    requiredForAdmins: {
      type: Boolean,
      default: true
    },
    backupCodes: {
      type: Boolean,
      default: true
    }
  },
  sessionSettings: {
    timeoutDuration: {
      type: Number,
      default: 480 // 8 hours in minutes
    },
    maxConcurrentSessions: {
      type: Number,
      default: 3
    },
    requireReauthForSensitive: {
      type: Boolean,
      default: true
    }
  },
  ipWhitelist: {
    enabled: {
      type: Boolean,
      default: false
    },
    allowedIPs: [{
      type: String
    }]
  },
  passwordPolicy: {
    minLength: {
      type: Number,
      default: 8
    },
    requireUppercase: {
      type: Boolean,
      default: true
    },
    requireLowercase: {
      type: Boolean,
      default: true
    },
    requireNumbers: {
      type: Boolean,
      default: true
    },
    requireSpecialChars: {
      type: Boolean,
      default: true
    },
    maxAge: {
      type: Number,
      default: 90 // days
    }
  },
  
  // Backup & Maintenance
  backupSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    retentionDays: {
      type: Number,
      default: 30
    },
    cloudStorage: {
      type: Boolean,
      default: false
    },
    localStorage: {
      type: Boolean,
      default: true
    }
  },
  maintenanceMode: {
    enabled: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: 'System is under maintenance. Please try again later.'
    },
    allowedIPs: [{
      type: String
    }]
  },
  logRetention: {
    auditLogs: {
      type: Number,
      default: 365 // days
    },
    systemLogs: {
      type: Number,
      default: 30 // days
    },
    transactionLogs: {
      type: Number,
      default: 2555 // ~7 years
    }
  },
  
  // Alert Thresholds
  alertThresholds: {
    lowBalance: {
      type: Number,
      default: 100 // USDC
    },
    highTransactionValue: {
      type: Number,
      default: 1000 // USDC
    },
    failedTransactionRate: {
      type: Number,
      default: 5 // percentage
    },
    systemLoadThreshold: {
      type: Number,
      default: 80 // percentage
    }
  }
}, {
  timestamps: true
});

// Ensure only one system settings document exists
SystemSettingsSchema.index({}, { unique: true });

export const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);

