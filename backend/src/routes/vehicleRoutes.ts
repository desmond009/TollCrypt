import express from 'express';
import { Vehicle } from '../models/Vehicle';
import { verifyAnonAadhaarProof } from '../services/blockchainService';

const router = express.Router();

// Get all vehicles for a user
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const vehicles = await Vehicle.find({ owner: address, isActive: true });
    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching user vehicles:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// Get vehicle by ID
router.get('/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const vehicle = await Vehicle.findOne({ vehicleId });
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    res.json(vehicle);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
});

// Register a new vehicle
router.post('/register', async (req, res) => {
  try {
    const { vehicleId, owner, zkProof, publicInputs } = req.body;
    
    // Verify ZK proof
    const isValidProof = await verifyAnonAadhaarProof(zkProof, publicInputs, owner);
    if (!isValidProof) {
      return res.status(400).json({ error: 'Invalid ZK proof' });
    }
    
    // Check if vehicle already exists
    const existingVehicle = await Vehicle.findOne({ vehicleId });
    if (existingVehicle) {
      return res.status(400).json({ error: 'Vehicle already registered' });
    }
    
    // Create new vehicle
    const vehicle = new Vehicle({
      vehicleId,
      owner,
      isActive: true,
      isBlacklisted: false,
      registrationTime: new Date()
    });
    
    await vehicle.save();
    
    res.status(201).json(vehicle);
  } catch (error) {
    console.error('Error registering vehicle:', error);
    res.status(500).json({ error: 'Failed to register vehicle' });
  }
});

// Update vehicle information
router.put('/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { newOwner, metadata } = req.body;
    
    const updateData: any = {};
    if (newOwner) updateData.owner = newOwner;
    if (metadata) updateData.metadata = metadata;
    
    const vehicle = await Vehicle.findOneAndUpdate(
      { vehicleId },
      updateData,
      { new: true }
    );
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    res.json(vehicle);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// Deactivate vehicle
router.delete('/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    
    const vehicle = await Vehicle.findOneAndUpdate(
      { vehicleId },
      { isActive: false },
      { new: true }
    );
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    res.json({ message: 'Vehicle deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating vehicle:', error);
    res.status(500).json({ error: 'Failed to deactivate vehicle' });
  }
});

// Get vehicle statistics
router.get('/stats/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const totalVehicles = await Vehicle.countDocuments({ owner: address });
    const activeVehicles = await Vehicle.countDocuments({ owner: address, isActive: true });
    const blacklistedVehicles = await Vehicle.countDocuments({ owner: address, isBlacklisted: true });
    
    res.json({
      totalVehicles,
      activeVehicles,
      blacklistedVehicles
    });
  } catch (error) {
    console.error('Error fetching vehicle stats:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle statistics' });
  }
});

export { router as vehicleRoutes };
