import mongoose from 'mongoose';
import { AdminUser } from '../models/AdminUser';
import { TollPlaza } from '../models/TollPlaza';
import { SystemConfiguration } from '../models/SystemConfiguration';
import { Notification } from '../models/Notification';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tollchain';

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding');

    // Clear existing data
    await AdminUser.deleteMany({});
    await TollPlaza.deleteMany({});
    await SystemConfiguration.deleteMany({});
    await Notification.deleteMany({});

    console.log('Cleared existing data');

    // Create admin users
    const adminUsers = [
      {
        email: 'superadmin@tollchain.com',
        password: await bcrypt.hash('admin123', 10),
        name: 'Super Admin',
        role: 'super_admin',
        isActive: true,
        permissions: {
          canManageVehicles: true,
          canProcessTolls: true,
          canViewAnalytics: true,
          canManageUsers: true,
          canHandleDisputes: true
        }
      },
      {
        email: 'admin@tollchain.com',
        password: await bcrypt.hash('admin123', 10),
        name: 'Admin User',
        role: 'admin',
        isActive: true,
        permissions: {
          canManageVehicles: true,
          canProcessTolls: true,
          canViewAnalytics: true,
          canManageUsers: false,
          canHandleDisputes: true
        }
      },
      {
        email: 'operator@tollchain.com',
        password: await bcrypt.hash('admin123', 10),
        name: 'Toll Operator',
        role: 'operator',
        isActive: true,
        tollPlaza: 'plaza_delhi_mumbai',
        permissions: {
          canManageVehicles: true,
          canProcessTolls: true,
          canViewAnalytics: false,
          canManageUsers: false,
          canHandleDisputes: false
        }
      }
    ];

    const createdAdmins = await AdminUser.insertMany(adminUsers);
    console.log('Created admin users:', createdAdmins.length);

    // Create toll plazas
    const tollPlazas = [
      {
        id: 'plaza_delhi_mumbai',
        name: 'Delhi-Mumbai Expressway',
        location: 'Delhi-Mumbai Expressway, India',
        coordinates: {
          lat: 28.6139,
          lng: 77.2090
        },
        status: 'active',
        tollRates: {
          '2-wheeler': 50,
          '4-wheeler': 100,
          'car': 150,
          'lcv': 200,
          'hcv': 300,
          'truck': 400,
          'bus': 250
        },
        operatingHours: {
          start: '00:00',
          end: '23:59'
        },
        assignedOperators: [createdAdmins[2]._id.toString()],
        todayTransactions: 0,
        todayRevenue: 0
      },
      {
        id: 'plaza_bangalore_chennai',
        name: 'Bangalore-Chennai Highway',
        location: 'Bangalore-Chennai Highway, India',
        coordinates: {
          lat: 12.9716,
          lng: 77.5946
        },
        status: 'active',
        tollRates: {
          '2-wheeler': 25,
          '4-wheeler': 50,
          'car': 75,
          'lcv': 100,
          'hcv': 150,
          'truck': 200,
          'bus': 125
        },
        operatingHours: {
          start: '00:00',
          end: '23:59'
        },
        assignedOperators: [],
        todayTransactions: 0,
        todayRevenue: 0
      },
      {
        id: 'plaza_mumbai_pune',
        name: 'Mumbai-Pune Expressway',
        location: 'Mumbai-Pune Expressway, India',
        coordinates: {
          lat: 19.0760,
          lng: 72.8777
        },
        status: 'active',
        tollRates: {
          '2-wheeler': 30,
          '4-wheeler': 60,
          'car': 90,
          'lcv': 120,
          'hcv': 180,
          'truck': 240,
          'bus': 150
        },
        operatingHours: {
          start: '00:00',
          end: '23:59'
        },
        assignedOperators: [],
        todayTransactions: 0,
        todayRevenue: 0
      }
    ];

    const createdPlazas = await TollPlaza.insertMany(tollPlazas);
    console.log('Created toll plazas:', createdPlazas.length);

    // Create system configurations
    const systemConfigs = [
      {
        key: 'system_name',
        value: 'TollChain System',
        description: 'Name of the toll management system',
        category: 'general',
        isActive: true
      },
      {
        key: 'default_currency',
        value: 'USDC',
        description: 'Default currency for toll payments',
        category: 'general',
        isActive: true
      },
      {
        key: 'max_vehicles_per_user',
        value: 10,
        description: 'Maximum number of vehicles a user can register',
        category: 'general',
        isActive: true
      },
      {
        key: 'blockchain_network',
        value: 'polygon',
        description: 'Blockchain network used for transactions',
        category: 'blockchain',
        isActive: true
      },
      {
        key: 'gasless_transaction_enabled',
        value: true,
        description: 'Enable gasless transactions for users',
        category: 'blockchain',
        isActive: true
      },
      {
        key: 'session_timeout',
        value: 3600,
        description: 'Session timeout in seconds',
        category: 'security',
        isActive: true
      },
      {
        key: 'max_login_attempts',
        value: 5,
        description: 'Maximum login attempts before account lockout',
        category: 'security',
        isActive: true
      },
      {
        key: 'notification_enabled',
        value: true,
        description: 'Enable real-time notifications',
        category: 'notifications',
        isActive: true
      },
      {
        key: 'email_notifications',
        value: true,
        description: 'Enable email notifications',
        category: 'notifications',
        isActive: true
      }
    ];

    const createdConfigs = await SystemConfiguration.insertMany(systemConfigs);
    console.log('Created system configurations:', createdConfigs.length);

    // Create initial notifications
    const initialNotifications = [
      {
        type: 'system',
        title: 'System Initialized',
        message: 'TollChain system has been successfully initialized and is ready for use.',
        recipientRole: 'admin',
        priority: 'medium',
        isRead: false,
        metadata: {}
      },
      {
        type: 'system',
        title: 'Database Seeded',
        message: 'Initial data has been loaded into the database including admin users and toll plazas.',
        recipientRole: 'admin',
        priority: 'low',
        isRead: false,
        metadata: {}
      }
    ];

    const createdNotifications = await Notification.insertMany(initialNotifications);
    console.log('Created initial notifications:', createdNotifications.length);

    console.log('Database seeding completed successfully!');
    console.log('\nAdmin Credentials:');
    console.log('Super Admin: superadmin@tollchain.com / admin123');
    console.log('Admin: admin@tollchain.com / admin123');
    console.log('Operator: operator@tollchain.com / admin123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
if (require.main === module) {
  seedDatabase();
}

export default seedDatabase;
