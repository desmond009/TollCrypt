import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Notification } from '../models/Notification';
import { TollTransaction } from '../models/TollTransaction';
import { Vehicle } from '../models/Vehicle';
import { AdminUser } from '../models/AdminUser';

export class SocketService {
  private io: SocketIOServer;
  private adminRooms: Map<string, string[]> = new Map(); // adminId -> socketIds

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
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

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Admin joins their specific room
      socket.on('admin:join', async (data: { adminId: string, role: string }) => {
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
          this.adminRooms.get(adminId)!.push(socket.id);

          // Send unread notifications
          const unreadNotifications = await Notification.find({
            $or: [
              { recipientId: adminId },
              { recipientRole: role }
            ],
            isRead: false
          }).sort({ createdAt: -1 }).limit(10);

          socket.emit('notifications:unread', unreadNotifications);

          console.log(`Admin ${adminId} joined with role ${role}`);
        } catch (error) {
          console.error('Error in admin:join:', error);
          socket.emit('error', { message: 'Failed to join admin room' });
        }
      });

      // User joins general room
      socket.on('user:join', (data: { userId: string }) => {
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
  public emitToAdmins(event: string, data: any) {
    this.io.to('role:super_admin').emit(event, data);
    this.io.to('role:admin').emit(event, data);
    this.io.to('role:operator').emit(event, data);
  }

  // Emit to specific admin
  public emitToAdmin(adminId: string, event: string, data: any) {
    this.io.to(`admin:${adminId}`).emit(event, data);
  }

  // Emit to specific user
  public emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Emit to role-based rooms
  public emitToRole(role: string, event: string, data: any) {
    this.io.to(`role:${role}`).emit(event, data);
  }

  // Broadcast new transaction to admins
  public async broadcastNewTransaction(transaction: any) {
    try {
      // Get transaction with populated data
      const populatedTransaction = await TollTransaction.findById(transaction._id)
        .populate('vehicleId', 'vehicleId vehicleType owner')
        .lean();

      // Create notification
      const notification = new Notification({
        type: 'transaction',
        title: 'New Toll Transaction',
        message: `Vehicle ${(populatedTransaction?.vehicleId as any)?.vehicleId} paid ₹${transaction.amount}`,
        recipientRole: 'admin',
        priority: 'medium',
        metadata: {
          transactionId: transaction._id,
          vehicleId: transaction.vehicleId,
          amount: transaction.amount
        }
      });
      await notification.save();

      // Emit to all admins
      this.emitToAdmins('transaction:new', populatedTransaction);
      this.emitToAdmins('notification:new', notification);
    } catch (error) {
      console.error('Error broadcasting new transaction:', error);
    }
  }

  // Broadcast vehicle registration to admins
  public async broadcastVehicleRegistration(vehicle: any) {
    try {
      // Create notification
      const notification = new Notification({
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
    } catch (error) {
      console.error('Error broadcasting vehicle registration:', error);
    }
  }

  // Broadcast vehicle blacklist status change
  public async broadcastVehicleBlacklist(vehicle: any, isBlacklisted: boolean) {
    try {
      const notification = new Notification({
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
    } catch (error) {
      console.error('Error broadcasting vehicle blacklist:', error);
    }
  }

  // Broadcast system alerts
  public async broadcastSystemAlert(title: string, message: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    try {
      const notification = new Notification({
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
    } catch (error) {
      console.error('Error broadcasting system alert:', error);
    }
  }

  // Get connected admin count
  public getConnectedAdminCount(): number {
    return this.adminRooms.size;
  }

  // Get connected admins
  public getConnectedAdmins(): string[] {
    return Array.from(this.adminRooms.keys());
  }
}

export default SocketService;