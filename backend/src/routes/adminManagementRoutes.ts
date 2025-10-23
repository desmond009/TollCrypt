import express from 'express';
import { AdminUser } from '../models/AdminUser';
import { LoginHistory } from '../models/LoginHistory';
import { WalletActivity } from '../models/WalletActivity';
import { SystemSettings } from '../models/SystemSettings';
import { User } from '../models/User';
import { authenticateToken, requireRole } from '../middleware/auth';
import { AuditLog } from '../models/AuditLog';

const router = express.Router();

// ==================== ADMIN USER MANAGEMENT ====================

// Get all admin users with pagination and search
router.get('/users', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    
    let query: any = {};
    
    // Apply search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Apply role filter
    if (role) {
      query.role = role;
    }
    
    // Apply status filter
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    const users = await AdminUser.find(query)
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await AdminUser.countDocuments(query);
    
    // Get login history for each user
    const usersWithLoginHistory = await Promise.all(users.map(async (user) => {
      const lastLogin = await LoginHistory.findOne({ adminId: String(user._id) })
        .sort({ loginTime: -1 });
      
      const loginCount = await LoginHistory.countDocuments({ 
        adminId: String(user._id),
        loginTime: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      });
      
      return {
        ...user.toJSON(),
        lastLogin: lastLogin?.loginTime,
        loginCount30Days: loginCount
      };
    }));
    
    res.json({
      success: true,
      data: usersWithLoginHistory,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch admin users' 
    });
  }
});

// Create new admin user
router.post('/users', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { email, name, role, tollPlaza, password } = req.body;
    
    // Validate required fields
    if (!email || !name || !role || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email, name, role, and password are required' 
      });
    }
    
    // Check if user already exists
    const existingUser = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'User with this email already exists' 
      });
    }
    
    // Validate role
    const validRoles = ['super_admin', 'plaza_operator', 'auditor', 'analyst'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid role specified' 
      });
    }
    
    // Create new user
    const newUser = new AdminUser({
      email: email.toLowerCase(),
      name,
      role,
      password,
      tollPlaza: role === 'plaza_operator' ? tollPlaza : undefined
    });
    
    await newUser.save();
    
    // Log the action
    await AuditLog.create({
      adminId: req.user?.userId,
      action: 'create_admin_user',
      resource: 'AdminUser',
      resourceId: String(newUser._id),
      details: {
        email: newUser.email,
        role: newUser.role,
        tollPlaza: newUser.tollPlaza
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(201).json({
      success: true,
      data: newUser.toJSON(),
      message: 'Admin user created successfully'
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create admin user' 
    });
  }
});

// Update admin user
router.put('/users/:id', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, tollPlaza, isActive } = req.body;
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (tollPlaza !== undefined) updateData.tollPlaza = tollPlaza;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const user = await AdminUser.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password -passwordResetToken -passwordResetExpires');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Log the action
    await AuditLog.create({
      adminId: req.user?.userId,
      action: 'update_admin_user',
      resource: 'AdminUser',
      resourceId: id,
      details: updateData,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating admin user:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update admin user' 
    });
  }
});

// Deactivate admin user
router.put('/users/:id/deactivate', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const user = await AdminUser.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).select('-password -passwordResetToken -passwordResetExpires');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Log the action
    await AuditLog.create({
      adminId: req.user?.userId,
      action: 'deactivate_admin_user',
      resource: 'AdminUser',
      resourceId: id,
      details: { reason },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      data: user,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating admin user:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to deactivate admin user' 
    });
  }
});

