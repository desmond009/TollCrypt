import express from 'express';
import { TollTransaction } from '../models/TollTransaction';
import { Vehicle } from '../models/Vehicle';
import { verifyAnonAadhaarProof } from '../services/blockchainService';
import { emitTollPaymentUpdate } from '../services/socketService';

const router = express.Router();

// Get toll transactions for a user
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    
    const query: any = { payer: address };
    if (status) query.status = status;
    
    const transactions = await TollTransaction.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await TollTransaction.countDocuments(query);
    
    res.json({
      transactions,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    console.error('Error fetching toll transactions:', error);
    res.status(500).json({ error: 'Failed to fetch toll transactions' });
  }
});

// Get toll transactions for a vehicle
router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const transactions = await TollTransaction.find({ vehicleId })
      .sort({ timestamp: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await TollTransaction.countDocuments({ vehicleId });
    
    res.json({
      transactions,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    console.error('Error fetching vehicle toll transactions:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle toll transactions' });
  }
});

// Process toll payment
router.post('/pay', async (req, res) => {
  try {
    const { vehicleId, payer, amount, zkProof, publicInputs, metadata } = req.body;
    
    // Verify ZK proof
    const isValidProof = await verifyAnonAadhaarProof(zkProof, publicInputs, payer);
    if (!isValidProof) {
      return res.status(400).json({ error: 'Invalid ZK proof' });
    }
    
    // Check if vehicle exists and is active
    const vehicle = await Vehicle.findOne({ vehicleId, isActive: true, isBlacklisted: false });
    if (!vehicle) {
      return res.status(400).json({ error: 'Vehicle not found or not eligible for toll payment' });
    }
    
    // Generate transaction ID
    const transactionId = `toll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create transaction record
    const transaction = new TollTransaction({
      transactionId,
      vehicleId,
      payer,
      amount,
      currency: 'USDC',
      zkProofHash: zkProof, // In production, this would be a hash of the proof
      status: 'pending',
      metadata
    });
    
    await transaction.save();
    
    // Emit real-time update
    emitTollPaymentUpdate(req.app.get('io'), transaction);
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error processing toll payment:', error);
    res.status(500).json({ error: 'Failed to process toll payment' });
  }
});

// Get toll statistics
router.get('/stats/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    const totalTransactions = await TollTransaction.countDocuments({
      payer: address,
      timestamp: { $gte: startDate }
    });
    
    const totalAmount = await TollTransaction.aggregate([
      {
        $match: {
          payer: address,
          timestamp: { $gte: startDate },
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
    
    const statusBreakdown = await TollTransaction.aggregate([
      {
        $match: {
          payer: address,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      totalTransactions,
      totalAmount: totalAmount[0]?.total || 0,
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching toll statistics:', error);
    res.status(500).json({ error: 'Failed to fetch toll statistics' });
  }
});

// Update transaction status (admin only)
router.put('/:transactionId/status', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'failed', 'disputed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const transaction = await TollTransaction.findOneAndUpdate(
      { transactionId },
      { status },
      { new: true }
    );
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Emit real-time update
    emitTollPaymentUpdate(req.app.get('io'), transaction);
    
    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ error: 'Failed to update transaction status' });
  }
});

export { router as tollRoutes };
