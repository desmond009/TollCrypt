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
const hardwareRoutes_1 = require("./routes/hardwareRoutes");
const qrRoutes_1 = __importDefault(require("./routes/qrRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const topUpWalletRoutes_1 = __importDefault(require("./routes/topUpWalletRoutes"));
const aadhaarRoutes_1 = __importDefault(require("./routes/aadhaarRoutes"));
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
        process.env.FRONTEND_URL || "http://localhost:3000"
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
        "http://127.0.0.1:3002"
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
app.use('/api/hardware', hardwareRoutes_1.hardwareRoutes);
app.use('/api/qr', qrRoutes_1.default);
app.use('/api/topup-wallet', topUpWalletRoutes_1.default);
app.use('/api/aadhaar', aadhaarRoutes_1.default);
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