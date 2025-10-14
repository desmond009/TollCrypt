"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateSession = exports.authenticateAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        // Check if user has admin role
        if (!['super_admin', 'admin', 'operator'].includes(decoded.role)) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};
exports.authenticateAdmin = authenticateAdmin;
// Session-based authentication for user operations
const authenticateSession = (req, res, next) => {
    const sessionToken = req.headers['x-session-token'];
    if (!sessionToken) {
        return res.status(401).json({
            success: false,
            message: 'Session token required'
        });
    }
    // For now, we'll accept any session token that starts with 'anon_'
    // In a real implementation, you'd validate against a session store
    if (!sessionToken.startsWith('anon_')) {
        return res.status(401).json({
            success: false,
            message: 'Invalid session token'
        });
    }
    // Extract user address from request body or headers
    const userAddress = req.body.userAddress || req.headers['x-user-address'];
    if (!userAddress) {
        return res.status(400).json({
            success: false,
            message: 'User address required'
        });
    }
    // Set user info for the request
    req.user = {
        userId: userAddress,
        email: '',
        role: 'user',
        address: userAddress
    };
    next();
};
exports.authenticateSession = authenticateSession;
//# sourceMappingURL=auth.js.map