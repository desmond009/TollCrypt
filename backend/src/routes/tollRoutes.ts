import express from 'express';
import { TollTransaction } from '../models/TollTransaction';
import { Vehicle } from '../models/Vehicle';
import { verifyAnonAadhaarProof } from '../services/blockchainService';
import { anonAadhaarService } from '../services/anonAadhaarService';
import { getSocketService } from '../services/socketInstance';

const router = express.Router();

// Anon-Aadhaar authentication endpoint
router.post('/auth/anon-aadhaar', async (req, res) => {
  try {
    const { aadhaarNumber, proof, publicInputs, userAddress } = req.body;
    
    console.log('🔗 Backend Blockchain Verification Request:', {
      aadhaarNumber,
      proof: proof ? `${proof.substring(0, 20)}...` : 'undefined',
      publicInputs,
      userAddress,
      proofLength: proof?.length,
      publicInputsLength: publicInputs?.length
    });
    
    if (!aadhaarNumber || !proof || !publicInputs || !userAddress) {
      console.log('❌ Missing required fields:', {
        hasAadhaarNumber: !!aadhaarNumber,
        hasProof: !!proof,
        hasPublicInputs: !!publicInputs,
        hasUserAddress: !!userAddress
      });
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Verify the anon-Aadhaar proof using the new service
    const verificationResult = await anonAadhaarService.verifyProof(proof, publicInputs, userAddress);
    
    if (!verificationResult.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: verificationResult.error || 'Invalid anon-Aadhaar proof' 
      });
    }

    // Generate a session token for the authenticated user
    const sessionToken = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create or update user record
    try {
      await anonAadhaarService.createOrUpdateUser(
        userAddress, 
        verificationResult.aadhaarHash, 
        sessionToken
      );
    } catch (userError) {
      console.error('Error creating/updating user:', userError);
      // Continue with authentication even if user creation fails
    }
    
    console.log('✅ Blockchain verification successful:', {
      userAddress,
      sessionToken,
      aadhaarHash: verificationResult.aadhaarHash
    });

    res.json({
      success: true,
      message: 'Anonymous Aadhaar authentication successful',
      data: {
        sessionToken,
        userAddress,
        authenticatedAt: new Date(),
        aadhaarHash: verificationResult.aadhaarHash
      }
    });

  } catch (error) {
    console.error('Anon-Aadhaar authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
});

// Vehicle registration with document verification
router.post('/vehicle/register', async (req, res) => {
  try {
    const { vehicleId, vehicleType, ownerAddress, documents, sessionToken } = req.body;
    
    if (!vehicleId || !vehicleType || !ownerAddress || !documents || !sessionToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Check if vehicle already exists
    const existingVehicle = await Vehicle.findOne({ vehicleId });
    if (existingVehicle) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vehicle already registered' 
      });
    }

    // Create new vehicle record
    const vehicle = new Vehicle({
      vehicleId,
      vehicleType,
      owner: ownerAddress,
      documents: documents.map((doc: any) => ({
        type: doc.type,
        name: doc.name,
        uploadedAt: new Date(),
        verified: false // Would be verified by admin in production
      })),
      isActive: true,
      isBlacklisted: false,
      registrationTime: new Date(),
      lastTollTime: null
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
      message: 'Vehicle registered successfully',
      data: vehicle
    });

  } catch (error) {
    console.error('Vehicle registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed' 
    });
  }
});

// Wallet top-up endpoint
router.post('/wallet/topup', async (req, res) => {
  try {
    const { userAddress, amount, paymentMethod, sessionToken } = req.body;
    
    if (!userAddress || !amount || !paymentMethod || !sessionToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Validate amount
    if (amount < 1 || amount > 10000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount must be between ₹1 and ₹10,000' 
      });
    }

    // Generate transaction ID
    const transactionId = `topup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In a real implementation, this would integrate with payment gateways
    // For now, we'll simulate a successful top-up
    const topUpTransaction = {
      transactionId,
      userAddress,
      amount,
      currency: 'INR',
      paymentMethod,
      status: 'completed',
      timestamp: new Date(),
      blockchainTxHash: null // Would be set after blockchain transaction
    };

    // Emit real-time update
    emitWalletTopUpUpdate(req.app.get('io'), topUpTransaction);

    res.json({
      success: true,
      message: 'Wallet topped up successfully',
      data: topUpTransaction
    });

  } catch (error) {
    console.error('Wallet top-up error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Top-up failed' 
    });
  }
});

// Enhanced toll payment processing
router.post('/pay', async (req, res) => {
  try {
    const { vehicleId, payer, amount, zkProof, publicInputs, tollLocation, useGasless, metadata } = req.body;
    
    // Verify ZK proof
    const isValidProof = await verifyAnonAadhaarProof(zkProof, publicInputs, payer);
    if (!isValidProof) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid ZK proof' 
      });
    }
    
    // Check if vehicle exists and is active
    const vehicle = await Vehicle.findOne({ vehicleId, isActive: true, isBlacklisted: false });
    if (!vehicle) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vehicle not found or not eligible for toll payment' 
      });
    }
    
    // Generate transaction ID
    const transactionId = `toll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create transaction record
    const transaction = new TollTransaction({
      transactionId,
      vehicleId: vehicle._id,
      payer,
      amount,
      currency: 'USDC',
      zkProofHash: zkProof,
      tollLocation: tollLocation || 'Unknown',
      useGaslessTransaction: useGasless || false,
      status: 'pending',
      metadata: {
        ...metadata,
        processedAt: new Date(),
        gaslessTransaction: useGasless
      }
    });
    
    await transaction.save();
    
    // Update vehicle's last toll time
    await Vehicle.findOneAndUpdate(
      { vehicleId },
      { lastTollTime: new Date() }
    );
    
    // Broadcast to admin dashboard
    try {
      const socketService = getSocketService();
      await socketService.broadcastNewTransaction(transaction);
    } catch (socketError) {
      console.error('Error broadcasting new transaction:', socketError);
    }
    
    res.status(201).json({
      success: true,
      message: 'Toll payment processed successfully',
      data: transaction
    });

  } catch (error) {
    console.error('Error processing toll payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process toll payment' 
    });
  }
});

