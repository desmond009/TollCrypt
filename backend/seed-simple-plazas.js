const mongoose = require('mongoose');
const { SimplePlaza } = require('./dist/models/SimplePlaza');

const MONGODB_URI = process.env.MONGODB_URI;

// Simple dummy plazas that match the admin dashboard interface
const dummyPlazas = [
  {
    id: 'plaza-1',
    name: 'Mumbai-Pune Expressway - Plaza A',
    location: 'Mumbai-Pune Expressway, Mumbai, Maharashtra',
    coordinates: {
      lat: 19.076000,
      lng: 72.877700
    },
    status: 'active',
    tollRates: {
      '2-wheeler': 0.000100,
      '4-wheeler': 0.000250,
      'car': 0.000300,
      'lcv': 0.000500,
      'hcv': 0.001000,
      'truck': 0.001200,
      'bus': 0.000750
    },
    operatingHours: {
      start: '00:00',
      end: '23:59'
    },
    assignedOperators: [],
    todayTransactions: 156,
    todayRevenue: 0.0456,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'plaza-2',
    name: 'Delhi-Jaipur Highway - Plaza B',
    location: 'Delhi-Jaipur Highway, Delhi',
    coordinates: {
      lat: 28.6139,
      lng: 77.2090
    },
    status: 'active',
    tollRates: {
      '2-wheeler': 0.000080,
      '4-wheeler': 0.000200,
      'car': 0.000250,
      'lcv': 0.000400,
      'hcv': 0.000800,
      'truck': 0.001000,
      'bus': 0.000600
    },
    operatingHours: {
      start: '00:00',
      end: '23:59'
    },
    assignedOperators: [],
    todayTransactions: 203,
    todayRevenue: 0.0623,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'plaza-3',
    name: 'Bangalore-Mysore Highway - Plaza C',
    location: 'Bangalore-Mysore Highway, Bangalore, Karnataka',
    coordinates: {
      lat: 12.9716,
      lng: 77.5946
    },
    status: 'active',
    tollRates: {
      '2-wheeler': 0.000060,
      '4-wheeler': 0.000150,
      'car': 0.000200,
      'lcv': 0.000300,
      'hcv': 0.000600,
      'truck': 0.000800,
      'bus': 0.000450
    },
    operatingHours: {
      start: '00:00',
      end: '23:59'
    },
    assignedOperators: [],
    todayTransactions: 89,
    todayRevenue: 0.0234,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'plaza-4',
    name: 'Chennai-Pondicherry Road - Plaza D',
    location: 'Chennai-Pondicherry Road, Chennai, Tamil Nadu',
    coordinates: {
      lat: 13.0827,
      lng: 80.2707
    },
    status: 'maintenance',
    tollRates: {
      '2-wheeler': 0.000050,
      '4-wheeler': 0.000120,
      'car': 0.000180,
      'lcv': 0.000250,
      'hcv': 0.000500,
      'truck': 0.000700,
      'bus': 0.000400
    },
    operatingHours: {
      start: '06:00',
      end: '22:00'
    },
    assignedOperators: [],
    todayTransactions: 45,
    todayRevenue: 0.0123,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'plaza-5',
    name: 'Hyderabad-Vijayawada Express - Plaza E',
    location: 'Hyderabad-Vijayawada Express, Hyderabad, Telangana',
    coordinates: {
      lat: 17.3850,
      lng: 78.4867
    },
    status: 'active',
    tollRates: {
      '2-wheeler': 0.000070,
      '4-wheeler': 0.000180,
      'car': 0.000220,
      'lcv': 0.000350,
      'hcv': 0.000700,
      'truck': 0.000900,
      'bus': 0.000500
    },
    operatingHours: {
      start: '00:00',
      end: '23:59'
    },
    assignedOperators: [],
    todayTransactions: 134,
    todayRevenue: 0.0389,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'plaza-6',
    name: 'Kolkata-Durgapur Expressway - Plaza F',
    location: 'Kolkata-Durgapur Expressway, Kolkata, West Bengal',
    coordinates: {
      lat: 22.5726,
      lng: 88.3639
    },
    status: 'active',
    tollRates: {
      '2-wheeler': 0.000090,
      '4-wheeler': 0.000220,
      'car': 0.000280,
      'lcv': 0.000450,
      'hcv': 0.000900,
      'truck': 0.001100,
      'bus': 0.000650
    },
    operatingHours: {
      start: '00:00',
      end: '23:59'
    },
    assignedOperators: [],
    todayTransactions: 178,
    todayRevenue: 0.0521,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'plaza-7',
    name: 'Ahmedabad-Vadodara Expressway - Plaza G',
    location: 'Ahmedabad-Vadodara Expressway, Ahmedabad, Gujarat',
    coordinates: {
      lat: 23.0225,
      lng: 72.5714
    },
    status: 'active',
    tollRates: {
      '2-wheeler': 0.000075,
      '4-wheeler': 0.000190,
      'car': 0.000240,
      'lcv': 0.000380,
      'hcv': 0.000760,
      'truck': 0.000950,
      'bus': 0.000550
    },
    operatingHours: {
      start: '00:00',
      end: '23:59'
    },
    assignedOperators: [],
    todayTransactions: 142,
    todayRevenue: 0.0412,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'plaza-8',
    name: 'Pune-Nashik Highway - Plaza H',
    location: 'Pune-Nashik Highway, Pune, Maharashtra',
    coordinates: {
      lat: 18.5204,
      lng: 73.8567
    },
    status: 'inactive',
    tollRates: {
      '2-wheeler': 0.000065,
      '4-wheeler': 0.000160,
      'car': 0.000210,
      'lcv': 0.000330,
      'hcv': 0.000660,
      'truck': 0.000820,
      'bus': 0.000480
    },
    operatingHours: {
      start: '06:00',
      end: '22:00'
    },
    assignedOperators: [],
    todayTransactions: 0,
    todayRevenue: 0.0000,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedSimplePlazas() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding SimplePlaza collection');

    // Clear existing SimplePlaza data
    await SimplePlaza.deleteMany({});
    console.log('Cleared existing SimplePlaza data');

    // Create plazas
    console.log('Creating dummy plazas in SimplePlaza collection...');
    const createdPlazas = await SimplePlaza.insertMany(dummyPlazas);
    
    console.log(`\nSuccessfully created ${createdPlazas.length} plazas:`);
    createdPlazas.forEach(plaza => {
      console.log(`- ${plaza.name} (${plaza.id})`);
      console.log(`  Location: ${plaza.location}`);
      console.log(`  Status: ${plaza.status}`);
      console.log(`  Today's Transactions: ${plaza.todayTransactions}`);
      console.log(`  Today's Revenue: ${plaza.todayRevenue} ETH`);
      console.log('');
    });

    console.log('SimplePlaza collection seeded successfully!');
    console.log('The admin dashboard will now show these plazas from MongoDB.');
    console.log('\nTo run this script: node seed-simple-plazas.js');

  } catch (error) {
    console.error('Error seeding SimplePlaza collection:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
seedSimplePlazas();
