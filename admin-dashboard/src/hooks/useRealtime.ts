import { useEffect, useState, useCallback } from 'react';
import adminSocketService from '../services/socketService';

interface RealtimeData {
  transactions: any[];
  vehicles: any[];
  notifications: any[];
  alerts: any[];
  plazas: any[];
  disputes: any[];
}

export const useRealtime = (adminId?: string, role?: string) => {
  const [data, setData] = useState<RealtimeData>({
    transactions: [],
    vehicles: [],
    notifications: [],
    alerts: [],
    plazas: [],
    disputes: []
  });
  const [isConnected, setIsConnected] = useState(false);

  // Handle real-time transaction updates
  const handleTransactionUpdate = useCallback((event: CustomEvent) => {
    const transaction = event.detail;
    setData(prev => ({
      ...prev,
      transactions: [transaction, ...prev.transactions.slice(0, 99)] // Keep last 100
    }));
  }, []);

  // Handle real-time vehicle updates
  const handleVehicleUpdate = useCallback((event: CustomEvent) => {
    const vehicle = event.detail;
    setData(prev => ({
      ...prev,
      vehicles: [vehicle, ...prev.vehicles.slice(0, 99)] // Keep last 100
    }));
  }, []);

  // Handle real-time notification updates
  const handleNotificationUpdate = useCallback((event: CustomEvent) => {
    const notification = event.detail;
    setData(prev => ({
      ...prev,
      notifications: [notification, ...prev.notifications.slice(0, 99)] // Keep last 100
    }));
  }, []);

  // Handle real-time alert updates
  const handleAlertUpdate = useCallback((event: CustomEvent) => {
    const alert = event.detail;
    setData(prev => ({
      ...prev,
      alerts: [alert, ...prev.alerts.slice(0, 99)] // Keep last 100
    }));
  }, []);

  // Handle plaza updates
  const handlePlazaUpdate = useCallback((event: CustomEvent) => {
    const plaza = event.detail;
    setData(prev => ({
      ...prev,
      plazas: [plaza, ...prev.plazas.slice(0, 49)] // Keep last 50
    }));
  }, []);

  // Handle dispute updates
  const handleDisputeUpdate = useCallback((event: CustomEvent) => {
    const dispute = event.detail;
    setData(prev => ({
      ...prev,
      disputes: prev.disputes.map(d => 
        d._id === dispute._id ? dispute : d
      )
    }));
  }, []);

  // Handle vehicle blacklist updates
  const handleVehicleBlacklistUpdate = useCallback((event: CustomEvent) => {
    const { vehicle, isBlacklisted } = event.detail;
    setData(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.vehicleId === vehicle.vehicleId 
          ? { ...v, isBlacklisted }
          : v
      )
    }));
  }, []);

  useEffect(() => {
    // Join admin room
    if (adminId && role) {
      adminSocketService.joinAdminRoom(adminId, role);
    }

    // Set up event listeners
    window.addEventListener('admin:transaction:new', handleTransactionUpdate as EventListener);
    window.addEventListener('admin:vehicle:registered', handleVehicleUpdate as EventListener);
    window.addEventListener('admin:notification:new', handleNotificationUpdate as EventListener);
    window.addEventListener('admin:system:alert', handleAlertUpdate as EventListener);
    window.addEventListener('admin:plaza:created', handlePlazaUpdate as EventListener);
    window.addEventListener('admin:dispute:updated', handleDisputeUpdate as EventListener);
    window.addEventListener('admin:vehicle:blacklist', handleVehicleBlacklistUpdate as EventListener);

    // Check connection status
    const checkConnection = () => {
      const status = adminSocketService.getConnectionStatus();
      setIsConnected(status.isConnected);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    return () => {
      // Clean up event listeners
      window.removeEventListener('admin:transaction:new', handleTransactionUpdate as EventListener);
      window.removeEventListener('admin:vehicle:registered', handleVehicleUpdate as EventListener);
      window.removeEventListener('admin:notification:new', handleNotificationUpdate as EventListener);
      window.removeEventListener('admin:system:alert', handleAlertUpdate as EventListener);
      window.removeEventListener('admin:plaza:created', handlePlazaUpdate as EventListener);
      window.removeEventListener('admin:dispute:updated', handleDisputeUpdate as EventListener);
      window.removeEventListener('admin:vehicle:blacklist', handleVehicleBlacklistUpdate as EventListener);
      
      clearInterval(interval);
    };
  }, [adminId, role, handleTransactionUpdate, handleVehicleUpdate, handleNotificationUpdate, handleAlertUpdate, handlePlazaUpdate, handleDisputeUpdate, handleVehicleBlacklistUpdate]);

  // Emit custom events
  const emit = useCallback((event: string, data: any) => {
    adminSocketService.emit(event, data);
  }, []);

  // Listen for specific events
  const on = useCallback((event: string, callback: (data: any) => void) => {
    adminSocketService.on(event, callback);
  }, []);

  // Remove event listener
  const off = useCallback((event: string, callback?: (data: any) => void) => {
    adminSocketService.off(event, callback);
  }, []);

  // Reconnect manually
  const reconnect = useCallback(() => {
    adminSocketService.reconnect();
  }, []);

  return {
    data,
    isConnected,
    emit,
    on,
    off,
    reconnect
  };
};

export default useRealtime;
