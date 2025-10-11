"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehicleRoutes = void 0;
const express_1 = __importDefault(require("express"));
const Vehicle_1 = require("../models/Vehicle");
const blockchainService_1 = require("../services/blockchainService");
const router = express_1.default.Router();
exports.vehicleRoutes = router;
// Get all vehicles for a user
router.get('/user/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const vehicles = await Vehicle_1.Vehicle.find({ owner: address, isActive: true });
        res.json(vehicles);
    }
    catch (error) {
        console.error('Error fetching user vehicles:', error);
        res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
});
// Get vehicle by ID
router.get('/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const vehicle = await Vehicle_1.Vehicle.findOne({ vehicleId });
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.json(vehicle);
    }
    catch (error) {
        console.error('Error fetching vehicle:', error);
        res.status(500).json({ error: 'Failed to fetch vehicle' });
    }
});
// Register a new vehicle
router.post('/register', async (req, res) => {
    try {
        const { vehicleId, owner, zkProof, publicInputs } = req.body;
        // Verify ZK proof
        const isValidProof = await (0, blockchainService_1.verifyAnonAadhaarProof)(zkProof, publicInputs, owner);
        if (!isValidProof) {
            return res.status(400).json({ error: 'Invalid ZK proof' });
        }
        // Check if vehicle already exists
        const existingVehicle = await Vehicle_1.Vehicle.findOne({ vehicleId });
        if (existingVehicle) {
            return res.status(400).json({ error: 'Vehicle already registered' });
        }
        // Create new vehicle
        const vehicle = new Vehicle_1.Vehicle({
            vehicleId,
            owner,
            isActive: true,
            isBlacklisted: false,
            registrationTime: new Date()
        });
        await vehicle.save();
        res.status(201).json(vehicle);
    }
    catch (error) {
        console.error('Error registering vehicle:', error);
        res.status(500).json({ error: 'Failed to register vehicle' });
    }
});
// Update vehicle information
router.put('/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { newOwner, metadata } = req.body;
        const updateData = {};
        if (newOwner)
            updateData.owner = newOwner;
        if (metadata)
            updateData.metadata = metadata;
        const vehicle = await Vehicle_1.Vehicle.findOneAndUpdate({ vehicleId }, updateData, { new: true });
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.json(vehicle);
    }
    catch (error) {
        console.error('Error updating vehicle:', error);
        res.status(500).json({ error: 'Failed to update vehicle' });
    }
});
// Deactivate vehicle
router.delete('/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const vehicle = await Vehicle_1.Vehicle.findOneAndUpdate({ vehicleId }, { isActive: false }, { new: true });
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.json({ message: 'Vehicle deactivated successfully' });
    }
    catch (error) {
        console.error('Error deactivating vehicle:', error);
        res.status(500).json({ error: 'Failed to deactivate vehicle' });
    }
});
// Get vehicle statistics
router.get('/stats/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const totalVehicles = await Vehicle_1.Vehicle.countDocuments({ owner: address });
        const activeVehicles = await Vehicle_1.Vehicle.countDocuments({ owner: address, isActive: true });
        const blacklistedVehicles = await Vehicle_1.Vehicle.countDocuments({ owner: address, isBlacklisted: true });
        res.json({
            totalVehicles,
            activeVehicles,
            blacklistedVehicles
        });
    }
    catch (error) {
        console.error('Error fetching vehicle stats:', error);
        res.status(500).json({ error: 'Failed to fetch vehicle statistics' });
    }
});
//# sourceMappingURL=vehicleRoutes.js.map