// Get login history for admin users
router.get('/login-history', authenticateToken, requireRole(['super_admin', 'auditor']), async (req, res) => {
  try {
    const { page = 1, limit = 50, adminId, email, ipAddress, startDate, endDate } = req.query;
    
    let query: any = {};
    
    if (adminId) query.adminId = adminId;
    if (email) query.email = { $regex: email, $options: 'i' };
    if (ipAddress) query.ipAddress = ipAddress;
    
    if (startDate || endDate) {
      query.loginTime = {};
      if (startDate) query.loginTime.$gte = new Date(startDate as string);
      if (endDate) query.loginTime.$lte = new Date(endDate as string);
    }
    
    const loginHistory = await LoginHistory.find(query)
      .populate('adminId', 'name email role')
      .sort({ loginTime: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await LoginHistory.countDocuments(query);
    
    res.json({
      success: true,
      data: loginHistory,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching login history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch login history' 
    });
  }
});

// ==================== WALLET MANAGEMENT ====================

// Get all registered user wallets
router.get('/wallets', authenticateToken, requireRole(['super_admin', 'auditor']), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, flagged, suspicious } = req.query;
    
    let query: any = {};
    
    // Apply search filter
    if (search) {
      query.$or = [
        { walletAddress: { $regex: search, $options: 'i' } },
        { topUpWalletAddress: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await User.countDocuments(query);
    
    // Get wallet activity and flags for each user
    const walletsWithActivity = await Promise.all(users.map(async (user) => {
      const recentActivity = await WalletActivity.find({ walletAddress: user.walletAddress })
        .sort({ timestamp: -1 })
        .limit(5);
      
      const suspiciousActivity = await WalletActivity.countDocuments({ 
        walletAddress: user.walletAddress,
        isSuspicious: true 
      });
      
      const flaggedActivity = await WalletActivity.countDocuments({ 
        walletAddress: user.walletAddress,
        isFlagged: true 
      });
      
      return {
        id: user._id,
        walletAddress: user.walletAddress,
        topUpWalletAddress: user.topUpWalletAddress,
        isVerified: user.isVerified,
        verificationDate: user.verificationDate,
        lastLogin: user.lastLogin,
        isActive: user.isActive,
        createdAt: user.createdAt,
        recentActivity,
        suspiciousActivityCount: suspiciousActivity,
        flaggedActivityCount: flaggedActivity,
        isSuspicious: suspiciousActivity > 0,
        isFlagged: flaggedActivity > 0
      };
    }));
    
    // Apply filters
    let filteredWallets = walletsWithActivity;
    if (flagged === 'true') {
      filteredWallets = filteredWallets.filter(w => w.isFlagged);
    }
    if (suspicious === 'true') {
      filteredWallets = filteredWallets.filter(w => w.isSuspicious);
    }
    
    res.json({
      success: true,
      data: filteredWallets,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching wallets:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch wallets' 
    });
  }
});

// Flag suspicious wallet activity
router.post('/wallets/:walletAddress/flag', authenticateToken, requireRole(['super_admin', 'auditor']), async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { reason, adminNotes } = req.body;
    
    // Create wallet activity record
    const walletActivity = new WalletActivity({
      walletAddress: walletAddress.toLowerCase(),
      activityType: 'flagged',
      description: `Wallet flagged by admin: ${reason}`,
      isFlagged: true,
      flaggedBy: req.user?.userId,
      flaggedAt: new Date(),
      metadata: {
        adminNotes,
        flags: ['admin_flagged']
      }
    });
    
    await walletActivity.save();
    
    // Log the action
    await AuditLog.create({
      adminId: req.user?.userId,
      action: 'flag_wallet',
      resource: 'Wallet',
      resourceId: walletAddress,
      details: { reason, adminNotes },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: 'Wallet flagged successfully',
      data: walletActivity
    });
  } catch (error) {
    console.error('Error flagging wallet:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to flag wallet' 
    });
  }
});

// Get wallet activity history
router.get('/wallets/:walletAddress/activity', authenticateToken, requireRole(['super_admin', 'auditor']), async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { page = 1, limit = 50, activityType, startDate, endDate } = req.query;
    
    let query: any = { walletAddress: walletAddress.toLowerCase() };
    
    if (activityType) query.activityType = activityType;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }
    
    const activities = await WalletActivity.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await WalletActivity.countDocuments(query);
    
    res.json({
      success: true,
      data: activities,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching wallet activity:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch wallet activity' 
    });
  }
});

