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
        if (!['super_admin', 'plaza_operator', 'auditor', 'analyst'].includes(decoded.role)) {
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
    // Handle case-insensitive header access
    const sessionToken = req.headers['x-session-token'] || req.headers['X-Session-Token'];
    // Extract user address from request body or headers (case-insensitive)
    const userAddress = req.body.userAddress ||
        req.headers['x-user-address'] ||
        req.headers['X-User-Address'];
    // Debug logging
    console.log('🔐 authenticateSession middleware:', {
        url: req.url,
        method: req.method,
        sessionToken: sessionToken ? `${sessionToken.substring(0, 10)}...` : 'none',
        userAddress: userAddress ? `${userAddress.substring(0, 10)}...` : 'none',
        headers: {
            'x-session-token': !!req.headers['x-session-token'],
            'X-Session-Token': !!req.headers['X-Session-Token'],
            'x-user-address': !!req.headers['x-user-address'],
            'X-User-Address': !!req.headers['X-User-Address']
        }
    });
    // In development mode, be more lenient with authentication
    if (process.env.NODE_ENV === 'development') {
        // If no session token but we have user address, generate one
        if (!sessionToken && userAddress) {
            req.user = {
                userId: userAddress,
                email: '',
                role: 'user',
                address: userAddress
            };
            return next();
        }
        // If session token doesn't start with 'anon_' but we have user address, accept it
        if (sessionToken && userAddress) {
            req.user = {
                userId: userAddress,
                email: '',
                role: 'user',
                address: userAddress
            };
            return next();
        }
    }
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