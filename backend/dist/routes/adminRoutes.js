"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const express_1 = __importDefault(require("express"));
const TollTransaction_1 = require("../models/TollTransaction");
const Vehicle_1 = require("../models/Vehicle");
const AdminUser_1 = require("../models/AdminUser");
const TollPlaza_1 = require("../models/TollPlaza");
const Notification_1 = require("../models/Notification");
const AuditLog_1 = require("../models/AuditLog");
const Dispute_1 = require("../models/Dispute");
const blockchainService_1 = require("../services/blockchainService");
const socketInstance_1 = require("../services/socketInstance");
const router = express_1.default.Router();
exports.adminRoutes = router;
// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        // Get transaction statistics
        const todayTransactions = await TollTransaction_1.TollTransaction.countDocuments({
            timestamp: { $gte: today },
            status: 'confirmed'
        });
        const thisMonthTransactions = await TollTransaction_1.TollTransaction.countDocuments({
            timestamp: { $gte: thisMonth },
            status: 'confirmed'
        });
        const lastMonthTransactions = await TollTransaction_1.TollTransaction.countDocuments({
            timestamp: { $gte: lastMonth, $lt: thisMonth },
            status: 'confirmed'
        });
        // Get revenue statistics
        const todayRevenue = await TollTransaction_1.TollTransaction.aggregate([
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
        const thisMonthRevenue = await TollTransaction_1.TollTransaction.aggregate([
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
        const totalVehicles = await Vehicle_1.Vehicle.countDocuments({ isActive: true });
        const blacklistedVehicles = await Vehicle_1.Vehicle.countDocuments({ isBlacklisted: true });
        const newVehiclesToday = await Vehicle_1.Vehicle.countDocuments({
            registrationTime: { $gte: today }
        });
        // Get recent transactions
        const recentTransactions = await TollTransaction_1.TollTransaction.find({ status: 'confirmed' })
            .sort({ timestamp: -1 })
            .limit(10)
            .populate('vehicleId', 'vehicleId owner');
        // Get contract balance
        const contractBalance = await (0, blockchainService_1.getContractBalance)();
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
    }
    catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});
// Get all vehicles (admin view)
router.get('/vehicles', async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        let query = {};
        if (search) {
            query.$or = [
                { vehicleId: { $regex: search, $options: 'i' } },
                { owner: { $regex: search, $options: 'i' } }
            ];
        }
        if (status === 'active') {
            query.isActive = true;
            query.isBlacklisted = false;
        }
        else if (status === 'blacklisted') {
            query.isBlacklisted = true;
        }
        else if (status === 'inactive') {
            query.isActive = false;
        }
        const vehicles = await Vehicle_1.Vehicle.find(query)
            .sort({ registrationTime: -1 })
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));
        const total = await Vehicle_1.Vehicle.countDocuments(query);
        // Transform vehicles data to match admin dashboard format
        const transformedVehicles = vehicles.map(vehicle => {
            // Calculate transaction stats for this vehicle
            const totalTransactions = 0; // This would need to be calculated from TollTransaction model
            const totalAmount = 0; // This would need to be calculated from TollTransaction model
            const currentBalance = 0; // This would need to be calculated from wallet balance
            return {
                id: vehicle._id.toString(),
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
    }
    catch (error) {
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
        let query = {};
        if (status)
            query.status = status;
        if (vehicleId)
            query.vehicleId = vehicleId;
        if (payer)
            query.payer = { $regex: payer, $options: 'i' };
        const transactions = await TollTransaction_1.TollTransaction.find(query)
            .sort({ timestamp: -1 })
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));
        const total = await TollTransaction_1.TollTransaction.countDocuments(query);
        res.json({
            transactions,
            totalPages: Math.ceil(total / Number(limit)),
            currentPage: Number(page),
            total
        });
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
// Blacklist/whitelist vehicle
router.put('/vehicles/:vehicleId/blacklist', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { isBlacklisted } = req.body;
        const vehicle = await Vehicle_1.Vehicle.findOneAndUpdate({ vehicleId }, { isBlacklisted }, { new: true });
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
    }
    catch (error) {
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
        const dailyTransactions = await TollTransaction_1.TollTransaction.aggregate([
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
        const vehicleTypeDistribution = await Vehicle_1.Vehicle.aggregate([
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
        const statusDistribution = await TollTransaction_1.TollTransaction.aggregate([
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
    }
    catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});
// Get all toll plazas
router.get('/plazas', async (req, res) => {
    try {
        const plazas = await TollPlaza_1.TollPlaza.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            data: plazas
        });
    }
    catch (error) {
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
        const plaza = new TollPlaza_1.TollPlaza({
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
            const socketService = (0, socketInstance_1.getSocketService)();
            socketService.emitToAdmins('plaza:created', plaza);
        }
        catch (socketError) {
            console.error('Error broadcasting plaza creation:', socketError);
        }
        res.status(201).json({
            success: true,
            data: plaza,
            message: 'Plaza created successfully'
        });
    }
    catch (error) {
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
        let query = {};
        if (adminId) {
            query.$or = [
                { recipientId: adminId },
                { recipientRole: role }
            ];
        }
        else if (role) {
            query.recipientRole = role;
        }
        if (unreadOnly === 'true') {
            query.isRead = false;
        }
        const notifications = await Notification_1.Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit));
        res.json({
            success: true,
            data: notifications
        });
    }
    catch (error) {
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
        const notification = await Notification_1.Notification.findByIdAndUpdate(id, { isRead: true, readAt: new Date() }, { new: true });
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
    }
    catch (error) {
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
        let query = {};
        if (status)
            query.status = status;
        if (assignedTo)
            query.assignedTo = assignedTo;
        const disputes = await Dispute_1.Dispute.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit))
            .populate('transactionId', 'transactionId amount timestamp')
            .populate('vehicleId', 'vehicleId vehicleType owner');
        const total = await Dispute_1.Dispute.countDocuments(query);
        res.json({
            success: true,
            data: disputes,
            totalPages: Math.ceil(total / Number(limit)),
            currentPage: Number(page),
            total
        });
    }
    catch (error) {
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
        const updateData = { status };
        if (resolution)
            updateData.resolution = resolution;
        if (assignedTo)
            updateData.assignedTo = assignedTo;
        if (status === 'resolved' || status === 'rejected') {
            updateData.resolvedAt = new Date();
        }
        const dispute = await Dispute_1.Dispute.findByIdAndUpdate(id, updateData, { new: true });
        if (!dispute) {
            return res.status(404).json({
                success: false,
                error: 'Dispute not found'
            });
        }
        // Broadcast update to admins
        try {
            const socketService = (0, socketInstance_1.getSocketService)();
            socketService.emitToAdmins('dispute:updated', dispute);
        }
        catch (socketError) {
            console.error('Error broadcasting dispute update:', socketError);
        }
        res.json({
            success: true,
            data: dispute,
            message: 'Dispute updated successfully'
        });
    }
    catch (error) {
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
        let query = {};
        if (adminId)
            query.adminId = adminId;
        if (action)
            query.action = action;
        if (resource)
            query.resource = resource;
        const logs = await AuditLog_1.AuditLog.find(query)
            .sort({ timestamp: -1 })
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit))
            .populate('adminId', 'name email role');
        const total = await AuditLog_1.AuditLog.countDocuments(query);
        res.json({
            success: true,
            data: logs,
            totalPages: Math.ceil(total / Number(limit)),
            currentPage: Number(page),
            total
        });
    }
    catch (error) {
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
        const users = await AdminUser_1.AdminUser.find({ isActive: true })
            .select('-__v')
            .sort({ createdAt: -1 });
        res.json(users);
    }
    catch (error) {
        console.error('Error fetching admin users:', error);
        res.status(500).json({ error: 'Failed to fetch admin users' });
    }
});
// Create admin user
router.post('/users', async (req, res) => {
    try {
        const { email, name, role } = req.body;
        const existingUser = await AdminUser_1.AdminUser.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const user = new AdminUser_1.AdminUser({
            email,
            name,
            role
        });
        await user.save();
        res.status(201).json(user);
    }
    catch (error) {
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
        const todayTransactions = await TollTransaction_1.TollTransaction.countDocuments({
            timestamp: { $gte: today },
            status: 'confirmed'
        });
        const thisMonthTransactions = await TollTransaction_1.TollTransaction.countDocuments({
            timestamp: { $gte: thisMonth },
            status: 'confirmed'
        });
        // Get revenue statistics
        const todayRevenue = await TollTransaction_1.TollTransaction.aggregate([
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
        const thisMonthRevenue = await TollTransaction_1.TollTransaction.aggregate([
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
        const totalVehicles = await Vehicle_1.Vehicle.countDocuments({ isActive: true });
        const blacklistedVehicles = await Vehicle_1.Vehicle.countDocuments({ isBlacklisted: true });
        const newVehiclesToday = await Vehicle_1.Vehicle.countDocuments({
            registrationTime: { $gte: today }
        });
        // Get active plazas
        const activePlazas = await TollPlaza_1.TollPlaza.countDocuments({ isActive: true });
        // Get failed transactions
        const failedTransactions = await TollTransaction_1.TollTransaction.countDocuments({
            timestamp: { $gte: today },
            status: 'failed'
        });
        // Calculate success rate
        const totalTodayTransactions = await TollTransaction_1.TollTransaction.countDocuments({
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
    }
    catch (error) {
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
        const transactions = await TollTransaction_1.TollTransaction.find({ status: 'confirmed' })
            .sort({ timestamp: -1 })
            .limit(Number(limit))
            .populate('vehicleId', 'vehicleId owner');
        res.json({
            success: true,
            data: transactions.map(tx => ({
                id: tx._id,
                vehicleId: tx.vehicleId?.vehicleId || 'Unknown',
                amount: tx.amount,
                timestamp: tx.timestamp,
                plaza: tx.tollLocation || 'Unknown',
                status: tx.status
            }))
        });
    }
    catch (error) {
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
        const dailyRevenue = await TollTransaction_1.TollTransaction.aggregate([
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
        const revenueByPlaza = await TollTransaction_1.TollTransaction.aggregate([
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
    }
    catch (error) {
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
        const vehicleTypeDistribution = await Vehicle_1.Vehicle.aggregate([
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
        const vehicleTypeRevenue = await TollTransaction_1.TollTransaction.aggregate([
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
    }
    catch (error) {
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
        const vehicles = await Vehicle_1.Vehicle.find({})
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Error fetching operators:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch operators'
        });
    }
});
// Process toll payment from admin QR scan
router.post('/process-toll', async (req, res) => {
    try {
        const { walletAddress, vehicleNumber, vehicleType, tollAmount, plazaId, timestamp, adminWallet, gasUsed, transactionHash } = req.body;
        // Validate required fields
        if (!walletAddress || !vehicleNumber || !vehicleType || !tollAmount || !plazaId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        // Find the vehicle
        const vehicle = await Vehicle_1.Vehicle.findOne({
            vehicleId: vehicleNumber,
            isActive: true,
            isBlacklisted: false
        });
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                error: 'Vehicle not registered or not eligible'
            });
        }
        // Create transaction record
        const transaction = new TollTransaction_1.TollTransaction({
            transactionId: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            vehicleId: vehicle._id,
            payer: walletAddress,
            amount: parseFloat(tollAmount),
            currency: 'ETH',
            zkProofHash: transactionHash || `admin_${Date.now()}`, // Use transactionHash as zkProofHash for admin transactions
            tollLocation: `Plaza ${plazaId}`,
            status: 'confirmed',
            blockchainTxHash: transactionHash,
            gasUsed: gasUsed ? parseInt(gasUsed) : undefined,
            processedAt: new Date(),
            metadata: {
                processedBy: 'admin',
                adminWallet,
                plazaId,
                gasUsed,
                transactionHash,
                processedAt: new Date()
            }
        });
        await transaction.save();
        // Update vehicle's last toll time
        await Vehicle_1.Vehicle.findOneAndUpdate({ vehicleId: vehicleNumber }, { lastTollTime: new Date() });
        // Broadcast to admin dashboard
        try {
            const socketService = (0, socketInstance_1.getSocketService)();
            await socketService.broadcastNewTransaction(transaction);
        }
        catch (socketError) {
            console.error('Error broadcasting new transaction:', socketError);
        }
        res.json({
            success: true,
            message: 'Toll payment processed successfully',
            data: {
                transactionId: transaction.transactionId,
                vehicleNumber,
                amount: tollAmount,
                plazaId,
                timestamp: new Date(),
                transactionHash
            }
        });
    }
    catch (error) {
        console.error('Error processing admin toll payment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process toll payment'
        });
    }
});
// Get vehicle details for QR validation
router.post('/validate-vehicle', async (req, res) => {
    try {
        const { vehicleNumber } = req.body;
        if (!vehicleNumber) {
            return res.status(400).json({
                success: false,
                error: 'Vehicle number is required'
            });
        }
        const vehicle = await Vehicle_1.Vehicle.findOne({
            vehicleId: vehicleNumber,
            isActive: true,
            isBlacklisted: false
        });
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                error: 'Vehicle not found or not eligible'
            });
        }
        res.json({
            success: true,
            data: {
                vehicleId: vehicle.vehicleId,
                vehicleType: vehicle.vehicleType,
                owner: vehicle.owner,
                isRegistered: true,
                isBlacklisted: false,
                registrationTime: vehicle.registrationTime,
                lastTollTime: vehicle.lastTollTime
            }
        });
    }
    catch (error) {
        console.error('Error validating vehicle:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate vehicle'
        });
    }
});
//# sourceMappingURL=adminRoutes.js.map