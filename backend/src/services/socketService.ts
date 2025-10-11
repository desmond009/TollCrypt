import { Server, Socket } from 'socket.io';
import { TollTransaction } from '../models/TollTransaction';
import { Vehicle } from '../models/Vehicle';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle authentication
    socket.on('authenticate', (data: { userId: string; userRole: string }) => {
      socket.userId = data.userId;
      socket.userRole = data.userRole;
      socket.join(`user_${data.userId}`);
      
      if (data.userRole === 'admin' || data.userRole === 'super_admin') {
        socket.join('admins');
      }
      
      console.log(`User ${data.userId} authenticated with role ${data.userRole}`);
    });

    // Handle vehicle registration updates
    socket.on('subscribe_vehicle_updates', (vehicleId: string) => {
      socket.join(`vehicle_${vehicleId}`);
      console.log(`Socket ${socket.id} subscribed to vehicle ${vehicleId} updates`);
    });

    // Handle toll payment updates
    socket.on('subscribe_toll_updates', (vehicleId: string) => {
      socket.join(`toll_${vehicleId}`);
      console.log(`Socket ${socket.id} subscribed to toll updates for vehicle ${vehicleId}`);
    });

    // Handle admin dashboard updates
    socket.on('subscribe_admin_updates', () => {
      if (socket.userRole === 'admin' || socket.userRole === 'super_admin') {
        socket.join('admin_dashboard');
        console.log(`Socket ${socket.id} subscribed to admin updates`);
      }
    });

    // Handle hardware integration
    socket.on('vehicle_detected', async (data: { vehicleId: string; location?: { lat: number; lng: number } }) => {
      try {
        console.log(`Vehicle detected: ${data.vehicleId}`);
        
        // Check if vehicle is registered and active
        const vehicle = await Vehicle.findOne({ 
          vehicleId: data.vehicleId, 
          isActive: true, 
          isBlacklisted: false 
        });
        
        if (vehicle) {
          // Notify the vehicle owner
          io.to(`user_${vehicle.owner}`).emit('toll_triggered', {
            vehicleId: data.vehicleId,
            location: data.location,
            timestamp: new Date()
          });
          
          // Notify admins
          io.to('admins').emit('vehicle_detected', {
            vehicleId: data.vehicleId,
            owner: vehicle.owner,
            location: data.location,
            timestamp: new Date()
          });
        } else {
          // Notify admins of unregistered vehicle
          io.to('admins').emit('unregistered_vehicle_detected', {
            vehicleId: data.vehicleId,
            location: data.location,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error handling vehicle detection:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

// Utility functions for emitting events
export function emitTollPaymentUpdate(io: Server, transaction: any) {
  io.to(`user_${transaction.payer}`).emit('toll_payment_update', transaction);
  io.to(`vehicle_${transaction.vehicleId}`).emit('toll_payment_update', transaction);
  io.to('admin_dashboard').emit('toll_payment_update', transaction);
}

export function emitVehicleRegistrationUpdate(io: Server, vehicle: any) {
  io.to(`user_${vehicle.owner}`).emit('vehicle_registration_update', vehicle);
  io.to(`vehicle_${vehicle.vehicleId}`).emit('vehicle_registration_update', vehicle);
  io.to('admin_dashboard').emit('vehicle_registration_update', vehicle);
}

export function emitVehicleBlacklistUpdate(io: Server, vehicleId: string, isBlacklisted: boolean) {
  io.to(`vehicle_${vehicleId}`).emit('vehicle_blacklist_update', { vehicleId, isBlacklisted });
  io.to('admin_dashboard').emit('vehicle_blacklist_update', { vehicleId, isBlacklisted });
}

export function emitSystemAlert(io: Server, alert: { type: string; message: string; severity: 'info' | 'warning' | 'error' }) {
  io.to('admin_dashboard').emit('system_alert', {
    ...alert,
    timestamp: new Date()
  });
}
