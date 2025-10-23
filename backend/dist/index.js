"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const mongoose_1 = __importDefault(require("mongoose"));
const blockchainService_1 = require("./services/blockchainService");
const socketService_1 = __importDefault(require("./services/socketService"));
const socketInstance_1 = require("./services/socketInstance");
const vehicleRoutes_1 = require("./routes/vehicleRoutes");
const tollRoutes_1 = require("./routes/tollRoutes");
const adminRoutes_1 = require("./routes/adminRoutes");
const adminManagementRoutes_1 = require("./routes/adminManagementRoutes");
const hardwareRoutes_1 = require("./routes/hardwareRoutes");
const qrRoutes_1 = __importDefault(require("./routes/qrRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const topUpWalletRoutes_1 = __importDefault(require("./routes/topUpWalletRoutes"));
const aadhaarRoutes_1 = __importDefault(require("./routes/aadhaarRoutes"));
const plazaRoutes_1 = __importDefault(require("./routes/plazaRoutes"));
const simplePlazaRoutes_1 = __importDefault(require("./routes/simplePlazaRoutes"));
// Import models for dashboard stats
const { TollTransaction } = require('./models/TollTransaction');
const { Vehicle } = require('./models/Vehicle');
const { TollPlaza } = require('./models/TollPlaza');
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Initialize Socket.IO service
const socketService = new socketService_1.default(server);
(0, socketInstance_1.setSocketService)(socketService);
const PORT = process.env.PORT || 3001 || 3003 || 3004;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tollchain';
// Middleware - Temporarily disable helmet to test CORS
// app.use(helmet({
//   crossOriginEmbedderPolicy: false
// }));
// CORS configuration
const corsOptions = {
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
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Session-Token",
        "X-User-Address"
    ]
};
// Apply CORS
app.use((0, cors_1.default)(corsOptions));
// Manual CORS headers as backup
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3003",
        process.env.FRONTEND_URL || "http://localhost:3000",
        process.env.ADMIN_DASHBOARD_URL || "http://localhost:3003"
    ];
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,X-Session-Token,X-User-Address');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    }
    else {
        next();
    }
});
// Handle preflight requests
app.options('*', (0, cors_1.default)(corsOptions));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/vehicles', vehicleRoutes_1.vehicleRoutes);
app.use('/api/tolls', tollRoutes_1.tollRoutes);
app.use('/api/admin', adminRoutes_1.adminRoutes);
app.use('/api/admin-management', adminManagementRoutes_1.adminManagementRoutes);
app.use('/api/hardware', hardwareRoutes_1.hardwareRoutes);
app.use('/api/qr', qrRoutes_1.default);
app.use('/api/topup-wallet', topUpWalletRoutes_1.default);
app.use('/api/aadhaar', aadhaarRoutes_1.default);
app.use('/api/plazas', plazaRoutes_1.default);
app.use('/api/simple-plazas', simplePlazaRoutes_1.default);
// Analytics route - direct endpoint for frontend compatibility
app.get('/api/analytics', async (req, res) => {
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
        const transactions = await TollTransaction.find(baseQuery)
            .populate('vehicleId', 'vehicleId vehicleType')
            .lean();
        // Filter by vehicle type if specified
        let filteredTransactions = transactions;
        if (vehicleType) {
            filteredTransactions = transactions.filter((tx) => tx.vehicleId && tx.vehicleId.vehicleType === vehicleType);
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
                        total: await Vehicle.countDocuments(),
                        newRegistrations: await calculateNewRegistrations(start, end),
                        byType: await calculateVehiclesByType(),
                        blacklisted: await Vehicle.countDocuments({ isBlacklisted: true }),
                        active: await Vehicle.countDocuments({ isActive: true })
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
                        total: await Vehicle.countDocuments(),
                        newRegistrations: await calculateNewRegistrations(start, end),
                        byType: await calculateVehiclesByType(),
                        blacklisted: await Vehicle.countDocuments({ isBlacklisted: true }),
                        active: await Vehicle.countDocuments({ isActive: true })
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
    const registrations = await Vehicle.find({
        registrationTime: { $gte: start, $lte: end }
    });
    const dailyData = {};
    registrations.forEach((vehicle) => {
        const dateKey = vehicle.registrationTime.toISOString().split('T')[0];
        dailyData[dateKey] = (dailyData[dateKey] || 0) + 1;
    });
    return Object.entries(dailyData).map(([date, count]) => ({ date, count }));
}
async function calculateVehiclesByType() {
    const typeData = await Vehicle.aggregate([
        { $group: { _id: '$vehicleType', count: { $sum: 1 } } }
    ]);
    return typeData.map((item) => ({ type: item._id, count: item.count }));
}
// Dashboard routes - specific endpoints for frontend compatibility
app.get('/api/dashboard/stats', async (req, res) => {
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
    }
    catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard stats'
        });
    }
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Initialize services
async function startServer() {
    try {
        // Connect to MongoDB
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        // Connect to blockchain
        try {
            await (0, blockchainService_1.connectToBlockchain)();
            console.log('Connected to blockchain');
        }
        catch (error) {
            if (process.env.MOCK_BLOCKCHAIN === 'true') {
                console.log('⚠️  Running in mock mode - blockchain features disabled');
            }
            else {
                throw error;
            }
        }
        console.log('Socket.IO service initialized');
        // Start server
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    (0, blockchainService_1.cleanupBlockchainConnection)();
    server.close(() => {
        mongoose_1.default.connection.close();
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    (0, blockchainService_1.cleanupBlockchainConnection)();
    server.close(() => {
        mongoose_1.default.connection.close();
        process.exit(0);
    });
});
startServer();
//# sourceMappingURL=index.js.map