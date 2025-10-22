const mongoose = require('mongoose');
const { TollPlaza } = require('./dist/models/TollPlaza');

const MONGODB_URI = 'mongodb://localhost:27017/tollchain';

// Simple dummy plazas that match the frontend interface
const dummyPlazas = [
  {
    identification: {
      uniqueId: 'PLAZA-MH-001',
      name: 'Mumbai-Pune Expressway - Plaza A',
      regionCode: 'MH-PU',
      operatorName: 'Maharashtra State Road Development Corporation',
      licenseNumber: 'MSRDC-2024-001'
    },
    location: {
      gpsCoordinates: {
        latitude: 19.076000,
        longitude: 72.877700
      },
      physicalAddress: {
        street: 'Mumbai-Pune Expressway',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India'
      },
      nearestLandmark: 'Mumbai Airport Terminal 2',
      travelDirection: 'EAST'
    },
    tollRates: {
      vehicleCategories: {
        '2-wheeler': 0.000100,
        '4-wheeler': 0.000250,
        'car': 0.000300,
        'lcv': 0.000500,
        'hcv': 0.001000,
        'truck': 0.001200,
        'bus': 0.000750,
        'mav': 0.001200
      },
      timeBasedMultipliers: {
        peakHourMultiplier: 1.5,
        offPeakMultiplier: 1.0,
        peakHours: {
          start: '07:00',
          end: '19:00'
        }
      },
      discountCodes: [],
      returnJourneyValidity: 24
    },
    operational: {
      operatingHours: {
        is24x7: true
      },
      laneConfiguration: {
        totalLanes: 8,
        etcEnabledLanes: 6,
        manualLanes: 2
      },
      paymentMethods: ['ETH_WALLET', 'USDC_WALLET'],
      smartContractAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      lastRateRevisionDate: new Date('2024-01-01'),
      nextRevisionDate: new Date('2024-07-01')
    },
    compliance: {
      governmentAuthorizationNumber: 'GOV-MH-2024-001',
      taxId: '27AABCM1234A1Z5',
      auditTrailHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      rateApprovalDocumentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      complianceStatus: 'compliant',
      lastAuditDate: new Date('2024-01-15'),
      nextAuditDate: new Date('2024-07-15')
    },
    status: 'ACTIVE',
    assignedOperators: [],
    analytics: {
      todayTransactions: 156,
      todayRevenue: 0.0456,
      monthlyTransactions: 4680,
      monthlyRevenue: 1.368,
      averageTransactionTime: 45,
      peakHourTraffic: 89
    }
  },
  {
    identification: {
      uniqueId: 'PLAZA-DL-002',
      name: 'Delhi-Jaipur Highway - Plaza B',
      regionCode: 'DL-JP',
      operatorName: 'National Highways Authority of India',
      licenseNumber: 'NHAI-2024-002'
    },
    location: {
      gpsCoordinates: {
        latitude: 28.6139,
        longitude: 77.2090
      },
      physicalAddress: {
        street: 'Delhi-Jaipur Highway',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        country: 'India'
      },
      nearestLandmark: 'Delhi Airport Terminal 3',
      travelDirection: 'WEST'
    },
    tollRates: {
      vehicleCategories: {
        '2-wheeler': 0.000080,
        '4-wheeler': 0.000200,
        'car': 0.000250,
        'lcv': 0.000400,
        'hcv': 0.000800,
        'truck': 0.001000,
        'bus': 0.000600,
        'mav': 0.001000
      },
      timeBasedMultipliers: {
        peakHourMultiplier: 1.3,
        offPeakMultiplier: 1.0,
        peakHours: {
          start: '07:00',
          end: '18:00'
        }
      },
      discountCodes: [],
      returnJourneyValidity: 36
    },
    operational: {
      operatingHours: {
        is24x7: true
      },
      laneConfiguration: {
        totalLanes: 6,
        etcEnabledLanes: 4,
        manualLanes: 2
      },
      paymentMethods: ['ETH_WALLET', 'USDC_WALLET'],
      smartContractAddress: '0xba2d35Cc6634C0532925a3b8D4C9db96C4b4d8ba',
      lastRateRevisionDate: new Date('2024-01-01'),
      nextRevisionDate: new Date('2024-07-01')
    },
    compliance: {
      governmentAuthorizationNumber: 'GOV-DL-2024-002',
      taxId: '07AABCM1234A1Z6',
      auditTrailHash: '0x2345678901bcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      rateApprovalDocumentHash: '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      complianceStatus: 'compliant',
      lastAuditDate: new Date('2024-02-01'),
      nextAuditDate: new Date('2024-08-01')
    },
    status: 'ACTIVE',
    assignedOperators: [],
    analytics: {
      todayTransactions: 203,
      todayRevenue: 0.0623,
      monthlyTransactions: 6090,
      monthlyRevenue: 1.869,
      averageTransactionTime: 38,
      peakHourTraffic: 112
    }
  },
  {
    identification: {
      uniqueId: 'PLAZA-KA-003',
      name: 'Bangalore-Mysore Highway - Plaza C',
      regionCode: 'KA-MY',
      operatorName: 'Karnataka State Highways Authority',
      licenseNumber: 'KSHA-2024-003'
    },
    location: {
      gpsCoordinates: {
        latitude: 12.9716,
        longitude: 77.5946
      },
      physicalAddress: {
        street: 'Bangalore-Mysore Highway',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India'
      },
      nearestLandmark: 'Bangalore International Airport',
      travelDirection: 'SOUTH'
    },
    tollRates: {
      vehicleCategories: {
        '2-wheeler': 0.000060,
        '4-wheeler': 0.000150,
        'car': 0.000200,
        'lcv': 0.000300,
        'hcv': 0.000600,
        'truck': 0.000800,
        'bus': 0.000450,
        'mav': 0.000800
      },
      timeBasedMultipliers: {
        peakHourMultiplier: 1.2,
        offPeakMultiplier: 1.0,
        peakHours: {
          start: '08:00',
          end: '20:00'
        }
      },
      discountCodes: [],
      returnJourneyValidity: 48
    },
    operational: {
      operatingHours: {
        is24x7: true
      },
      laneConfiguration: {
        totalLanes: 4,
        etcEnabledLanes: 3,
        manualLanes: 1
      },
      paymentMethods: ['ETH_WALLET', 'USDC_WALLET'],
      smartContractAddress: '0xcd3d35Cc6634C0532925a3b8D4C9db96C4b4d8cd',
      lastRateRevisionDate: new Date('2024-01-01'),
      nextRevisionDate: new Date('2024-07-01')
    },
    compliance: {
      governmentAuthorizationNumber: 'GOV-KA-2024-003',
      taxId: '29AABCM1234A1Z7',
      auditTrailHash: '0x3456789012cdef1234567890abcdef1234567890abcdef1234567890abcdef',
      rateApprovalDocumentHash: '0xcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      complianceStatus: 'compliant',
      lastAuditDate: new Date('2024-03-01'),
      nextAuditDate: new Date('2024-09-01')
    },
    status: 'ACTIVE',
    assignedOperators: [],
    analytics: {
      todayTransactions: 89,
      todayRevenue: 0.0234,
      monthlyTransactions: 2670,
      monthlyRevenue: 0.702,
      averageTransactionTime: 52,
      peakHourTraffic: 67
    }
  }
];

async function addDummyPlazas() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for adding dummy plazas');

    // Clear existing plaza data
    await TollPlaza.deleteMany({});
    console.log('Cleared existing plaza data');

    // Create plazas
    console.log('Creating dummy plazas...');
    const createdPlazas = await TollPlaza.insertMany(dummyPlazas);
    
    console.log(`\nSuccessfully created ${createdPlazas.length} plazas:`);
    createdPlazas.forEach(plaza => {
      console.log(`- ${plaza.identification.name} (${plaza.identification.uniqueId})`);
      console.log(`  Location: ${plaza.location.physicalAddress.city}, ${plaza.location.physicalAddress.state}`);
      console.log(`  Today's Transactions: ${plaza.analytics.todayTransactions}`);
      console.log(`  Today's Revenue: ${plaza.analytics.todayRevenue} ETH`);
      console.log('');
    });

    console.log('Dummy plazas added successfully!');
    console.log('You can now refresh the admin dashboard to see the plazas.');

  } catch (error) {
    console.error('Error adding dummy plazas:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

addDummyPlazas();
