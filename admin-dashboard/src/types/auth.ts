export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'operator' | 'auditor' | 'analyst';
  isActive: boolean;
  tollPlaza?: string;
  lastLogin?: Date;
  walletAddress?: string;
  permissions: {
    canManageVehicles: boolean;
    canProcessTolls: boolean;
    canViewAnalytics: boolean;
    canManageUsers: boolean;
    canHandleDisputes: boolean;
    canManagePlazas: boolean;
    canViewReports: boolean;
    canManageRates: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  walletAddress?: string;
  signature?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: AdminUser;
  expiresIn: number;
}

export interface SessionData {
  user: AdminUser;
  token: string;
  expiresAt: number;
  isAuthenticated: boolean;
}

export interface MetaMaskAuth {
  address: string;
  signature: string;
  message: string;
}
