import { io, Socket } from 'socket.io-client';

class SocketService {
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
      console.log('Connected to backend via Socket.IO');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from backend:', reason);
      this.isConnected = false;
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
      this.handleReconnect();
    });

    // Listen for real-time updates
    this.setupEventListeners();
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Listen for transaction updates
    this.socket.on('transaction:new', (data) => {
      console.log('New transaction received:', data);
      // Emit custom event for components to listen to
      window.dispatchEvent(new CustomEvent('realtime:transaction', { detail: data }));
    });

    // Listen for vehicle updates
    this.socket.on('vehicle:registered', (data) => {
      console.log('Vehicle registration received:', data);
      window.dispatchEvent(new CustomEvent('realtime:vehicle', { detail: data }));
    });

    // Listen for vehicle blacklist updates
    this.socket.on('vehicle:blacklist', (data) => {
      console.log('Vehicle blacklist update received:', data);
      window.dispatchEvent(new CustomEvent('realtime:vehicle:blacklist', { detail: data }));
    });

    // Listen for system alerts
    this.socket.on('system:alert', (data) => {
      console.log('System alert received:', data);
      window.dispatchEvent(new CustomEvent('realtime:alert', { detail: data }));
    });

    // Listen for notifications
    this.socket.on('notification:new', (data) => {
      console.log('New notification received:', data);
      window.dispatchEvent(new CustomEvent('realtime:notification', { detail: data }));
    });
  }

  // Join user room
  public joinUserRoom(userId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('user:join', { userId });
      console.log(`Joined user room: ${userId}`);
    }
  }

  // Join admin room
  public joinAdminRoom(adminId: string, role: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:join', { adminId, role });
      console.log(`Joined admin room: ${adminId} with role: ${role}`);
    }
  }

  // Emit custom events
  public emit(event: string, data: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
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
const socketService = new SocketService();

export default socketService;