// ==================== SYSTEM SETTINGS ====================

// Get system settings
router.get('/settings', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = new SystemSettings({
        systemName: 'TollChain Admin Dashboard',
        rpcUrl: 'https://sepolia.base.org',
        contractAddresses: {
          tollCollection: '',
          topUpWalletFactory: '',
          anonAadhaarVerifier: ''
        },
        adminWalletAddress: ''
      });
      await settings.save();
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch system settings' 
    });
  }
});

// Update system settings
router.put('/settings', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const updateData = req.body;
    
    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      settings = new SystemSettings(updateData);
    } else {
      Object.assign(settings, updateData);
    }
    
    await settings.save();
    
    // Log the action
    await AuditLog.create({
      adminId: req.user?.userId,
      action: 'update_system_settings',
      resource: 'SystemSettings',
      resourceId: String(settings._id),
      details: updateData,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      data: settings,
      message: 'System settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update system settings' 
    });
  }
});

// Toggle maintenance mode
router.put('/settings/maintenance-mode', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { enabled, message, allowedIPs } = req.body;
    
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings();
    }
    
    settings.maintenanceMode = {
      enabled,
      message: message || 'System is under maintenance. Please try again later.',
      allowedIPs: allowedIPs || []
    };
    
    await settings.save();
    
    // Log the action
    await AuditLog.create({
      adminId: req.user?.userId,
      action: 'toggle_maintenance_mode',
      resource: 'SystemSettings',
      resourceId: String(settings._id),
      details: { enabled, message, allowedIPs },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      data: settings.maintenanceMode,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error toggling maintenance mode:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to toggle maintenance mode' 
    });
  }
});

// ==================== BACKUP & MAINTENANCE ====================

// Get backup status
router.get('/backup/status', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const settings = await SystemSettings.findOne();
    
    // Mock backup status - in production, this would check actual backup status
    const backupStatus = {
      lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      nextBackup: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      backupSize: '2.5 GB',
      status: 'completed',
      settings: settings?.backupSettings || {
        enabled: true,
        frequency: 'daily',
        retentionDays: 30,
        cloudStorage: false,
        localStorage: true
      }
    };
    
    res.json({
      success: true,
      data: backupStatus
    });
  } catch (error) {
    console.error('Error fetching backup status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch backup status' 
    });
  }
});

// Trigger manual backup
router.post('/backup/trigger', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    // Mock backup trigger - in production, this would trigger actual backup
    const backupId = `backup_${Date.now()}`;
    
    // Log the action
    await AuditLog.create({
      adminId: req.user?.userId,
      action: 'trigger_manual_backup',
      resource: 'Backup',
      resourceId: backupId,
      details: { backupId },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: 'Backup triggered successfully',
      data: {
        backupId,
        status: 'in_progress',
        estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      }
    });
  } catch (error) {
    console.error('Error triggering backup:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to trigger backup' 
    });
  }
});

// Get system logs
router.get('/logs', authenticateToken, requireRole(['super_admin', 'auditor']), async (req, res) => {
  try {
    const { page = 1, limit = 100, level, startDate, endDate } = req.query;
    
    // Mock system logs - in production, this would fetch from actual log files
    const mockLogs = [
      {
        timestamp: new Date(),
        level: 'info',
        message: 'System started successfully',
        source: 'system'
      },
      {
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        level: 'warning',
        message: 'High memory usage detected',
        source: 'monitoring'
      },
      {
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        level: 'error',
        message: 'Database connection timeout',
        source: 'database'
      }
    ];
    
    res.json({
      success: true,
      data: mockLogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: mockLogs.length,
        pages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch system logs' 
    });
  }
});

export { router as adminManagementRoutes };
