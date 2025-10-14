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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vehicle = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const VehicleDocumentSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['rc', 'insurance', 'pollution'],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    verified: {
        type: Boolean,
        default: false
    },
    verifiedAt: {
        type: Date
    },
    verifiedBy: {
        type: String
    }
});
const VehicleSchema = new mongoose_1.Schema({
    vehicleId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    vehicleType: {
        type: String,
        required: true,
        enum: ['car', 'truck', 'bus', 'motorcycle', 'commercial']
    },
    owner: {
        type: String,
        required: true,
        index: true
    },
    documents: [VehicleDocumentSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    isBlacklisted: {
        type: Boolean,
        default: false
    },
    registrationTime: {
        type: Date,
        default: Date.now
    },
    lastTollTime: {
        type: Date
    },
    fastagWalletAddress: {
        type: String,
        index: true
    },
    metadata: {
        make: String,
        model: String,
        year: Number,
        color: String,
        engineNumber: String,
        chassisNumber: String
    }
}, {
    timestamps: true
});
// Indexes for better query performance
VehicleSchema.index({ vehicleId: 1, owner: 1 });
VehicleSchema.index({ isActive: 1, isBlacklisted: 1 });
VehicleSchema.index({ vehicleType: 1 });
VehicleSchema.index({ fastagWalletAddress: 1 });
exports.Vehicle = mongoose_1.default.model('Vehicle', VehicleSchema);
//# sourceMappingURL=Vehicle.js.map