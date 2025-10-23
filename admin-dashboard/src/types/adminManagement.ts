// Admin Management Types
import { AdminUser } from './auth';

export interface AdminUserExtended extends AdminUser {
  lastLogin?: Date;
  loginCount30Days: number;
}

export interface LoginHistoryEntry {
  id: string;
  adminId: string;
  email: string;
  loginTime: Date;
  logoutTime?: Date;
  ipAddress: string;
  userAgent: string;
  location?: string;
  isSuccessful: boolean;
  failureReason?: string;
  sessionDuration?: number;
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

// Wallet Management Types
export interface WalletInfo {
  id: string;
  walletAddress: string;
  topUpWalletAddress?: string;
  isVerified: boolean;
  verificationDate?: Date;
  lastLogin?: Date;
  isActive: boolean;
  createdAt: Date;
  recentActivity: WalletActivity[];
  suspiciousActivityCount: number;
  flaggedActivityCount: number;
  isSuspicious: boolean;
  isFlagged: boolean;
}

export interface WalletActivity {
  id: string;
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
  flaggedBy?: string;
  flaggedAt?: Date;
  resolvedAt?: Date;
  resolution?: string;
}

// System Settings Types
export interface SystemSettings {
  id: string;
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
    timeoutDuration: number;
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
    maxAge: number;
  };
  
  // Backup & Maintenance
  backupSettings: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
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
    auditLogs: number;
    systemLogs: number;
    transactionLogs: number;
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

export interface BackupStatus {
  lastBackup: Date;
  nextBackup: Date;
  backupSize: string;
  status: 'completed' | 'in_progress' | 'failed';
  settings: SystemSettings['backupSettings'];
}

export interface SystemLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  source: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Form Types
export interface CreateAdminUserForm {
  email: string;
  name: string;
  role: 'super_admin' | 'plaza_operator' | 'auditor' | 'analyst';
  tollPlaza?: string;
  password: string;
}

export interface UpdateAdminUserForm {
  name?: string;
  role?: 'super_admin' | 'plaza_operator' | 'auditor' | 'analyst';
  tollPlaza?: string;
  isActive?: boolean;
}

export interface FlagWalletForm {
  reason: string;
  adminNotes?: string;
}

export interface UpdateSystemSettingsForm {
  systemName?: string;
  systemLogo?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  language?: string;
  rpcUrl?: string;
  contractAddresses?: Partial<SystemSettings['contractAddresses']>;
  adminWalletAddress?: string;
  gasSettings?: Partial<SystemSettings['gasSettings']>;
  emailNotifications?: Partial<SystemSettings['emailNotifications']>;
  smsNotifications?: Partial<SystemSettings['smsNotifications']>;
  pushNotifications?: Partial<SystemSettings['pushNotifications']>;
  twoFactorAuth?: Partial<SystemSettings['twoFactorAuth']>;
  sessionSettings?: Partial<SystemSettings['sessionSettings']>;
  ipWhitelist?: Partial<SystemSettings['ipWhitelist']>;
  passwordPolicy?: Partial<SystemSettings['passwordPolicy']>;
  backupSettings?: Partial<SystemSettings['backupSettings']>;
  maintenanceMode?: Partial<SystemSettings['maintenanceMode']>;
  logRetention?: Partial<SystemSettings['logRetention']>;
  alertThresholds?: Partial<SystemSettings['alertThresholds']>;
}
