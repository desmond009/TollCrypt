import express from 'express';
import { TollTransaction } from '../models/TollTransaction';
import { Vehicle } from '../models/Vehicle';
import { AdminUser } from '../models/AdminUser';
import { getContractBalance } from '../services/blockchainService';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Get transaction statistics
    const todayTransactions = await TollTransaction.countDocuments({
      timestamp: { $gte: today },
      status: 'confirmed'
    });
    
    const thisMonthTransactions = await TollTransaction.countDocuments({
      timestamp: { $gte: thisMonth },
      status: 'confirmed'
    });
    
    const lastMonthTransactions = await TollTransaction.countDocuments({
      timestamp: { $gte: lastMonth, $lt: thisMonth },
      status: 'confirmed'
    });
    
    // Get revenue statistics
    const todayRevenue = await TollTransaction.aggregate([
      {
        $match: {
          timestamp: { $gte: today },
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
    
    const thisMonthRevenue = await TollTransaction.aggregate([
      {
        $match: {
          timestamp: { $gte: thisMonth },
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
    
    // Get vehicle statistics
    const totalVehicles = await Vehicle.countDocuments({ isActive: true });
    const blacklistedVehicles = await Vehicle.countDocuments({ isBlacklisted: true });
    const newVehiclesToday = await Vehicle.countDocuments({
      registrationTime: { $gte: today }
    });
    
    // Get recent transactions
    const recentTransactions = await TollTransaction.find({ status: 'confirmed' })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('vehicleId', 'vehicleId owner');
    
    // Get contract balance
    const contractBalance = await getContractBalance();
    
    res.json({
      transactions: {
        today: todayTransactions,
        thisMonth: thisMonthTransactions,
        lastMonth: lastMonthTransactions,
        growth: thisMonthTransactions - lastMonthTransactions
      },
      revenue: {
        today: todayRevenue[0]?.total || 0,
        thisMonth: thisMonthRevenue[0]?.total || 0
      },
      vehicles: {
        total: totalVehicles,
        blacklisted: blacklistedVehicles,
        newToday: newVehiclesToday
      },
      contractBalance,
      recentTransactions
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get all vehicles (admin view)
router.get('/vehicles', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    
    let query: any = {};
    
    if (search) {
      query.$or = [
        { vehicleId: { $regex: search, $options: 'i' } },
        { owner: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status === 'active') {
      query.isActive = true;
      query.isBlacklisted = false;
    } else if (status === 'blacklisted') {
      query.isBlacklisted = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    const vehicles = await Vehicle.find(query)
      .sort({ registrationTime: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await Vehicle.countDocuments(query);
    
    res.json({
      vehicles,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// Get all transactions (admin view)
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, vehicleId, payer } = req.query;
    
    let query: any = {};
    
    if (status) query.status = status;
    if (vehicleId) query.vehicleId = vehicleId;
    if (payer) query.payer = { $regex: payer, $options: 'i' };
    
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
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Blacklist/whitelist vehicle
router.put('/vehicles/:vehicleId/blacklist', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { isBlacklisted } = req.body;
    
    const vehicle = await Vehicle.findOneAndUpdate(
      { vehicleId },
      { isBlacklisted },
      { new: true }
    );
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    res.json(vehicle);
  } catch (error) {
    console.error('Error updating vehicle blacklist status:', error);
    res.status(500).json({ error: 'Failed to update vehicle blacklist status' });
  }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
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
    
    // Daily transaction counts
    const dailyTransactions = await TollTransaction.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);
    
    // Vehicle type distribution
    const vehicleTypeDistribution = await Vehicle.aggregate([
      {
        $match: {
          isActive: true,
          'metadata.vehicleType': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$metadata.vehicleType',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Status distribution
    const statusDistribution = await TollTransaction.aggregate([
      {
        $match: {
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
      dailyTransactions,
      vehicleTypeDistribution,
      statusDistribution
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Get admin users
router.get('/users', async (req, res) => {
  try {
    const users = await AdminUser.find({ isActive: true })
      .select('-__v')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

// Create admin user
router.post('/users', async (req, res) => {
  try {
    const { email, name, role } = req.body;
    
    const existingUser = await AdminUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const user = new AdminUser({
      email,
      name,
      role
    });
    
    await user.save();
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

export { router as adminRoutes };
