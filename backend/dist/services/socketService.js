"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const Notification_1 = require("../models/Notification");
const TollTransaction_1 = require("../models/TollTransaction");
class SocketService {
    constructor(server) {
        this.adminRooms = new Map(); // adminId -> socketIds
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: [
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://localhost:3002",
                    "http://127.0.0.1:3002",
                    "http://localhost:3003",
                    "http://127.0.0.1:3003",
                    process.env.FRONTEND_URL || "http://localhost:3000",
                    process.env.ADMIN_DASHBOARD_URL || "http://localhost:3003"
                ],
                methods: ["GET", "POST"],
                credentials: true
            }
        });
        this.setupSocketHandlers();
    }
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);
            // Admin joins their specific room
            socket.on('admin:join', async (data) => {
                try {
                    const { adminId, role } = data;
                    // Join admin-specific room
                    socket.join(`admin:${adminId}`);
                    // Join role-based room
                    socket.join(`role:${role}`);
                    // Store admin socket mapping
                    if (!this.adminRooms.has(adminId)) {
                        this.adminRooms.set(adminId, []);
                    }
                    this.adminRooms.get(adminId).push(socket.id);
                    // Send unread notifications
                    const unreadNotifications = await Notification_1.Notification.find({
                        $or: [
                            { recipientId: adminId },
                            { recipientRole: role }
                        ],
                        isRead: false
                    }).sort({ createdAt: -1 }).limit(10);
                    socket.emit('notifications:unread', unreadNotifications);
                    console.log(`Admin ${adminId} joined with role ${role}`);
                }
                catch (error) {
                    console.error('Error in admin:join:', error);
                    socket.emit('error', { message: 'Failed to join admin room' });
                }
            });
            // User joins general room
            socket.on('user:join', (data) => {
                const { userId } = data;
                socket.join(`user:${userId}`);
                console.log(`User ${userId} joined`);
            });
            // Handle disconnect
            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
                // Remove from admin rooms
                for (const [adminId, socketIds] of this.adminRooms.entries()) {
                    const index = socketIds.indexOf(socket.id);
                    if (index > -1) {
                        socketIds.splice(index, 1);
                        if (socketIds.length === 0) {
                            this.adminRooms.delete(adminId);
                        }
                        break;
                    }
                }
            });
        });
    }
    // Emit real-time updates to all admins
    emitToAdmins(event, data) {
        this.io.to('role:super_admin').emit(event, data);
        this.io.to('role:admin').emit(event, data);
        this.io.to('role:operator').emit(event, data);
    }
    // Emit to specific admin
    emitToAdmin(adminId, event, data) {
        this.io.to(`admin:${adminId}`).emit(event, data);
    }
    // Emit to specific user
    emitToUser(userId, event, data) {
        this.io.to(`user:${userId}`).emit(event, data);
    }
    // Emit to role-based rooms
    emitToRole(role, event, data) {
        this.io.to(`role:${role}`).emit(event, data);
    }
    // Broadcast new transaction to admins
    async broadcastNewTransaction(transaction) {
        try {
            // Get transaction with populated data
            const populatedTransaction = await TollTransaction_1.TollTransaction.findById(transaction._id)
                .populate('vehicleId', 'vehicleId vehicleType owner')
                .lean();
            // Create notification
            const notification = new Notification_1.Notification({
                type: 'transaction',
                title: 'New Toll Transaction',
                message: `Vehicle ${populatedTransaction?.vehicleId?.vehicleId} paid ₹${transaction.amount}`,
                recipientRole: 'admin',
                priority: 'medium',
                metadata: {
                    transactionId: transaction._id,
                    vehicleId: transaction.vehicleId,
                    amount: transaction.amount
                }
            });
            await notification.save();
            // Emit to all admins with multiple event types for compatibility
            this.emitToAdmins('transaction:new', populatedTransaction);
            this.emitToAdmins('new_transaction', populatedTransaction);
            this.emitToAdmins('toll_payment_completed', populatedTransaction);
            this.emitToAdmins('notification:new', notification);
        }
        catch (error) {
            console.error('Error broadcasting new transaction:', error);
        }
    }
    // Broadcast transaction status update
    async broadcastTransactionStatusUpdate(transactionId, newStatus, oldStatus) {
        try {
            const transaction = await TollTransaction_1.TollTransaction.findById(transactionId)
                .populate('vehicleId', 'vehicleId vehicleType owner')
                .lean();
            if (!transaction)
                return;
            // Create notification
            const notification = new Notification_1.Notification({
                type: 'transaction',
                title: 'Transaction Status Updated',
                message: `Transaction ${transaction.transactionId} status changed from ${oldStatus} to ${newStatus}`,
                recipientRole: 'admin',
                priority: 'medium',
                metadata: {
                    transactionId: transaction._id,
                    oldStatus,
                    newStatus
                }
            });
            await notification.save();
            // Emit to all admins
            this.emitToAdmins('transaction_status_updated', {
                transactionId: transaction._id,
                transaction,
                oldStatus,
                newStatus
            });
            this.emitToAdmins('notification:new', notification);
        }
        catch (error) {
            console.error('Error broadcasting transaction status update:', error);
        }
    }
    // Broadcast vehicle registration to admins
    async broadcastVehicleRegistration(vehicle) {
        try {
            // Create notification
            const notification = new Notification_1.Notification({
                type: 'vehicle',
                title: 'New Vehicle Registration',
                message: `Vehicle ${vehicle.vehicleId} registered by ${vehicle.owner.slice(0, 8)}...`,
                recipientRole: 'admin',
                priority: 'low',
                metadata: {
                    vehicleId: vehicle._id,
                    owner: vehicle.owner
                }
            });
            await notification.save();
            // Emit to all admins
            this.emitToAdmins('vehicle:registered', vehicle);
            this.emitToAdmins('notification:new', notification);
        }
        catch (error) {
            console.error('Error broadcasting vehicle registration:', error);
        }
    }
    // Broadcast vehicle blacklist status change
    async broadcastVehicleBlacklist(vehicle, isBlacklisted) {
        try {
            const notification = new Notification_1.Notification({
                type: 'vehicle',
                title: isBlacklisted ? 'Vehicle Blacklisted' : 'Vehicle Unblacklisted',
                message: `Vehicle ${vehicle.vehicleId} has been ${isBlacklisted ? 'blacklisted' : 'unblacklisted'}`,
                recipientRole: 'admin',
                priority: 'high',
                metadata: {
                    vehicleId: vehicle._id,
                    isBlacklisted
                }
            });
            await notification.save();
            this.emitToAdmins('vehicle:blacklist', { vehicle, isBlacklisted });
            this.emitToAdmins('notification:new', notification);
        }
        catch (error) {
            console.error('Error broadcasting vehicle blacklist:', error);
        }
    }
    // Broadcast system alerts
    async broadcastSystemAlert(title, message, priority = 'medium') {
        try {
            const notification = new Notification_1.Notification({
                type: 'system',
                title,
                message,
                recipientRole: 'admin',
                priority,
                metadata: {}
            });
            await notification.save();
            this.emitToAdmins('system:alert', { title, message, priority });
            this.emitToAdmins('notification:new', notification);
        }
        catch (error) {
            console.error('Error broadcasting system alert:', error);
        }
    }
    // Get connected admin count
    getConnectedAdminCount() {
        return this.adminRooms.size;
    }
    // Get connected admins
    getConnectedAdmins() {
        return Array.from(this.adminRooms.keys());
    }
}
exports.SocketService = SocketService;
exports.default = SocketService;
//# sourceMappingURL=socketService.js.map