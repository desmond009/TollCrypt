const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Define the AdminUser schema (simplified for seeding)
const AdminUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'operator', 'viewer'],
    default: 'super_admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: {
    canManageVehicles: { type: Boolean, default: true },
    canProcessTolls: { type: Boolean, default: true },
    canViewAnalytics: { type: Boolean, default: true },
    canManageUsers: { type: Boolean, default: true },
    canHandleDisputes: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

const AdminUser = mongoose.model('AdminUser', AdminUserSchema);

async function seedAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tollchain');
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await AdminUser.findOne({ email: 'admin@tollchain.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const adminUser = new AdminUser({
      email: 'admin@tollchain.com',
      password: 'admin123', // This will be hashed by the pre-save hook
      name: 'System Administrator',
      role: 'super_admin',
      isActive: true
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@tollchain.com');
    console.log('Password: admin123');
    console.log('Role: super_admin');

    // Create additional test users
    const testUsers = [
      {
        email: 'operator@tollchain.com',
        password: 'operator123',
        name: 'Toll Operator',
        role: 'operator'
      },
      {
        email: 'viewer@tollchain.com',
        password: 'viewer123',
        name: 'Data Viewer',
        role: 'viewer'
      }
    ];

    for (const userData of testUsers) {
      const existingUser = await AdminUser.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new AdminUser(userData);
        await user.save();
        console.log(`Created ${userData.role}: ${userData.email}`);
      }
    }

    console.log('\nAll users created successfully!');
    console.log('\nLogin credentials:');
    console.log('Super Admin: admin@tollchain.com / admin123');
    console.log('Operator: operator@tollchain.com / operator123');
    console.log('Viewer: viewer@tollchain.com / viewer123');

  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

seedAdmin();
