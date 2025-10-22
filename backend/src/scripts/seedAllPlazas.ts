import mongoose from 'mongoose';
import { SimplePlaza } from '../models/SimplePlaza';
import { TollPlaza } from '../models/TollPlaza';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tollchain';

// Comprehensive plaza data that can be used for both collections
const plazaData = [
  {
    // Simple Plaza format (for admin dashboard)
    simple: {
      id: 'plaza-1',
      name: 'Mumbai-Pune Expressway - Plaza A',
      location: 'Mumbai-Pune Expressway, Mumbai, Maharashtra',
      coordinates: {
        lat: 19.076000,
        lng: 72.877700
      },
      status: 'active' as const,
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
    // Detailed Plaza format (for comprehensive system)
    detailed: {
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
        travelDirection: 'east'
      },
      tollRates: {
        vehicleCategories: {
          '2-wheeler': 0.000100,
          '4-wheeler': 0.000250,
          'car': 0.000300,
          'lcv': 0.000500,
          'hcv': 0.001000,
          'truck': 0.001200,
          'bus': 0.000750
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
        paymentMethods: ['eth_wallet', 'usdc_wallet'],
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
      status: 'active',
      assignedOperators: [],
      analytics: {
        todayTransactions: 156,
        todayRevenue: 0.0456,
        monthlyTransactions: 4680,
        monthlyRevenue: 1.368,
        averageTransactionTime: 45,
        peakHourTraffic: 89
      }
    }
  },
  {
    simple: {
      id: 'plaza-2',
      name: 'Delhi-Jaipur Highway - Plaza B',
      location: 'Delhi-Jaipur Highway, Delhi',
      coordinates: {
        lat: 28.6139,
        lng: 77.2090
      },
      status: 'active' as const,
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
    detailed: {
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
        travelDirection: 'west'
      },
      tollRates: {
        vehicleCategories: {
          '2-wheeler': 0.000080,
          '4-wheeler': 0.000200,
          'car': 0.000250,
          'lcv': 0.000400,
          'hcv': 0.000800,
          'truck': 0.001000,
          'bus': 0.000600
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
          totalLanes: 6,
          etcEnabledLanes: 4,
          manualLanes: 2
        },
        paymentMethods: ['eth_wallet', 'usdc_wallet'],
        smartContractAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        lastRateRevisionDate: new Date('2024-01-01'),
        nextRevisionDate: new Date('2024-07-01')
      },
      compliance: {
        governmentAuthorizationNumber: 'GOV-DL-2024-002',
        taxId: '07AABCM1234A1Z5',
        auditTrailHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        rateApprovalDocumentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        complianceStatus: 'compliant',
        lastAuditDate: new Date('2024-01-15'),
        nextAuditDate: new Date('2024-07-15')
      },
      status: 'active',
      assignedOperators: [],
      analytics: {
        todayTransactions: 203,
        todayRevenue: 0.0623,
        monthlyTransactions: 6090,
        monthlyRevenue: 1.869,
        averageTransactionTime: 42,
        peakHourTraffic: 112
      }
    }
  },
  {
    simple: {
      id: 'plaza-3',
      name: 'Bangalore-Mysore Highway - Plaza C',
      location: 'Bangalore-Mysore Highway, Bangalore, Karnataka',
      coordinates: {
        lat: 12.9716,
        lng: 77.5946
      },
      status: 'active' as const,
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
    detailed: {
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
        nearestLandmark: 'Bangalore Airport',
        travelDirection: 'south'
      },
      tollRates: {
        vehicleCategories: {
          '2-wheeler': 0.000060,
          '4-wheeler': 0.000150,
          'car': 0.000200,
          'lcv': 0.000300,
          'hcv': 0.000600,
          'truck': 0.000800,
          'bus': 0.000450
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
          totalLanes: 4,
          etcEnabledLanes: 3,
          manualLanes: 1
        },
        paymentMethods: ['eth_wallet', 'usdc_wallet'],
        smartContractAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        lastRateRevisionDate: new Date('2024-01-01'),
        nextRevisionDate: new Date('2024-07-01')
      },
      compliance: {
        governmentAuthorizationNumber: 'GOV-KA-2024-003',
        taxId: '29AABCM1234A1Z5',
        auditTrailHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        rateApprovalDocumentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        complianceStatus: 'compliant',
        lastAuditDate: new Date('2024-01-15'),
        nextAuditDate: new Date('2024-07-15')
      },
      status: 'active',
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
  },
  {
    simple: {
      id: 'plaza-4',
      name: 'Chennai-Pondicherry Road - Plaza D',
      location: 'Chennai-Pondicherry Road, Chennai, Tamil Nadu',
      coordinates: {
        lat: 13.0827,
        lng: 80.2707
      },
      status: 'maintenance' as const,
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
    detailed: {
      identification: {
        uniqueId: 'PLAZA-TN-004',
        name: 'Chennai-Pondicherry Road - Plaza D',
        regionCode: 'TN-PY',
        operatorName: 'Tamil Nadu Highways Authority',
        licenseNumber: 'TNHA-2024-004'
      },
      location: {
        gpsCoordinates: {
          latitude: 13.0827,
          longitude: 80.2707
        },
        physicalAddress: {
          street: 'Chennai-Pondicherry Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600001',
          country: 'India'
        },
        nearestLandmark: 'Chennai Airport',
        travelDirection: 'east'
      },
      tollRates: {
        vehicleCategories: {
          '2-wheeler': 0.000050,
          '4-wheeler': 0.000120,
          'car': 0.000180,
          'lcv': 0.000250,
          'hcv': 0.000500,
          'truck': 0.000700,
          'bus': 0.000400
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
          is24x7: false,
          startTime: '06:00',
          endTime: '22:00'
        },
        laneConfiguration: {
          totalLanes: 3,
          etcEnabledLanes: 2,
          manualLanes: 1
        },
        paymentMethods: ['eth_wallet', 'usdc_wallet'],
        smartContractAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        lastRateRevisionDate: new Date('2024-01-01'),
        nextRevisionDate: new Date('2024-07-01')
      },
      compliance: {
        governmentAuthorizationNumber: 'GOV-TN-2024-004',
        taxId: '33AABCM1234A1Z5',
        auditTrailHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        rateApprovalDocumentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        complianceStatus: 'compliant',
        lastAuditDate: new Date('2024-01-15'),
        nextAuditDate: new Date('2024-07-15')
      },
      status: 'maintenance',
      assignedOperators: [],
      analytics: {
        todayTransactions: 45,
        todayRevenue: 0.0123,
        monthlyTransactions: 1350,
        monthlyRevenue: 0.369,
        averageTransactionTime: 48,
        peakHourTraffic: 34
      }
    }
  },
  {
    simple: {
      id: 'plaza-5',
      name: 'Hyderabad-Vijayawada Express - Plaza E',
      location: 'Hyderabad-Vijayawada Express, Hyderabad, Telangana',
      coordinates: {
        lat: 17.3850,
        lng: 78.4867
      },
      status: 'active' as const,
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
    detailed: {
      identification: {
        uniqueId: 'PLAZA-TS-005',
        name: 'Hyderabad-Vijayawada Express - Plaza E',
        regionCode: 'TS-VJ',
        operatorName: 'Telangana State Highways Authority',
        licenseNumber: 'TSHA-2024-005'
      },
      location: {
        gpsCoordinates: {
          latitude: 17.3850,
          longitude: 78.4867
        },
        physicalAddress: {
          street: 'Hyderabad-Vijayawada Express',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500001',
          country: 'India'
        },
        nearestLandmark: 'Hyderabad Airport',
        travelDirection: 'east'
      },
      tollRates: {
        vehicleCategories: {
          '2-wheeler': 0.000070,
          '4-wheeler': 0.000180,
          'car': 0.000220,
          'lcv': 0.000350,
          'hcv': 0.000700,
          'truck': 0.000900,
          'bus': 0.000500
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
          totalLanes: 5,
          etcEnabledLanes: 4,
          manualLanes: 1
        },
        paymentMethods: ['eth_wallet', 'usdc_wallet'],
        smartContractAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        lastRateRevisionDate: new Date('2024-01-01'),
        nextRevisionDate: new Date('2024-07-01')
      },
      compliance: {
        governmentAuthorizationNumber: 'GOV-TS-2024-005',
        taxId: '36AABCM1234A1Z5',
        auditTrailHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        rateApprovalDocumentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        complianceStatus: 'compliant',
        lastAuditDate: new Date('2024-01-15'),
        nextAuditDate: new Date('2024-07-15')
      },
      status: 'active',
      assignedOperators: [],
      analytics: {
        todayTransactions: 134,
        todayRevenue: 0.0389,
        monthlyTransactions: 4020,
        monthlyRevenue: 1.167,
        averageTransactionTime: 44,
        peakHourTraffic: 78
      }
    }
  }
];

async function seedAllPlazaCollections() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding all plaza collections');

    // Clear existing data
    await SimplePlaza.deleteMany({});
    await TollPlaza.deleteMany({});
    console.log('Cleared existing plaza data from both collections');

    // Create SimplePlaza records (for admin dashboard)
    console.log('\nCreating SimplePlaza records for admin dashboard...');
    const simplePlazaData = plazaData.map(item => item.simple);
    const createdSimplePlazas = await SimplePlaza.insertMany(simplePlazaData);
    console.log(`Created ${createdSimplePlazas.length} SimplePlaza records`);

    // Create TollPlaza records (for comprehensive system)
    console.log('\nCreating TollPlaza records for comprehensive system...');
    const detailedPlazaData = plazaData.map(item => item.detailed);
    const createdDetailedPlazas = await TollPlaza.insertMany(detailedPlazaData);
    console.log(`Created ${createdDetailedPlazas.length} TollPlaza records`);

    // Display summary
    console.log('\n=== PLAZA SEEDING SUMMARY ===');
    console.log(`Total plazas created: ${plazaData.length}`);
    console.log(`SimplePlaza collection: ${createdSimplePlazas.length} records`);
    console.log(`TollPlaza collection: ${createdDetailedPlazas.length} records`);
    
    console.log('\nSimplePlaza records (for admin dashboard):');
    createdSimplePlazas.forEach(plaza => {
      console.log(`- ${plaza.name} (${plaza.id}) - Status: ${plaza.status}`);
    });

    console.log('\nTollPlaza records (for comprehensive system):');
    createdDetailedPlazas.forEach(plaza => {
      console.log(`- ${plaza.identification.name} (${plaza.identification.uniqueId}) - Status: ${plaza.status}`);
    });

    console.log('\n✅ All plaza collections seeded successfully!');
    console.log('The admin dashboard will now show plazas from MongoDB.');
    console.log('Both SimplePlaza and TollPlaza collections are synchronized.');

  } catch (error) {
    console.error('Error seeding plaza collections:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the seeding function
seedAllPlazaCollections();
