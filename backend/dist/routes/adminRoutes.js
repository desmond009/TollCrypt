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
const SimplePlaza_1 = require("../models/SimplePlaza");
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
        const transformedVehicles = await Promise.all(vehicles.map(async (vehicle) => {
            // Calculate transaction stats for this vehicle
            const TollTransaction = require('../models/TollTransaction').TollTransaction;
            const transactions = await TollTransaction.find({ vehicleId: vehicle._id });
            const totalTransactions = transactions.length;
            const totalAmount = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
            // Get top-up wallet address from blockchain service
            let topUpWalletAddress = vehicle.fastagWalletAddress || vehicle.owner;
            let currentBalance = 0;
            try {
                const { TopUpWalletService } = require('../services/topUpWalletService');
                const topUpService = new TopUpWalletService();
                const walletInfo = await topUpService.getTopUpWalletInfo(vehicle.owner);
                if (walletInfo) {
                    topUpWalletAddress = walletInfo.walletAddress;
                    currentBalance = parseFloat(walletInfo.balance) || 0;
                }
            }
            catch (error) {
                console.error(`Error fetching wallet info for ${vehicle.owner}:`, error);
            }
            return {
                id: vehicle._id.toString(),
                vehicleId: vehicle.vehicleId,
                vehicleType: vehicle.vehicleType,
                owner: vehicle.owner,
                ownerHash: vehicle.owner.slice(0, 8) + '...' + vehicle.owner.slice(-8), // Simple hash for display
                walletAddress: topUpWalletAddress,
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
        }));
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
        const { page = 1, limit = 20, status, search } = req.query;
        let query = {};
        // Apply status filter
        if (status)
            query.status = status;
        // Apply search filter
        if (search) {
            // First, try to find vehicles that match the search term
            const Vehicle = require('../models/Vehicle').Vehicle;
            const matchingVehicles = await Vehicle.find({
                $or: [
                    { vehicleId: { $regex: search, $options: 'i' } },
                    { vehicleType: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');
            const vehicleIds = matchingVehicles.map((v) => v._id);
            query.$or = [
                { transactionId: { $regex: search, $options: 'i' } },
                { payer: { $regex: search, $options: 'i' } },
                { blockchainTxHash: { $regex: search, $options: 'i' } },
                { tollLocation: { $regex: search, $options: 'i' } },
                ...(vehicleIds.length > 0 ? [{ vehicleId: { $in: vehicleIds } }] : [])
            ];
        }
        const transactions = await TollTransaction_1.TollTransaction.find(query)
            .populate('vehicleId', 'vehicleId vehicleType')
            .sort({ timestamp: -1 })
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));
        const total = await TollTransaction_1.TollTransaction.countDocuments(query);
        // Transform transactions for better display
        const transformedTransactions = transactions.map(tx => {
            // Handle populated vehicleId properly
            const vehicleData = tx.vehicleId;
            const vehicleId = vehicleData?.vehicleId || 'Unknown';
            const vehicleType = vehicleData?.vehicleType || 'Unknown';
            return {
                _id: tx._id,
                transactionId: tx.transactionId,
                vehicleId: vehicleId,
                vehicleType: vehicleType,
                payer: tx.payer,
                amount: tx.amount || 0,
                currency: tx.currency || 'ETH',
                status: tx.status,
                timestamp: tx.timestamp || tx.createdAt,
                blockchainTxHash: tx.blockchainTxHash,
                blockNumber: tx.blockNumber,
                tollLocation: tx.tollLocation,
                gasUsed: tx.gasUsed,
                zkProofHash: tx.zkProofHash,
                processedAt: tx.processedAt,
                metadata: tx.metadata || {}
            };
        });
        res.json({
            success: true,
            transactions: transformedTransactions,
            totalPages: Math.ceil(total / Number(limit)),
            currentPage: Number(page),
            total,
            limit: Number(limit)
        });
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transactions'
        });
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
        const plazas = await SimplePlaza_1.SimplePlaza.find().sort({ createdAt: -1 });
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
        const { name, location, coordinates, status, tollRates, operatingHours, assignedOperators } = req.body;
        // Generate a unique ID
        const uniqueId = `PLAZA-${Math.random().toString(36).substr(2, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        // Create a simplified plaza object that matches the frontend expectations
        const plazaData = {
            id: uniqueId,
            name,
            location,
            coordinates: {
                lat: parseFloat(coordinates.lat),
                lng: parseFloat(coordinates.lng)
            },
            status: status || 'active',
            tollRates: {
                '2-wheeler': parseFloat(tollRates['2-wheeler']) || 0,
                '4-wheeler': parseFloat(tollRates['4-wheeler']) || 0,
                'car': parseFloat(tollRates['car']) || 0,
                'lcv': parseFloat(tollRates['lcv']) || 0,
                'hcv': parseFloat(tollRates['hcv']) || 0,
                'truck': parseFloat(tollRates['truck']) || 0,
                'bus': parseFloat(tollRates['bus']) || 0
            },
            operatingHours: {
                start: operatingHours.start || '06:00',
                end: operatingHours.end || '22:00'
            },
            assignedOperators: assignedOperators || [],
            todayTransactions: 0,
            todayRevenue: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        // Create the plaza using the simplified model
        const plaza = new SimplePlaza_1.SimplePlaza(plazaData);
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
            error: 'Failed to create plaza',
            details: error.message
        });
    }
});
// Update toll plaza
router.put('/plazas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, coordinates, status, tollRates, operatingHours, assignedOperators } = req.body;
        const updateData = {
            name,
            location,
            coordinates: {
                lat: parseFloat(coordinates.lat),
                lng: parseFloat(coordinates.lng)
            },
            status: status || 'active',
            tollRates: {
                '2-wheeler': parseFloat(tollRates['2-wheeler']) || 0,
                '4-wheeler': parseFloat(tollRates['4-wheeler']) || 0,
                'car': parseFloat(tollRates['car']) || 0,
                'lcv': parseFloat(tollRates['lcv']) || 0,
                'hcv': parseFloat(tollRates['hcv']) || 0,
                'truck': parseFloat(tollRates['truck']) || 0,
                'bus': parseFloat(tollRates['bus']) || 0
            },
            operatingHours: {
                start: operatingHours.start || '06:00',
                end: operatingHours.end || '22:00'
            },
            assignedOperators: assignedOperators || [],
            updatedAt: new Date()
        };
        const plaza = await SimplePlaza_1.SimplePlaza.findByIdAndUpdate(id, updateData, { new: true });
        if (!plaza) {
            return res.status(404).json({
                success: false,
                error: 'Plaza not found'
            });
        }
        // Broadcast to all admins
        try {
            const socketService = (0, socketInstance_1.getSocketService)();
            socketService.emitToAdmins('plaza:updated', plaza);
        }
        catch (socketError) {
            console.error('Error broadcasting plaza update:', socketError);
        }
        res.json({
            success: true,
            data: plaza,
            message: 'Plaza updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating plaza:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update plaza',
            details: error.message
        });
    }
});
// Delete toll plaza
router.delete('/plazas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const plaza = await SimplePlaza_1.SimplePlaza.findByIdAndDelete(id);
        if (!plaza) {
            return res.status(404).json({
                success: false,
                error: 'Plaza not found'
            });
        }
        // Broadcast to all admins
        try {
            const socketService = (0, socketInstance_1.getSocketService)();
            socketService.emitToAdmins('plaza:deleted', { id });
        }
        catch (socketError) {
            console.error('Error broadcasting plaza deletion:', socketError);
        }
        res.json({
            success: true,
            message: 'Plaza deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting plaza:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete plaza',
            details: error.message
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
        const activePlazas = await SimplePlaza_1.SimplePlaza.countDocuments({ status: 'active' });
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
// Main analytics endpoint (for AnalyticsReporting component)
router.get('/analytics', async (req, res) => {
    try {
        const { startDate, endDate, plazaId, vehicleType, reportType = 'revenue' } = req.query;
        // Parse dates
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const end = endDate ? new Date(endDate) : new Date();
        // Build base query
        let baseQuery = {
            timestamp: { $gte: start, $lte: end },
            status: 'confirmed'
        };
        // Add plaza filter if specified
        if (plazaId) {
            baseQuery.tollLocation = { $regex: plazaId, $options: 'i' };
        }
        // Get transactions with vehicle data
        const transactions = await TollTransaction_1.TollTransaction.find(baseQuery)
            .populate('vehicleId', 'vehicleId vehicleType')
            .lean();
        // Filter by vehicle type if specified
        let filteredTransactions = transactions;
        if (vehicleType) {
            filteredTransactions = transactions.filter(tx => tx.vehicleId && tx.vehicleId.vehicleType === vehicleType);
        }
        // Calculate analytics data based on report type
        let analyticsData = {};
        switch (reportType) {
            case 'revenue':
                analyticsData = {
                    revenue: {
                        total: filteredTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0),
                        daily: calculateDailyRevenue(filteredTransactions, start, end),
                        byPlaza: calculateRevenueByPlaza(filteredTransactions),
                        byVehicleType: calculateRevenueByVehicleType(filteredTransactions),
                        growth: calculateGrowthRate(filteredTransactions, start, end)
                    }
                };
                break;
            case 'transactions':
                analyticsData = {
                    transactions: {
                        total: filteredTransactions.length,
                        daily: calculateDailyTransactions(filteredTransactions, start, end),
                        successRate: calculateSuccessRate(filteredTransactions),
                        averageAmount: calculateAverageAmount(filteredTransactions),
                        peakHours: calculatePeakHours(filteredTransactions)
                    }
                };
                break;
            case 'vehicles':
                analyticsData = {
                    vehicles: {
                        total: await Vehicle_1.Vehicle.countDocuments(),
                        newRegistrations: await calculateNewRegistrations(start, end),
                        byType: await calculateVehiclesByType(),
                        blacklisted: await Vehicle_1.Vehicle.countDocuments({ isBlacklisted: true }),
                        active: await Vehicle_1.Vehicle.countDocuments({ isActive: true })
                    }
                };
                break;
            case 'performance':
                analyticsData = {
                    performance: {
                        averageWaitTime: calculateAverageWaitTime(filteredTransactions),
                        plazaPerformance: calculatePlazaPerformance(filteredTransactions),
                        systemUptime: 99.9, // Mock data
                        errorRate: calculateErrorRate(filteredTransactions)
                    }
                };
                break;
            default:
                // Return all analytics
                analyticsData = {
                    revenue: {
                        total: filteredTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0),
                        daily: calculateDailyRevenue(filteredTransactions, start, end),
                        byPlaza: calculateRevenueByPlaza(filteredTransactions),
                        byVehicleType: calculateRevenueByVehicleType(filteredTransactions),
                        growth: calculateGrowthRate(filteredTransactions, start, end)
                    },
                    transactions: {
                        total: filteredTransactions.length,
                        daily: calculateDailyTransactions(filteredTransactions, start, end),
                        successRate: calculateSuccessRate(filteredTransactions),
                        averageAmount: calculateAverageAmount(filteredTransactions),
                        peakHours: calculatePeakHours(filteredTransactions)
                    },
                    vehicles: {
                        total: await Vehicle_1.Vehicle.countDocuments(),
                        newRegistrations: await calculateNewRegistrations(start, end),
                        byType: await calculateVehiclesByType(),
                        blacklisted: await Vehicle_1.Vehicle.countDocuments({ isBlacklisted: true }),
                        active: await Vehicle_1.Vehicle.countDocuments({ isActive: true })
                    },
                    performance: {
                        averageWaitTime: calculateAverageWaitTime(filteredTransactions),
                        plazaPerformance: calculatePlazaPerformance(filteredTransactions),
                        systemUptime: 99.9,
                        errorRate: calculateErrorRate(filteredTransactions)
                    }
                };
        }
        res.json({
            success: true,
            data: analyticsData
        });
    }
    catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics data'
        });
    }
});
// Helper functions for analytics calculations
function calculateDailyRevenue(transactions, start, end) {
    const dailyData = {};
    // Initialize all days in range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        dailyData[dateKey] = 0;
    }
    // Sum revenue by day
    transactions.forEach(tx => {
        const dateKey = new Date(tx.timestamp).toISOString().split('T')[0];
        if (dailyData[dateKey] !== undefined) {
            dailyData[dateKey] += tx.amount || 0;
        }
    });
    return Object.entries(dailyData).map(([date, amount]) => ({ date, amount }));
}
function calculateDailyTransactions(transactions, start, end) {
    const dailyData = {};
    // Initialize all days in range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        dailyData[dateKey] = 0;
    }
    // Count transactions by day
    transactions.forEach(tx => {
        const dateKey = new Date(tx.timestamp).toISOString().split('T')[0];
        if (dailyData[dateKey] !== undefined) {
            dailyData[dateKey]++;
        }
    });
    return Object.entries(dailyData).map(([date, count]) => ({ date, count }));
}
function calculateRevenueByPlaza(transactions) {
    const plazaData = {};
    transactions.forEach(tx => {
        const plaza = tx.tollLocation || 'Unknown';
        plazaData[plaza] = (plazaData[plaza] || 0) + (tx.amount || 0);
    });
    return Object.entries(plazaData).map(([plaza, amount]) => ({ plaza, amount }));
}
function calculateRevenueByVehicleType(transactions) {
    const typeData = {};
    transactions.forEach(tx => {
        const vehicleType = tx.vehicleId?.vehicleType || 'Unknown';
        typeData[vehicleType] = (typeData[vehicleType] || 0) + (tx.amount || 0);
    });
    return Object.entries(typeData).map(([type, amount]) => ({ type, amount }));
}
function calculateGrowthRate(transactions, start, end) {
    const midPoint = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
    const firstHalf = transactions.filter(tx => new Date(tx.timestamp) < midPoint);
    const secondHalf = transactions.filter(tx => new Date(tx.timestamp) >= midPoint);
    const firstHalfRevenue = firstHalf.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const secondHalfRevenue = secondHalf.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    if (firstHalfRevenue === 0)
        return 0;
    return ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100;
}
function calculateSuccessRate(transactions) {
    const total = transactions.length;
    const successful = transactions.filter(tx => tx.status === 'confirmed').length;
    return total > 0 ? (successful / total) * 100 : 0;
}
function calculateAverageAmount(transactions) {
    const total = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    return transactions.length > 0 ? total / transactions.length : 0;
}
function calculatePeakHours(transactions) {
    const hourData = {};
    transactions.forEach(tx => {
        const hour = new Date(tx.timestamp).getHours();
        hourData[hour] = (hourData[hour] || 0) + 1;
    });
    return Object.entries(hourData).map(([hour, count]) => ({
        hour: parseInt(hour),
        count
    })).sort((a, b) => b.count - a.count);
}
function calculateAverageWaitTime(transactions) {
    // Mock calculation - in real implementation, this would be based on actual wait times
    return 2.5; // minutes
}
function calculatePlazaPerformance(transactions) {
    const plazaData = {};
    transactions.forEach(tx => {
        const plaza = tx.tollLocation || 'Unknown';
        if (!plazaData[plaza]) {
            plazaData[plaza] = {
                plaza,
                transactions: 0,
                revenue: 0,
                waitTime: 2.5, // Mock data
                successRate: 95 // Mock data
            };
        }
        plazaData[plaza].transactions++;
        plazaData[plaza].revenue += tx.amount || 0;
    });
    return Object.values(plazaData);
}
function calculateErrorRate(transactions) {
    const total = transactions.length;
    const failed = transactions.filter(tx => tx.status === 'failed').length;
    return total > 0 ? (failed / total) * 100 : 0;
}
async function calculateNewRegistrations(start, end) {
    const registrations = await Vehicle_1.Vehicle.find({
        registrationTime: { $gte: start, $lte: end }
    });
    const dailyData = {};
    registrations.forEach(vehicle => {
        const dateKey = vehicle.registrationTime.toISOString().split('T')[0];
        dailyData[dateKey] = (dailyData[dateKey] || 0) + 1;
    });
    return Object.entries(dailyData).map(([date, count]) => ({ date, count }));
}
async function calculateVehiclesByType() {
    const typeData = await Vehicle_1.Vehicle.aggregate([
        { $group: { _id: '$vehicleType', count: { $sum: 1 } } }
    ]);
    return typeData.map(item => ({ type: item._id, count: item.count }));
}
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
// Revenue Management Endpoints
// Get contract revenue statistics
router.get('/revenue/stats', async (req, res) => {
    try {
        // This would typically call the blockchain service to get contract stats
        // For now, we'll return mock data structure
        res.json({
            success: true,
            data: {
                totalRevenue: '0',
                formattedRevenue: '0.0000',
                totalTransactions: 0,
                totalVehicles: 0,
                tollRate: '0',
                formattedTollRate: '0.0001'
            }
        });
    }
    catch (error) {
        console.error('Error getting revenue stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get revenue statistics'
        });
    }
});
// Get treasury wallet balance
router.post('/revenue/treasury-balance', async (req, res) => {
    try {
        const { treasuryWallet } = req.body;
        if (!treasuryWallet) {
            return res.status(400).json({
                success: false,
                error: 'Treasury wallet address is required'
            });
        }
        // This would typically call the blockchain service to get wallet balance
        // For now, we'll return mock data
        res.json({
            success: true,
            data: {
                balance: '0',
                formattedBalance: '0.0000',
                decimals: 18
            }
        });
    }
    catch (error) {
        console.error('Error getting treasury balance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get treasury balance'
        });
    }
});
// Record revenue withdrawal transaction
router.post('/revenue/withdrawal', async (req, res) => {
    try {
        const { treasuryWallet, amount, adminWallet, transactionHash, blockNumber, gasUsed } = req.body;
        if (!treasuryWallet || !amount || !adminWallet || !transactionHash) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        // Create withdrawal record in database
        const withdrawalRecord = new TollTransaction_1.TollTransaction({
            transactionId: `withdrawal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            vehicleId: null, // No vehicle for withdrawal
            payer: adminWallet,
            amount: parseFloat(amount),
            currency: 'ETH',
            zkProofHash: transactionHash,
            tollLocation: 'Revenue Withdrawal',
            status: 'completed',
            blockchainTxHash: transactionHash,
            gasUsed: gasUsed ? parseInt(gasUsed) : undefined,
            processedAt: new Date(),
            metadata: {
                type: 'revenue_withdrawal',
                treasuryWallet,
                adminWallet,
                blockNumber,
                processedAt: new Date()
            }
        });
        await withdrawalRecord.save();
        // Broadcast to admin dashboard
        try {
            const io = req.app.get('io');
            if (io) {
                io.emit('revenue_withdrawal_completed', {
                    treasuryWallet,
                    amount,
                    transactionHash,
                    timestamp: new Date()
                });
            }
        }
        catch (socketError) {
            console.error('Error broadcasting withdrawal:', socketError);
        }
        res.json({
            success: true,
            message: 'Revenue withdrawal recorded successfully',
            data: withdrawalRecord
        });
    }
    catch (error) {
        console.error('Error recording revenue withdrawal:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record revenue withdrawal'
        });
    }
});
// Get withdrawal history
router.get('/revenue/withdrawal-history', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        // Convert to numbers to avoid TypeScript arithmetic errors
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const withdrawals = await TollTransaction_1.TollTransaction.find({
            'metadata.type': 'revenue_withdrawal'
        })
            .sort({ processedAt: -1 })
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum);
        const total = await TollTransaction_1.TollTransaction.countDocuments({
            'metadata.type': 'revenue_withdrawal'
        });
        res.json({
            success: true,
            data: {
                withdrawals,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            }
        });
    }
    catch (error) {
        console.error('Error getting withdrawal history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get withdrawal history'
        });
    }
});
//# sourceMappingURL=adminRoutes.js.map