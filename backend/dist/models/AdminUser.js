"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUser = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const AdminUserSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['super_admin', 'plaza_operator', 'auditor', 'analyst'],
        default: 'analyst'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    tollPlaza: {
        type: String
    },
    lastLogin: {
        type: Date
    },
    passwordResetToken: {
        type: String
    },
    passwordResetExpires: {
        type: Date
    },
    permissions: {
        canManageVehicles: {
            type: Boolean,
            default: false
        },
        canProcessTolls: {
            type: Boolean,
            default: false
        },
        canViewAnalytics: {
            type: Boolean,
            default: false
        },
        canManageUsers: {
            type: Boolean,
            default: false
        },
        canHandleDisputes: {
            type: Boolean,
            default: false
        },
        canManagePlazas: {
            type: Boolean,
            default: false
        },
        canViewReports: {
            type: Boolean,
            default: false
        },
        canManageRates: {
            type: Boolean,
            default: false
        },
        canManageWallets: {
            type: Boolean,
            default: false
        },
        canViewAuditLogs: {
            type: Boolean,
            default: false
        },
        canManageSystemSettings: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true
});
// Set permissions based on role
AdminUserSchema.pre('save', function (next) {
    switch (this.role) {
        case 'super_admin':
            this.permissions = {
                canManageVehicles: true,
                canProcessTolls: true,
                canViewAnalytics: true,
                canManageUsers: true,
                canHandleDisputes: true,
                canManagePlazas: true,
                canViewReports: true,
                canManageRates: true,
                canManageWallets: true,
                canViewAuditLogs: true,
                canManageSystemSettings: true
            };
            break;
        case 'plaza_operator':
            this.permissions = {
                canManageVehicles: false,
                canProcessTolls: true,
                canViewAnalytics: false,
                canManageUsers: false,
                canHandleDisputes: false,
                canManagePlazas: false,
                canViewReports: false,
                canManageRates: false,
                canManageWallets: false,
                canViewAuditLogs: false,
                canManageSystemSettings: false
            };
            break;
        case 'auditor':
            this.permissions = {
                canManageVehicles: false,
                canProcessTolls: false,
                canViewAnalytics: true,
                canManageUsers: false,
                canHandleDisputes: true,
                canManagePlazas: false,
                canViewReports: true,
                canManageRates: false,
                canManageWallets: false,
                canViewAuditLogs: true,
                canManageSystemSettings: false
            };
            break;
        case 'analyst':
            this.permissions = {
                canManageVehicles: false,
                canProcessTolls: false,
                canViewAnalytics: true,
                canManageUsers: false,
                canHandleDisputes: false,
                canManagePlazas: false,
                canViewReports: true,
                canManageRates: false,
                canManageWallets: false,
                canViewAuditLogs: false,
                canManageSystemSettings: false
            };
            break;
    }
    next();
});
// Hash password before saving
AdminUserSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        const salt = await bcryptjs_1.default.genSalt(12);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
// Compare password method
AdminUserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
// Remove password from JSON output
AdminUserSchema.methods.toJSON = function () {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.passwordResetToken;
    delete userObject.passwordResetExpires;
    return userObject;
};
exports.AdminUser = mongoose_1.default.model('AdminUser', AdminUserSchema);
//# sourceMappingURL=AdminUser.js.map