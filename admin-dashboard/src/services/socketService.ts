import { io, Socket } from 'socket.io-client';

class AdminSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.connect();
  }

  private connect() {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    
    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('Admin connected to backend via Socket.IO');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Admin disconnected from backend:', reason);
      this.isConnected = false;
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Admin socket connection error:', error);
      this.isConnected = false;
      this.handleReconnect();
    });

    // Listen for real-time updates
    this.setupEventListeners();
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Admin attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Admin max reconnection attempts reached');
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Listen for transaction updates
    this.socket.on('transaction:new', (data) => {
      console.log('New transaction received in admin:', data);
      window.dispatchEvent(new CustomEvent('admin:transaction:new', { detail: data }));
    });

    // Listen for vehicle updates
    this.socket.on('vehicle:registered', (data) => {
      console.log('Vehicle registration received in admin:', data);
      window.dispatchEvent(new CustomEvent('admin:vehicle:registered', { detail: data }));
    });

    // Listen for vehicle blacklist updates
    this.socket.on('vehicle:blacklist', (data) => {
      console.log('Vehicle blacklist update received in admin:', data);
      window.dispatchEvent(new CustomEvent('admin:vehicle:blacklist', { detail: data }));
    });

    // Listen for plaza updates
    this.socket.on('plaza:created', (data) => {
      console.log('Plaza created received in admin:', data);
      window.dispatchEvent(new CustomEvent('admin:plaza:created', { detail: data }));
    });

    // Listen for dispute updates
    this.socket.on('dispute:updated', (data) => {
      console.log('Dispute update received in admin:', data);
      window.dispatchEvent(new CustomEvent('admin:dispute:updated', { detail: data }));
    });

    // Listen for system alerts
    this.socket.on('system:alert', (data) => {
      console.log('System alert received in admin:', data);
      window.dispatchEvent(new CustomEvent('admin:system:alert', { detail: data }));
    });

    // Listen for notifications
    this.socket.on('notification:new', (data) => {
      console.log('New notification received in admin:', data);
      window.dispatchEvent(new CustomEvent('admin:notification:new', { detail: data }));
    });
  }

  // Join admin room
  public joinAdminRoom(adminId: string, role: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:join', { adminId, role });
      console.log(`Admin joined room: ${adminId} with role: ${role}`);
    }
  }

  // Emit custom events
  public emit(event: string, data: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Admin socket not connected, cannot emit event:', event);
    }
  }

  // Listen for specific events
  public on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove event listener
  public off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Get connection status
  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Disconnect
  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Reconnect manually
  public reconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}

// Create singleton instance
const adminSocketService = new AdminSocketService();

export default adminSocketService;
