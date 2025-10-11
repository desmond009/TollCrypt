"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = setupSocketHandlers;
exports.emitTollPaymentUpdate = emitTollPaymentUpdate;
exports.emitVehicleRegistrationUpdate = emitVehicleRegistrationUpdate;
exports.emitVehicleBlacklistUpdate = emitVehicleBlacklistUpdate;
exports.emitSystemAlert = emitSystemAlert;
const Vehicle_1 = require("../models/Vehicle");
function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);
        // Handle authentication
        socket.on('authenticate', (data) => {
            socket.userId = data.userId;
            socket.userRole = data.userRole;
            socket.join(`user_${data.userId}`);
            if (data.userRole === 'admin' || data.userRole === 'super_admin') {
                socket.join('admins');
            }
            console.log(`User ${data.userId} authenticated with role ${data.userRole}`);
        });
        // Handle vehicle registration updates
        socket.on('subscribe_vehicle_updates', (vehicleId) => {
            socket.join(`vehicle_${vehicleId}`);
            console.log(`Socket ${socket.id} subscribed to vehicle ${vehicleId} updates`);
        });
        // Handle toll payment updates
        socket.on('subscribe_toll_updates', (vehicleId) => {
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
        socket.on('vehicle_detected', async (data) => {
            try {
                console.log(`Vehicle detected: ${data.vehicleId}`);
                // Check if vehicle is registered and active
                const vehicle = await Vehicle_1.Vehicle.findOne({
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
                }
                else {
                    // Notify admins of unregistered vehicle
                    io.to('admins').emit('unregistered_vehicle_detected', {
                        vehicleId: data.vehicleId,
                        location: data.location,
                        timestamp: new Date()
                    });
                }
            }
            catch (error) {
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
function emitTollPaymentUpdate(io, transaction) {
    io.to(`user_${transaction.payer}`).emit('toll_payment_update', transaction);
    io.to(`vehicle_${transaction.vehicleId}`).emit('toll_payment_update', transaction);
    io.to('admin_dashboard').emit('toll_payment_update', transaction);
}
function emitVehicleRegistrationUpdate(io, vehicle) {
    io.to(`user_${vehicle.owner}`).emit('vehicle_registration_update', vehicle);
    io.to(`vehicle_${vehicle.vehicleId}`).emit('vehicle_registration_update', vehicle);
    io.to('admin_dashboard').emit('vehicle_registration_update', vehicle);
}
function emitVehicleBlacklistUpdate(io, vehicleId, isBlacklisted) {
    io.to(`vehicle_${vehicleId}`).emit('vehicle_blacklist_update', { vehicleId, isBlacklisted });
    io.to('admin_dashboard').emit('vehicle_blacklist_update', { vehicleId, isBlacklisted });
}
function emitSystemAlert(io, alert) {
    io.to('admin_dashboard').emit('system_alert', {
        ...alert,
        timestamp: new Date()
    });
}
//# sourceMappingURL=socketService.js.map