import express from 'express';
import { TollTransaction } from '../models/TollTransaction';
import { Vehicle } from '../models/Vehicle';
import { AdminUser } from '../models/AdminUser';
import { TollPlaza } from '../models/TollPlaza';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';
import { Dispute } from '../models/Dispute';
import { getContractBalance } from '../services/blockchainService';
import { getSocketService } from '../services/socketInstance';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Get transaction statistics
    const todayTransactions = await TollTransaction.countDocuments({
      timestamp: { $gte: today },
      status: 'confirmed'
    });
    
    const thisMonthTransactions = await TollTransaction.countDocuments({
      timestamp: { $gte: thisMonth },
      status: 'confirmed'
    });
    
    const lastMonthTransactions = await TollTransaction.countDocuments({
      timestamp: { $gte: lastMonth, $lt: thisMonth },
      status: 'confirmed'
    });
    
    // Get revenue statistics
    const todayRevenue = await TollTransaction.aggregate([
      {
        $match: {
          timestamp: { $gte: today },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const thisMonthRevenue = await TollTransaction.aggregate([
      {
        $match: {
          timestamp: { $gte: thisMonth },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Get vehicle statistics
    const totalVehicles = await Vehicle.countDocuments({ isActive: true });
    const blacklistedVehicles = await Vehicle.countDocuments({ isBlacklisted: true });
    const newVehiclesToday = await Vehicle.countDocuments({
      registrationTime: { $gte: today }
    });
    
    // Get recent transactions
    const recentTransactions = await TollTransaction.find({ status: 'confirmed' })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('vehicleId', 'vehicleId owner');
    
    // Get contract balance
    const contractBalance = await getContractBalance();
    
    res.json({
      transactions: {
        today: todayTransactions,
        thisMonth: thisMonthTransactions,
        lastMonth: lastMonthTransactions,
        growth: thisMonthTransactions - lastMonthTransactions
      },
      revenue: {
        today: todayRevenue[0]?.total || 0,
        thisMonth: thisMonthRevenue[0]?.total || 0
      },
      vehicles: {
        total: totalVehicles,
        blacklisted: blacklistedVehicles,
        newToday: newVehiclesToday
      },
      contractBalance,
      recentTransactions
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get all vehicles (admin view)
router.get('/vehicles', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    
    let query: any = {};
    
    if (search) {
      query.$or = [
        { vehicleId: { $regex: search, $options: 'i' } },
        { owner: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status === 'active') {
      query.isActive = true;
      query.isBlacklisted = false;
    } else if (status === 'blacklisted') {
      query.isBlacklisted = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    const vehicles = await Vehicle.find(query)
      .sort({ registrationTime: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await Vehicle.countDocuments(query);
    
    // Transform vehicles data to match admin dashboard format
    const transformedVehicles = vehicles.map(vehicle => {
      // Calculate transaction stats for this vehicle
      const totalTransactions = 0; // This would need to be calculated from TollTransaction model
      const totalAmount = 0; // This would need to be calculated from TollTransaction model
      const currentBalance = 0; // This would need to be calculated from wallet balance
      
      return {
        id: (vehicle._id as any).toString(),
        vehicleId: vehicle.vehicleId,
        vehicleType: vehicle.vehicleType,
        owner: vehicle.owner,
        ownerHash: vehicle.owner.slice(0, 8) + '...' + vehicle.owner.slice(-8), // Simple hash for display
        walletAddress: vehicle.fastagWalletAddress || vehicle.owner,
        isActive: vehicle.isActive,
        isBlacklisted: vehicle.isBlacklisted,
        registrationDate: vehicle.registrationTime.toISOString(),
        lastTransactionDate: vehicle.lastTollTime?.toISOString(),
        totalTransactions,
        totalAmount,
        currentBalance,
        status: vehicle.isBlacklisted ? 'blacklisted' : 
                vehicle.isActive ? 'active' : 'inactive',
        documents: vehicle.documents || [],
        metadata: vehicle.metadata || {}
      };
    });
    
    res.json({
      success: true,
      data: transformedVehicles,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch vehicles' 
    });
  }
});

// Get all transactions (admin view)
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, vehicleId, payer } = req.query;
    
    let query: any = {};
    
    if (status) query.status = status;
    if (vehicleId) query.vehicleId = vehicleId;
    if (payer) query.payer = { $regex: payer, $options: 'i' };
    
    const transactions = await TollTransaction.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await TollTransaction.countDocuments(query);
    
    res.json({
      transactions,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Blacklist/whitelist vehicle
router.put('/vehicles/:vehicleId/blacklist', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { isBlacklisted } = req.body;
    
    const vehicle = await Vehicle.findOneAndUpdate(
      { vehicleId },
      { isBlacklisted },
      { new: true }
    );
    
    if (!vehicle) {
      return res.status(404).json({ 
        success: false,
        error: 'Vehicle not found' 
      });
    }
    
    res.json({
      success: true,
      data: vehicle,
      message: `Vehicle ${isBlacklisted ? 'blacklisted' : 'removed from blacklist'} successfully`
    });
  } catch (error) {
    console.error('Error updating vehicle blacklist status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update vehicle blacklist status' 
    });
  }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    // Daily transaction counts
    const dailyTransactions = await TollTransaction.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);
    
    // Vehicle type distribution
    const vehicleTypeDistribution = await Vehicle.aggregate([
      {
        $match: {
          isActive: true,
          'metadata.vehicleType': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$metadata.vehicleType',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Status distribution
    const statusDistribution = await TollTransaction.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      dailyTransactions,
      vehicleTypeDistribution,
      statusDistribution
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Get all toll plazas
router.get('/plazas', async (req, res) => {
  try {
    const plazas = await TollPlaza.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: plazas
    });
  } catch (error) {
    console.error('Error fetching plazas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch plazas' 
    });
  }
});

// Create new toll plaza
router.post('/plazas', async (req, res) => {
  try {
    const { name, location, coordinates, tollRates, operatingHours, assignedOperators } = req.body;
    
    const plaza = new TollPlaza({
      id: `plaza_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      location,
      coordinates,
      tollRates,
      operatingHours,
      assignedOperators: assignedOperators || []
    });
    
    await plaza.save();
    
    // Broadcast to all admins
    try {
      const socketService = getSocketService();
      socketService.emitToAdmins('plaza:created', plaza);
    } catch (socketError) {
      console.error('Error broadcasting plaza creation:', socketError);
    }
    
    res.status(201).json({
      success: true,
      data: plaza,
      message: 'Plaza created successfully'
    });
  } catch (error) {
    console.error('Error creating plaza:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create plaza' 
    });
  }
});

// Get notifications
router.get('/notifications', async (req, res) => {
  try {
    const { adminId, role, limit = 50, unreadOnly = false } = req.query;
    
    let query: any = {};
    
    if (adminId) {
      query.$or = [
        { recipientId: adminId },
        { recipientRole: role }
      ];
    } else if (role) {
      query.recipientRole = role;
    }
    
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch notifications' 
    });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ 
        success: false,
        error: 'Notification not found' 
      });
    }
    
    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to mark notification as read' 
    });
  }
});

// Get disputes
router.get('/disputes', async (req, res) => {
  try {
    const { status, assignedTo, page = 1, limit = 20 } = req.query;
    
    let query: any = {};
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    
    const disputes = await Dispute.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .populate('transactionId', 'transactionId amount timestamp')
      .populate('vehicleId', 'vehicleId vehicleType owner');
    
    const total = await Dispute.countDocuments(query);
    
    res.json({
      success: true,
      data: disputes,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch disputes' 
    });
  }
});

// Update dispute status
router.put('/disputes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, assignedTo } = req.body;
    
    const updateData: any = { status };
    if (resolution) updateData.resolution = resolution;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (status === 'resolved' || status === 'rejected') {
      updateData.resolvedAt = new Date();
    }
    
    const dispute = await Dispute.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!dispute) {
      return res.status(404).json({ 
        success: false,
        error: 'Dispute not found' 
      });
    }
    
    // Broadcast update to admins
    try {
      const socketService = getSocketService();
      socketService.emitToAdmins('dispute:updated', dispute);
    } catch (socketError) {
      console.error('Error broadcasting dispute update:', socketError);
    }
    
    res.json({
      success: true,
      data: dispute,
      message: 'Dispute updated successfully'
    });
  } catch (error) {
    console.error('Error updating dispute:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update dispute' 
    });
  }
});

// Get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { adminId, action, resource, page = 1, limit = 50 } = req.query;
    
    let query: any = {};
    if (adminId) query.adminId = adminId;
    if (action) query.action = action;
    if (resource) query.resource = resource;
    
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .populate('adminId', 'name email role');
    
    const total = await AuditLog.countDocuments(query);
    
    res.json({
      success: true,
      data: logs,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch audit logs' 
    });
  }
});

// Get admin users
router.get('/users', async (req, res) => {
  try {
    const users = await AdminUser.find({ isActive: true })
      .select('-__v')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

// Create admin user
router.post('/users', async (req, res) => {
  try {
    const { email, name, role } = req.body;
    
    const existingUser = await AdminUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const user = new AdminUser({
      email,
      name,
      role
    });
    
    await user.save();
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// Dashboard stats endpoint
router.get('/dashboard/stats', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get transaction statistics
    const todayTransactions = await TollTransaction.countDocuments({
      timestamp: { $gte: today },
      status: 'confirmed'
    });
    
    const thisMonthTransactions = await TollTransaction.countDocuments({
      timestamp: { $gte: thisMonth },
      status: 'confirmed'
    });
    
    // Get revenue statistics
    const todayRevenue = await TollTransaction.aggregate([
      {
        $match: {
          timestamp: { $gte: today },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const thisMonthRevenue = await TollTransaction.aggregate([
      {
        $match: {
          timestamp: { $gte: thisMonth },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Get vehicle statistics
    const totalVehicles = await Vehicle.countDocuments({ isActive: true });
    const blacklistedVehicles = await Vehicle.countDocuments({ isBlacklisted: true });
    const newVehiclesToday = await Vehicle.countDocuments({
      registrationTime: { $gte: today }
    });
    
    // Get active plazas
    const activePlazas = await TollPlaza.countDocuments({ isActive: true });
    
    // Get failed transactions
    const failedTransactions = await TollTransaction.countDocuments({
      timestamp: { $gte: today },
      status: 'failed'
    });
    
    // Calculate success rate
    const totalTodayTransactions = await TollTransaction.countDocuments({
      timestamp: { $gte: today }
    });
    const successRate = totalTodayTransactions > 0 ? 
      ((todayTransactions / totalTodayTransactions) * 100) : 0;
    
    // Calculate average wait time (mock data for now)
    const averageWaitTime = 2.5; // minutes
    
    res.json({
      success: true,
      data: {
        totalVehicles,
        totalRevenue: thisMonthRevenue[0]?.total || 0,
        averageWaitTime,
        successRate: Math.round(successRate * 100) / 100,
        todayTransactions,
        todayRevenue: todayRevenue[0]?.total || 0,
        activePlazas,
        failedTransactions
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch dashboard stats' 
    });
  }
});

// Recent transactions endpoint
router.get('/transactions/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const transactions = await TollTransaction.find({ status: 'confirmed' })
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .populate('vehicleId', 'vehicleId owner');
    
    res.json({
      success: true,
      data: transactions.map(tx => ({
        id: tx._id,
        vehicleId: (tx.vehicleId as any)?.vehicleId || 'Unknown',
        amount: tx.amount,
        timestamp: tx.timestamp,
        plaza: tx.tollLocation || 'Unknown',
        status: tx.status
      }))
    });
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch recent transactions' 
    });
  }
});

// Revenue analytics endpoint
router.get('/analytics/revenue', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    // Daily revenue data
    const dailyRevenue = await TollTransaction.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);
    
    // Revenue by plaza
    const revenueByPlaza = await TollTransaction.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: '$tollLocation',
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      {
        $project: {
          plaza: '$_id',
          revenue: 1,
          transactions: 1
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        daily: dailyRevenue.map(item => ({
          date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
          revenue: item.revenue,
          transactions: item.transactions
        })),
        byPlaza: revenueByPlaza
      }
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch revenue analytics' 
    });
  }
});

// Vehicle types analytics endpoint
router.get('/analytics/vehicle-types', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    // Vehicle type distribution
    const vehicleTypeDistribution = await Vehicle.aggregate([
      {
        $match: {
          isActive: true,
          'metadata.vehicleType': { $exists: true },
          registrationTime: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$metadata.vehicleType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Vehicle type revenue
    const vehicleTypeRevenue = await TollTransaction.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          status: 'confirmed'
        }
      },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicleId',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      {
        $unwind: '$vehicle'
      },
      {
        $group: {
          _id: '$vehicle.metadata.vehicleType',
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      {
        $sort: { revenue: -1 }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        distribution: vehicleTypeDistribution,
        revenue: vehicleTypeRevenue
      }
    });
  } catch (error) {
    console.error('Error fetching vehicle types analytics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch vehicle types analytics' 
    });
  }
});

// Get all vehicles for admin management
router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.find({})
      .sort({ createdAt: -1 })
      .limit(100); // Limit to prevent large responses
    
    res.json({
      success: true,
      data: vehicles.map(vehicle => ({
        id: vehicle._id,
        vehicleId: vehicle.vehicleId,
        owner: vehicle.owner,
        isActive: vehicle.isActive,
        isBlacklisted: vehicle.isBlacklisted,
        registrationTime: vehicle.registrationTime,
        metadata: vehicle.metadata
      }))
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch vehicles' 
    });
  }
});

// Operators endpoint
router.get('/operators', async (req, res) => {
  try {
    // For now, return mock data since we don't have an operators model
    const operators = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@tollchain.com',
        role: 'operator',
        plaza: 'Highway Plaza 1',
        isActive: true
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@tollchain.com',
        role: 'operator',
        plaza: 'Highway Plaza 2',
        isActive: true
      }
    ];
    
    res.json({
      success: true,
      data: operators
    });
  } catch (error) {
    console.error('Error fetching operators:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch operators' 
    });
  }
});

export { router as adminRoutes };
