import { useAccount } from 'wagmi';

export interface UserSession {
  walletAddress: string;
  isAuthenticated: boolean;
  authProof?: string;
  authTimestamp?: number;
  vehicles: VehicleInfo[];
  sessionToken?: string;
  lastActivity: number;
}

export interface VehicleInfo {
  vehicleId: string;
  vehicleType: string;
  registrationDate: string;
  documents: string[];
  isActive: boolean;
}

export interface SessionConfig {
  sessionTimeout: number; // in milliseconds
  authTimeout: number; // in milliseconds
}

const DEFAULT_CONFIG: SessionConfig = {
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  authTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
};

class SessionManager {
  private config: SessionConfig;
  private storageKey = 'tollchain_session';

  constructor(config: SessionConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  // Create a new session
  createSession(walletAddress: string, authProof?: string): UserSession {
    const session: UserSession = {
      walletAddress,
      isAuthenticated: !!authProof,
      authProof,
      authTimestamp: Date.now(),
      vehicles: [],
      sessionToken: this.generateSessionToken(),
      lastActivity: Date.now(),
    };

    this.saveSession(session);
    return session;
  }

  // Get current session
  getSession(): UserSession | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return null;

      const session: UserSession = JSON.parse(stored);
      
      // Check if session is expired
      if (this.isSessionExpired(session)) {
        this.clearSession();
        return null;
      }

      // Update last activity
      session.lastActivity = Date.now();
      this.saveSession(session);
      
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      this.clearSession();
      return null;
    }
  }

  // Update session with authentication
  updateSessionAuth(authProof: string): boolean {
    const session = this.getSession();
    if (!session) return false;

    session.isAuthenticated = true;
    session.authProof = authProof;
    session.authTimestamp = Date.now();
    session.lastActivity = Date.now();

    this.saveSession(session);
    return true;
  }

  // Add vehicle to session
  addVehicle(vehicle: VehicleInfo): boolean {
    const session = this.getSession();
    if (!session) return false;

    // Check if vehicle already exists
    const existingIndex = session.vehicles.findIndex(v => v.vehicleId === vehicle.vehicleId);
    if (existingIndex >= 0) {
      session.vehicles[existingIndex] = vehicle;
    } else {
      session.vehicles.push(vehicle);
    }

    session.lastActivity = Date.now();
    this.saveSession(session);
    return true;
  }

  // Remove vehicle from session
  removeVehicle(vehicleId: string): boolean {
    const session = this.getSession();
    if (!session) return false;

    session.vehicles = session.vehicles.filter(v => v.vehicleId !== vehicleId);
    session.lastActivity = Date.now();
    this.saveSession(session);
    return true;
  }

  // Update vehicle info
  updateVehicle(vehicleId: string, updates: Partial<VehicleInfo>): boolean {
    const session = this.getSession();
    if (!session) return false;

    const vehicleIndex = session.vehicles.findIndex(v => v.vehicleId === vehicleId);
    if (vehicleIndex >= 0) {
      session.vehicles[vehicleIndex] = { ...session.vehicles[vehicleIndex], ...updates };
      session.lastActivity = Date.now();
      this.saveSession(session);
      return true;
    }
    return false;
  }

  // Check if session is expired
  private isSessionExpired(session: UserSession): boolean {
    const now = Date.now();
    
    // Check general session timeout
    if (now - session.lastActivity > this.config.sessionTimeout) {
      return true;
    }

    // Check auth timeout if authenticated
    if (session.isAuthenticated && session.authTimestamp) {
      if (now - session.authTimestamp > this.config.authTimeout) {
        return true;
      }
    }

    return false;
  }

  // Check if authentication is still valid
  isAuthValid(): boolean {
    const session = this.getSession();
    if (!session || !session.isAuthenticated || !session.authTimestamp) {
      return false;
    }

    return Date.now() - session.authTimestamp < this.config.authTimeout;
  }

  // Clear session
  clearSession(): void {
    localStorage.removeItem(this.storageKey);
  }

  // Save session to localStorage
  private saveSession(session: UserSession): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(session));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  // Generate a simple session token
  private generateSessionToken(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get vehicles for current session
  getVehicles(): VehicleInfo[] {
    const session = this.getSession();
    return session?.vehicles || [];
  }

  // Check if user has registered vehicles
  hasRegisteredVehicles(): boolean {
    const vehicles = this.getVehicles();
    return vehicles.length > 0;
  }

  // Get session status
  getSessionStatus(): {
    isAuthenticated: boolean;
    hasVehicles: boolean;
    needsAuth: boolean;
    sessionValid: boolean;
  } {
    const session = this.getSession();
    const isAuthenticated = session?.isAuthenticated || false;
    const hasVehicles = this.hasRegisteredVehicles();
    const needsAuth = !isAuthenticated || !this.isAuthValid();
    const sessionValid = !!session;

    return {
      isAuthenticated,
      hasVehicles,
      needsAuth,
      sessionValid,
    };
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Hook for using session manager
export const useSession = () => {
  const { address } = useAccount();
  
  const getSession = () => sessionManager.getSession();
  const createSession = (authProof?: string) => {
    if (!address) return null;
    return sessionManager.createSession(address, authProof);
  };
  const updateAuth = (authProof: string) => sessionManager.updateSessionAuth(authProof);
  const addVehicle = (vehicle: VehicleInfo) => sessionManager.addVehicle(vehicle);
  const removeVehicle = (vehicleId: string) => sessionManager.removeVehicle(vehicleId);
  const updateVehicle = (vehicleId: string, updates: Partial<VehicleInfo>) => 
    sessionManager.updateVehicle(vehicleId, updates);
  const clearSession = () => sessionManager.clearSession();
  const getSessionStatus = () => sessionManager.getSessionStatus();
  const isAuthValid = () => sessionManager.isAuthValid();

  return {
    getSession,
    createSession,
    updateAuth,
    addVehicle,
    removeVehicle,
    updateVehicle,
    clearSession,
    getSessionStatus,
    isAuthValid,
  };
};
