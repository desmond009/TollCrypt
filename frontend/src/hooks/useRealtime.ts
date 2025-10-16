import { useEffect, useState, useCallback } from 'react';
import socketService from '../services/socketService';

interface RealtimeData {
  transactions: any[];
  vehicles: any[];
  notifications: any[];
  alerts: any[];
}

export const useRealtime = (userId?: string, isAdmin = false, adminId?: string, role?: string) => {
  const [data, setData] = useState<RealtimeData>({
    transactions: [],
    vehicles: [],
    notifications: [],
    alerts: []
  });
  const [isConnected, setIsConnected] = useState(false);

  // Handle real-time transaction updates
  const handleTransactionUpdate = useCallback((event: CustomEvent) => {
    const transaction = event.detail;
    setData(prev => ({
      ...prev,
      transactions: [transaction, ...prev.transactions.slice(0, 49)] // Keep last 50
    }));
  }, []);

  // Handle real-time vehicle updates
  const handleVehicleUpdate = useCallback((event: CustomEvent) => {
    const vehicle = event.detail;
    setData(prev => ({
      ...prev,
      vehicles: [vehicle, ...prev.vehicles.slice(0, 49)] // Keep last 50
    }));
  }, []);

  // Handle real-time notification updates
  const handleNotificationUpdate = useCallback((event: CustomEvent) => {
    const notification = event.detail;
    setData(prev => ({
      ...prev,
      notifications: [notification, ...prev.notifications.slice(0, 49)] // Keep last 50
    }));
  }, []);

  // Handle real-time alert updates
  const handleAlertUpdate = useCallback((event: CustomEvent) => {
    const alert = event.detail;
    setData(prev => ({
      ...prev,
      alerts: [alert, ...prev.alerts.slice(0, 49)] // Keep last 50
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
    // Join appropriate room
    if (isAdmin && adminId && role) {
      socketService.joinAdminRoom(adminId, role);
    } else if (userId) {
      socketService.joinUserRoom(userId);
    }

    // Set up event listeners
    window.addEventListener('realtime:transaction', handleTransactionUpdate as EventListener);
    window.addEventListener('realtime:vehicle', handleVehicleUpdate as EventListener);
    window.addEventListener('realtime:notification', handleNotificationUpdate as EventListener);
    window.addEventListener('realtime:alert', handleAlertUpdate as EventListener);
    window.addEventListener('realtime:vehicle:blacklist', handleVehicleBlacklistUpdate as EventListener);

    // Check connection status
    const checkConnection = () => {
      const status = socketService.getConnectionStatus();
      setIsConnected(status.isConnected);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    return () => {
      // Clean up event listeners
      window.removeEventListener('realtime:transaction', handleTransactionUpdate as EventListener);
      window.removeEventListener('realtime:vehicle', handleVehicleUpdate as EventListener);
      window.removeEventListener('realtime:notification', handleNotificationUpdate as EventListener);
      window.removeEventListener('realtime:alert', handleAlertUpdate as EventListener);
      window.removeEventListener('realtime:vehicle:blacklist', handleVehicleBlacklistUpdate as EventListener);
      
      clearInterval(interval);
    };
  }, [userId, isAdmin, adminId, role, handleTransactionUpdate, handleVehicleUpdate, handleNotificationUpdate, handleAlertUpdate, handleVehicleBlacklistUpdate]);

  // Emit custom events
  const emit = useCallback((event: string, data: any) => {
    socketService.emit(event, data);
  }, []);

  // Listen for specific events
  const on = useCallback((event: string, callback: (data: any) => void) => {
    socketService.on(event, callback);
  }, []);

  // Remove event listener
  const off = useCallback((event: string, callback?: (data: any) => void) => {
    socketService.off(event, callback);
  }, []);

  // Reconnect manually
  const reconnect = useCallback(() => {
    socketService.reconnect();
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
