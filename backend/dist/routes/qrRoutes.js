"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Vehicle_1 = require("../models/Vehicle");
const TollTransaction_1 = require("../models/TollTransaction");
const AdminUser_1 = require("../models/AdminUser");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// QR Code verification endpoint
router.post('/qr/verify', async (req, res) => {
    try {
        const { qrData, sessionToken } = req.body;
        if (!qrData || !sessionToken) {
            return res.status(400).json({
                success: false,
                message: 'QR data and session token are required'
            });
        }
        // Validate QR code data structure
        const { walletAddress, vehicleId, vehicleType, timestamp, tollRate } = qrData;
        if (!walletAddress || !vehicleId || !vehicleType || !timestamp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid QR code data structure'
            });
        }
        // Check if QR code is not too old (5 minutes)
        const now = Date.now();
        const qrAge = now - timestamp;
        const maxAge = 5 * 60 * 1000; // 5 minutes
        if (qrAge > maxAge) {
            return res.status(400).json({
                success: false,
                message: 'QR code has expired. Please generate a new one.'
            });
        }
        // Verify vehicle exists and is active
        const vehicle = await Vehicle_1.Vehicle.findOne({
            vehicleId,
            owner: walletAddress,
            isActive: true
        });
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found or not active'
            });
        }
        // Check if vehicle is blacklisted
        if (vehicle.isBlacklisted) {
            return res.status(403).json({
                success: false,
                message: 'Vehicle is blacklisted'
            });
        }
        // Verify session token (basic validation)
        if (!sessionToken || !sessionToken.startsWith('session_')) {
            return res.status(401).json({
                success: false,
                message: 'Invalid session token'
            });
        }
        res.status(200).json({
            success: true,
            message: 'QR code verified successfully',
            data: {
                vehicleId: vehicle.vehicleId,
                vehicleType: vehicle.vehicleType,
                owner: vehicle.owner,
                tollRate: tollRate || 0.001, // Default toll rate
                isValid: true
            }
        });
    }
    catch (error) {
        console.error('QR verification error:', error);
        res.status(500).json({
            success: false,
            message: 'QR verification failed'
        });
    }
});
// Process toll payment via QR code
router.post('/qr/payment', async (req, res) => {
    try {
        const { qrData, transactionHash, adminId } = req.body;
        if (!qrData || !transactionHash || !adminId) {
            return res.status(400).json({
                success: false,
                message: 'QR data, transaction hash, and admin ID are required'
            });
        }
        // Verify admin exists
        const admin = await AdminUser_1.AdminUser.findById(adminId);
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized admin'
            });
        }
        const { walletAddress, vehicleId, vehicleType, timestamp, tollRate } = qrData;
        // Verify vehicle exists
        const vehicle = await Vehicle_1.Vehicle.findOne({
            vehicleId,
            owner: walletAddress,
            isActive: true
        });
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found'
            });
        }
        // Check if transaction already exists
        const existingTransaction = await TollTransaction_1.TollTransaction.findOne({
            transactionHash
        });
        if (existingTransaction) {
            return res.status(400).json({
                success: false,
                message: 'Transaction already processed'
            });
        }
        // Create toll transaction record
        const tollTransaction = new TollTransaction_1.TollTransaction({
            vehicleId: vehicle._id,
            vehicleType: vehicle.vehicleType,
            owner: walletAddress,
            amount: tollRate || 0.001,
            transactionHash,
            paymentMethod: 'qr_code',
            status: 'completed',
            processedBy: adminId,
            processedAt: new Date(),
            qrData: {
                timestamp,
                sessionToken: qrData.sessionToken
            },
            metadata: {
                tollPlaza: admin.tollPlaza || 'Unknown',
                adminName: admin.name
            }
        });
        await tollTransaction.save();
        // Update vehicle last toll time
        vehicle.lastTollTime = new Date();
        await vehicle.save();
        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('toll_payment_completed', {
                vehicleId: vehicle.vehicleId,
                amount: tollRate || 0.001,
                transactionHash,
                timestamp: new Date()
            });
        }
        res.status(201).json({
            success: true,
            message: 'Toll payment processed successfully',
            data: {
                transactionId: tollTransaction._id,
                vehicleId: vehicle.vehicleId,
                amount: tollRate || 0.001,
                transactionHash,
                timestamp: tollTransaction.processedAt
            }
        });
    }
    catch (error) {
        console.error('Toll payment processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment processing failed'
        });
    }
});
// Get QR payment statistics
router.get('/qr/stats', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = { paymentMethod: 'qr_code' };
        if (startDate && endDate) {
            query.processedAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        const stats = await TollTransaction_1.TollTransaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalTransactions: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    averageAmount: { $avg: '$amount' }
                }
            }
        ]);
        const vehicleStats = await TollTransaction_1.TollTransaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$vehicleType',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { count: -1 } }
        ]);
        res.status(200).json({
            success: true,
            data: {
                overall: stats[0] || { totalTransactions: 0, totalAmount: 0, averageAmount: 0 },
                byVehicleType: vehicleStats
            }
        });
    }
    catch (error) {
        console.error('QR stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch QR payment statistics'
        });
    }
});
// Get recent QR payments
router.get('/qr/recent', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const recentPayments = await TollTransaction_1.TollTransaction.find({
            paymentMethod: 'qr_code'
        })
            .sort({ processedAt: -1 })
            .limit(limit)
            .populate('processedBy', 'name email')
            .select('vehicleId vehicleType owner amount transactionHash processedAt status');
        res.status(200).json({
            success: true,
            data: recentPayments
        });
    }
    catch (error) {
        console.error('Recent QR payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent QR payments'
        });
    }
});
// Validate QR code for admin scanning
router.post('/qr/validate', async (req, res) => {
    try {
        const { qrData } = req.body;
        if (!qrData) {
            return res.status(400).json({
                success: false,
                message: 'QR data is required'
            });
        }
        const { walletAddress, vehicleId, timestamp } = qrData;
        // Check QR code age
        const now = Date.now();
        const qrAge = now - timestamp;
        const maxAge = 5 * 60 * 1000; // 5 minutes
        if (qrAge > maxAge) {
            return res.status(400).json({
                success: false,
                message: 'QR code has expired'
            });
        }
        // Verify vehicle
        const vehicle = await Vehicle_1.Vehicle.findOne({
            vehicleId,
            owner: walletAddress,
            isActive: true
        });
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found or inactive'
            });
        }
        if (vehicle.isBlacklisted) {
            return res.status(403).json({
                success: false,
                message: 'Vehicle is blacklisted'
            });
        }
        res.status(200).json({
            success: true,
            message: 'QR code is valid',
            data: {
                vehicleId: vehicle.vehicleId,
                vehicleType: vehicle.vehicleType,
                owner: vehicle.owner,
                isValid: true,
                tollRate: qrData.tollRate || 0.001
            }
        });
    }
    catch (error) {
        console.error('QR validation error:', error);
        res.status(500).json({
            success: false,
            message: 'QR validation failed'
        });
    }
});
exports.default = router;
//# sourceMappingURL=qrRoutes.js.map