// Get toll statistics for a user
router.get('/stats/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Get user's vehicles
    const vehicles = await Vehicle.find({ owner: address, isActive: true });
    const vehicleIds = vehicles.map(v => v.vehicleId);
    
    // Get transaction statistics
    const totalTransactions = await TollTransaction.countDocuments({
      payer: address,
      status: 'confirmed'
    });
    
    const totalSpent = await TollTransaction.aggregate([
      {
        $match: {
          payer: address,
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
    
    const recentTransactions = await TollTransaction.find({
      payer: address
    })
    .sort({ timestamp: -1 })
    .limit(10)
    .select('transactionId vehicleId amount status timestamp tollLocation');
    
    res.json({
      success: true,
      data: {
        totalTransactions,
        totalSpent: totalSpent[0]?.total || 0,
        totalVehicles: vehicles.length,
        recentTransactions
      }
    });

  } catch (error) {
    console.error('Error fetching toll statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch statistics' 
    });
  }
});

// Get available toll locations
router.get('/locations', async (req, res) => {
  try {
    const tollLocations = [
      {
        id: 'delhi-mumbai',
        name: 'Delhi-Mumbai Expressway',
        amount: 150,
        distance: '1,400 km',
        coordinates: { lat: 28.6139, lng: 77.2090 }
      },
      {
        id: 'bangalore-chennai',
        name: 'Bangalore-Chennai Highway',
        amount: 75,
        distance: '350 km',
        coordinates: { lat: 12.9716, lng: 77.5946 }
      },
      {
        id: 'mumbai-pune',
        name: 'Mumbai-Pune Expressway',
        amount: 50,
        distance: '150 km',
        coordinates: { lat: 19.0760, lng: 72.8777 }
      },
      {
        id: 'delhi-agra',
        name: 'Delhi-Agra Yamuna Expressway',
        amount: 25,
        distance: '200 km',
        coordinates: { lat: 28.6139, lng: 77.2090 }
      }
    ];
    
    res.json({
      success: true,
      data: tollLocations
    });

  } catch (error) {
    console.error('Error fetching toll locations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch toll locations' 
    });
  }
});

// RFID detection simulation endpoint
router.post('/rfid/detect', async (req, res) => {
  try {
    const { vehicleId, tollBoothId, timestamp } = req.body;
    
    // Simulate RFID detection
    const detection = {
      vehicleId,
      tollBoothId,
      timestamp: timestamp || new Date(),
      detected: true,
      signalStrength: Math.floor(Math.random() * 100),
      distance: Math.floor(Math.random() * 50) + 10 // 10-60 meters
    };
    
    // Emit real-time RFID detection
    emitRfidDetectionUpdate(req.app.get('io'), detection);
    
    res.json({
      success: true,
      message: 'RFID detection recorded',
      data: detection
    });

  } catch (error) {
    console.error('Error processing RFID detection:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process RFID detection' 
    });
  }
});

// Helper functions for real-time updates
function emitTollPaymentUpdate(io: any, transaction: any) {
  if (io) {
    io.emit('toll_payment_update', {
      type: 'toll_payment',
      data: transaction,
      timestamp: new Date()
    });
  }
}

function emitVehicleRegistrationUpdate(io: any, vehicle: any) {
  if (io) {
    io.emit('vehicle_registration_update', {
      type: 'vehicle_registration',
      data: vehicle,
      timestamp: new Date()
    });
  }
}

function emitWalletTopUpUpdate(io: any, topUp: any) {
  if (io) {
    io.emit('wallet_topup_update', {
      type: 'wallet_topup',
      data: topUp,
      timestamp: new Date()
    });
  }
}

function emitRfidDetectionUpdate(io: any, detection: any) {
  if (io) {
    io.emit('rfid_detection_update', {
      type: 'rfid_detection',
      data: detection,
      timestamp: new Date()
    });
  }
}

export { router as tollRoutes };