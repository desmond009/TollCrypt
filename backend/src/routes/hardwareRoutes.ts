import express from 'express';
import { Vehicle } from '../models/Vehicle';
import { emitSystemAlert } from '../services/socketService';

const router = express.Router();

// Handle RFID/QR code scan
router.post('/scan', async (req, res) => {
  try {
    const { vehicleId, location, tollBoothId } = req.body;
    
    if (!vehicleId) {
      return res.status(400).json({ error: 'Vehicle ID is required' });
    }
    
    // Check if vehicle is registered and active
    const vehicle = await Vehicle.findOne({ 
      vehicleId, 
      isActive: true, 
      isBlacklisted: false 
    });
    
    if (!vehicle) {
      // Emit alert for unregistered vehicle
      emitSystemAlert(req.app.get('io'), {
        type: 'unregistered_vehicle',
        message: `Unregistered vehicle detected: ${vehicleId}`,
        severity: 'warning'
      });
      
      return res.status(404).json({ 
        error: 'Vehicle not registered or not eligible',
        vehicleId,
        registered: false
      });
    }
    
    // Emit real-time event for vehicle detection
    req.app.get('io').to('admins').emit('vehicle_detected', {
      vehicleId,
      owner: vehicle.owner,
      location,
      tollBoothId,
      timestamp: new Date()
    });
    
    // Notify vehicle owner
    req.app.get('io').to(`user_${vehicle.owner}`).emit('toll_triggered', {
      vehicleId,
      location,
      tollBoothId,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      vehicleId,
      owner: vehicle.owner,
      registered: true,
      message: 'Vehicle detected successfully'
    });
    
  } catch (error) {
    console.error('Error processing vehicle scan:', error);
    res.status(500).json({ error: 'Failed to process vehicle scan' });
  }
});

// Handle toll booth status updates
router.post('/toll-booth/status', async (req, res) => {
  try {
    const { tollBoothId, status, location, metadata } = req.body;
    
    // Emit toll booth status update
    req.app.get('io').to('admins').emit('toll_booth_status', {
      tollBoothId,
      status,
      location,
      metadata,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      message: 'Toll booth status updated'
    });
    
  } catch (error) {
    console.error('Error updating toll booth status:', error);
    res.status(500).json({ error: 'Failed to update toll booth status' });
  }
});

// Handle hardware alerts
router.post('/alert', async (req, res) => {
  try {
    const { type, message, severity, tollBoothId, metadata } = req.body;
    
    // Emit system alert
    emitSystemAlert(req.app.get('io'), {
      type,
      message: `${tollBoothId ? `[${tollBoothId}] ` : ''}${message}`,
      severity: severity || 'info'
    });
    
    res.json({
      success: true,
      message: 'Alert processed'
    });
    
  } catch (error) {
    console.error('Error processing hardware alert:', error);
    res.status(500).json({ error: 'Failed to process hardware alert' });
  }
});

// Get hardware status
router.get('/status', async (req, res) => {
  try {
    // This would typically connect to actual hardware systems
    // For now, we'll return mock data
    const hardwareStatus = {
      tollBooths: [
        {
          id: 'TB001',
          status: 'active',
          location: { lat: 12.9716, lng: 77.5946 },
          lastScan: new Date(Date.now() - 300000), // 5 minutes ago
          totalScans: 1250
        },
        {
          id: 'TB002',
          status: 'maintenance',
          location: { lat: 12.9352, lng: 77.6245 },
          lastScan: new Date(Date.now() - 1800000), // 30 minutes ago
          totalScans: 980
        }
      ],
      systemHealth: {
        database: 'healthy',
        blockchain: 'connected',
        hardware: 'operational'
      },
      lastUpdate: new Date()
    };
    
    res.json(hardwareStatus);
    
  } catch (error) {
    console.error('Error fetching hardware status:', error);
    res.status(500).json({ error: 'Failed to fetch hardware status' });
  }
});

export { router as hardwareRoutes };
