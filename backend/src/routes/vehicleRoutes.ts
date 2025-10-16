import express from 'express';
import { Vehicle } from '../models/Vehicle';
import { verifyAnonAadhaarProof } from '../services/blockchainService';
import { getSocketService } from '../services/socketInstance';

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
    const { vehicleId, vehicleType, owner, documents, metadata } = req.body;
    
    // Check if vehicle already exists
    const existingVehicle = await Vehicle.findOne({ vehicleId });
    if (existingVehicle) {
      return res.status(400).json({ error: 'Vehicle already registered' });
    }
    
    // Create new vehicle
    const vehicle = new Vehicle({
      vehicleId,
      vehicleType,
      owner,
      documents: documents || [],
      metadata: metadata || {},
      isActive: true,
      isBlacklisted: false,
      registrationTime: new Date()
    });
    
    await vehicle.save();
    
    // Broadcast to admin dashboard
    try {
      const socketService = getSocketService();
      await socketService.broadcastVehicleRegistration(vehicle);
    } catch (socketError) {
      console.error('Error broadcasting vehicle registration:', socketError);
    }
    
    res.status(201).json({
      success: true,
      data: vehicle,
      message: 'Vehicle registered successfully'
    });
  } catch (error) {
    console.error('Error registering vehicle:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to register vehicle' 
    });
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
      success: true,
      data: {
        totalVehicles,
        activeVehicles,
        blacklistedVehicles
      }
    });
  } catch (error) {
    console.error('Error fetching vehicle stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch vehicle statistics' 
    });
  }
});

// Sync session data with backend
router.post('/sync', async (req, res) => {
  try {
    const { userAddress, vehicles } = req.body;
    
    if (!userAddress || !vehicles || !Array.isArray(vehicles)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid request data' 
      });
    }

    const syncedVehicles = [];
    
    for (const vehicle of vehicles) {
      try {
        // Check if vehicle exists
        const existingVehicle = await Vehicle.findOne({ vehicleId: vehicle.vehicleId });
        
        if (existingVehicle) {
          // Update existing vehicle
          const updatedVehicle = await Vehicle.findOneAndUpdate(
            { vehicleId: vehicle.vehicleId },
            {
              vehicleType: vehicle.vehicleType,
              isActive: vehicle.isActive,
              lastActivity: new Date()
            },
            { new: true }
          );
          syncedVehicles.push(updatedVehicle);
        } else {
          // Create new vehicle
          const newVehicle = new Vehicle({
            vehicleId: vehicle.vehicleId,
            vehicleType: vehicle.vehicleType,
            owner: userAddress,
            documents: vehicle.documents ? vehicle.documents.map((doc: string) => ({
              type: 'rc',
              name: doc,
              uploadedAt: new Date(),
              verified: false
            })) : [],
            isActive: vehicle.isActive || true,
            isBlacklisted: false,
            registrationTime: new Date(vehicle.registrationDate || Date.now())
          });
          
          await newVehicle.save();
          syncedVehicles.push(newVehicle);
        }
      } catch (vehicleError) {
        console.error(`Error syncing vehicle ${vehicle.vehicleId}:`, vehicleError);
      }
    }
    
    res.json({
      success: true,
      data: syncedVehicles,
      message: `Synced ${syncedVehicles.length} vehicles`
    });
  } catch (error) {
    console.error('Error syncing vehicles:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to sync vehicles' 
    });
  }
});

export { router as vehicleRoutes };
