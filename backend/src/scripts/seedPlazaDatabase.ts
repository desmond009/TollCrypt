import mongoose from 'mongoose';
import { PlazaService } from '../services/plazaService';
import { VehicleCategory, TravelDirection, PaymentMethod, PlazaStatus } from '../models/TollPlaza';
import { AdminUser } from '../models/AdminUser';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tollchain';

// Dummy Plaza Data as specified in requirements
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
      travelDirection: TravelDirection.EAST
    },
    tollRates: {
      vehicleCategories: {
        [VehicleCategory.TWO_WHEELER]: 0.000100,
        [VehicleCategory.FOUR_WHEELER]: 0.000250,
        [VehicleCategory.LCV]: 0.000500,
        [VehicleCategory.HCV]: 0.001000,
        [VehicleCategory.BUS]: 0.000750,
        [VehicleCategory.MAV]: 0.001200
      },
      timeBasedMultipliers: {
        peakHourMultiplier: 1.5,
        offPeakMultiplier: 1.0,
        peakHours: {
          start: '07:00',
          end: '19:00'
        }
      },
      discountCodes: [
        {
          code: 'REGULAR20',
          discountType: 'percentage',
          discountValue: 20,
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2024-12-31'),
          maxUsage: 1000,
          currentUsage: 0
        }
      ],
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
      paymentMethods: [PaymentMethod.ETH_WALLET, PaymentMethod.USDC_WALLET],
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
    status: PlazaStatus.ACTIVE,
    assignedOperators: [],
    analytics: {
      todayTransactions: 0,
      todayRevenue: 0,
      monthlyTransactions: 0,
      monthlyRevenue: 0,
      averageTransactionTime: 0,
      peakHourTraffic: 0
    }
  },
  {
    identification: {
      uniqueId: 'PLAZA-DL-002',
      name: 'Delhi-Jaipur Highway - Plaza B',
      regionCode: 'DL-RJ',
      operatorName: 'National Highways Authority of India',
      licenseNumber: 'NHAI-2024-002'
    },
    location: {
      gpsCoordinates: {
        latitude: 28.704100,
        longitude: 77.102500
      },
      physicalAddress: {
        street: 'Delhi-Jaipur Highway',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        country: 'India'
      },
      nearestLandmark: 'India Gate',
      travelDirection: TravelDirection.WEST
    },
    tollRates: {
      vehicleCategories: {
        [VehicleCategory.TWO_WHEELER]: 0.000150,
        [VehicleCategory.FOUR_WHEELER]: 0.000300,
        [VehicleCategory.LCV]: 0.000600,
        [VehicleCategory.HCV]: 0.001200,
        [VehicleCategory.BUS]: 0.000900,
        [VehicleCategory.MAV]: 0.001500
      },
      timeBasedMultipliers: {
        peakHourMultiplier: 1.6,
        offPeakMultiplier: 1.0,
        peakHours: {
          start: '08:00',
          end: '20:00'
        }
      },
      discountCodes: [
        {
          code: 'FREQUENT15',
          discountType: 'percentage',
          discountValue: 15,
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2024-12-31'),
          maxUsage: 500,
          currentUsage: 0
        }
      ],
      returnJourneyValidity: 12
    },
    operational: {
      operatingHours: {
        is24x7: true
      },
      laneConfiguration: {
        totalLanes: 10,
        etcEnabledLanes: 8,
        manualLanes: 2
      },
      paymentMethods: [PaymentMethod.ETH_WALLET, PaymentMethod.USDC_WALLET, PaymentMethod.UPI],
      smartContractAddress: '0x8a2d35Cc6634C0532925a3b8D4C9db96C4b4d8b7',
      lastRateRevisionDate: new Date('2024-01-01'),
      nextRevisionDate: new Date('2024-07-01')
    },
    compliance: {
      governmentAuthorizationNumber: 'GOV-DL-2024-002',
      taxId: '07AABCM1234A1Z6',
      auditTrailHash: '0x2345678901bcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      rateApprovalDocumentHash: '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      complianceStatus: 'compliant',
      lastAuditDate: new Date('2024-01-20'),
      nextAuditDate: new Date('2024-07-20')
    },
    status: PlazaStatus.ACTIVE,
    assignedOperators: [],
    analytics: {
      todayTransactions: 0,
      todayRevenue: 0,
      monthlyTransactions: 0,
      monthlyRevenue: 0,
      averageTransactionTime: 0,
      peakHourTraffic: 0
    }
  },
  {
    identification: {
      uniqueId: 'PLAZA-KA-003',
      name: 'Bangalore-Mysore Highway - Plaza C',
      regionCode: 'KA-MY',
      operatorName: 'Karnataka State Highways Improvement Project',
      licenseNumber: 'KSHIP-2024-003'
    },
    location: {
      gpsCoordinates: {
        latitude: 12.971600,
        longitude: 77.594600
      },
      physicalAddress: {
        street: 'Bangalore-Mysore Highway',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India'
      },
      nearestLandmark: 'Bangalore Palace',
      travelDirection: TravelDirection.SOUTH
    },
    tollRates: {
      vehicleCategories: {
        [VehicleCategory.TWO_WHEELER]: 0.000120,
        [VehicleCategory.FOUR_WHEELER]: 0.000280,
        [VehicleCategory.LCV]: 0.000550,
        [VehicleCategory.HCV]: 0.001100,
        [VehicleCategory.BUS]: 0.000800,
        [VehicleCategory.MAV]: 0.001300
      },
      timeBasedMultipliers: {
        peakHourMultiplier: 1.4,
        offPeakMultiplier: 1.0,
        peakHours: {
          start: '07:30',
          end: '18:30'
        }
      },
      discountCodes: [
        {
          code: 'WEEKEND10',
          discountType: 'percentage',
          discountValue: 10,
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2024-12-31'),
          maxUsage: 2000,
          currentUsage: 0
        }
      ],
      returnJourneyValidity: 18
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
      paymentMethods: [PaymentMethod.ETH_WALLET, PaymentMethod.USDC_WALLET],
      smartContractAddress: '0x9a2d35Cc6634C0532925a3b8D4C9db96C4b4d8b8',
      lastRateRevisionDate: new Date('2024-01-01'),
      nextRevisionDate: new Date('2024-07-01')
    },
    compliance: {
      governmentAuthorizationNumber: 'GOV-KA-2024-003',
      taxId: '29AABCM1234A1Z7',
      auditTrailHash: '0x3456789012cdef1234567890abcdef1234567890abcdef1234567890abcdef',
      rateApprovalDocumentHash: '0xcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      complianceStatus: 'compliant',
      lastAuditDate: new Date('2024-01-25'),
      nextAuditDate: new Date('2024-07-25')
    },
    status: PlazaStatus.ACTIVE,
    assignedOperators: [],
    analytics: {
      todayTransactions: 0,
      todayRevenue: 0,
      monthlyTransactions: 0,
      monthlyRevenue: 0,
      averageTransactionTime: 0,
      peakHourTraffic: 0
    }
  },
  {
    identification: {
      uniqueId: 'PLAZA-TS-004',
      name: 'Hyderabad-Vijayawada Express - Plaza D',
      regionCode: 'TS-AP',
      operatorName: 'Telangana State Road Transport Corporation',
      licenseNumber: 'TSRTC-2024-004'
    },
    location: {
      gpsCoordinates: {
        latitude: 17.385000,
        longitude: 78.486700
      },
      physicalAddress: {
        street: 'Hyderabad-Vijayawada Express',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500001',
        country: 'India'
      },
      nearestLandmark: 'Charminar',
      travelDirection: TravelDirection.EAST
    },
    tollRates: {
      vehicleCategories: {
        [VehicleCategory.TWO_WHEELER]: 0.000200,
        [VehicleCategory.FOUR_WHEELER]: 0.000400,
        [VehicleCategory.LCV]: 0.000800,
        [VehicleCategory.HCV]: 0.001500,
        [VehicleCategory.BUS]: 0.001000,
        [VehicleCategory.MAV]: 0.001800
      },
      timeBasedMultipliers: {
        peakHourMultiplier: 1.7,
        offPeakMultiplier: 1.0,
        peakHours: {
          start: '08:30',
          end: '19:30'
        }
      },
      discountCodes: [
        {
          code: 'EARLYBIRD25',
          discountType: 'percentage',
          discountValue: 25,
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2024-12-31'),
          maxUsage: 300,
          currentUsage: 0
        }
      ],
      returnJourneyValidity: 6
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
      paymentMethods: [PaymentMethod.ETH_WALLET, PaymentMethod.USDC_WALLET, PaymentMethod.CREDIT_CARD],
      smartContractAddress: '0xaa2d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
      lastRateRevisionDate: new Date('2024-01-01'),
      nextRevisionDate: new Date('2024-07-01')
    },
    compliance: {
      governmentAuthorizationNumber: 'GOV-TS-2024-004',
      taxId: '36AABCM1234A1Z8',
      auditTrailHash: '0x4567890123def1234567890abcdef1234567890abcdef1234567890abcdef',
      rateApprovalDocumentHash: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      complianceStatus: 'compliant',
      lastAuditDate: new Date('2024-01-30'),
      nextAuditDate: new Date('2024-07-30')
    },
    status: PlazaStatus.ACTIVE,
    assignedOperators: [],
    analytics: {
      todayTransactions: 0,
      todayRevenue: 0,
      monthlyTransactions: 0,
      monthlyRevenue: 0,
      averageTransactionTime: 0,
      peakHourTraffic: 0
    }
  },
  {
    identification: {
      uniqueId: 'PLAZA-TN-005',
      name: 'Chennai-Pondicherry Road - Plaza E',
      regionCode: 'TN-PY',
      operatorName: 'Tamil Nadu Highways Department',
      licenseNumber: 'TNHD-2024-005'
    },
    location: {
      gpsCoordinates: {
        latitude: 13.082700,
        longitude: 80.270700
      },
      physicalAddress: {
        street: 'Chennai-Pondicherry Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
        country: 'India'
      },
      nearestLandmark: 'Marina Beach',
      travelDirection: TravelDirection.SOUTH
    },
    tollRates: {
      vehicleCategories: {
        [VehicleCategory.TWO_WHEELER]: 0.000080,
        [VehicleCategory.FOUR_WHEELER]: 0.000200,
        [VehicleCategory.LCV]: 0.000400,
        [VehicleCategory.HCV]: 0.000800,
        [VehicleCategory.BUS]: 0.000600,
        [VehicleCategory.MAV]: 0.001000
      },
      timeBasedMultipliers: {
        peakHourMultiplier: 1.3,
        offPeakMultiplier: 1.0,
        peakHours: {
          start: '07:00',
          end: '18:00'
        }
      },
      discountCodes: [
        {
          code: 'STUDENT50',
          discountType: 'percentage',
          discountValue: 50,
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2024-12-31'),
          maxUsage: 100,
          currentUsage: 0
        }
      ],
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
      paymentMethods: [PaymentMethod.ETH_WALLET, PaymentMethod.USDC_WALLET, PaymentMethod.UPI],
      smartContractAddress: '0xba2d35Cc6634C0532925a3b8D4C9db96C4b4d8ba',
      lastRateRevisionDate: new Date('2024-01-01'),
      nextRevisionDate: new Date('2024-07-01')
    },
    compliance: {
      governmentAuthorizationNumber: 'GOV-TN-2024-005',
      taxId: '33AABCM1234A1Z9',
      auditTrailHash: '0x5678901234ef1234567890abcdef1234567890abcdef1234567890abcdef',
      rateApprovalDocumentHash: '0xef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      complianceStatus: 'compliant',
      lastAuditDate: new Date('2024-02-01'),
      nextAuditDate: new Date('2024-08-01')
    },
    status: PlazaStatus.ACTIVE,
    assignedOperators: [],
    analytics: {
      todayTransactions: 0,
      todayRevenue: 0,
      monthlyTransactions: 0,
      monthlyRevenue: 0,
      averageTransactionTime: 0,
      peakHourTraffic: 0
    }
  }
];

async function seedPlazaDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for plaza seeding');

    // Clear existing plaza data
    const { TollPlaza } = await import('../models/TollPlaza');
    const { TollRate } = await import('../models/TollRate');
    
    await TollPlaza.deleteMany({});
    await TollRate.deleteMany({});
    console.log('Cleared existing plaza data');

    // Create admin users first (if they don't exist)
    const existingAdmin = await AdminUser.findOne({ email: 'superadmin@tollchain.com' });
    let superAdminId = existingAdmin?._id.toString();

    if (!existingAdmin) {
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
            canHandleDisputes: true,
            canManagePlazas: true
          }
        }
      ];

      const createdAdmins = await AdminUser.insertMany(adminUsers);
      superAdminId = createdAdmins[0]._id.toString();
      console.log('Created super admin user');
    }

    // Create plazas using the PlazaService
    console.log('Creating dummy plazas...');
    const createdPlazas = [];

    for (const plazaData of dummyPlazas) {
      try {
        const plaza = await PlazaService.createPlaza(plazaData);
        createdPlazas.push(plaza);
        console.log(`Created plaza: ${plaza.identification.name} (${plaza.identification.uniqueId})`);
      } catch (error) {
        console.error(`Failed to create plaza ${plazaData.identification.name}:`, error.message);
      }
    }

    console.log(`\nSuccessfully created ${createdPlazas.length} plazas out of ${dummyPlazas.length}`);

    // Display summary
    console.log('\n=== PLAZA SEEDING SUMMARY ===');
    console.log('Created Plazas:');
    createdPlazas.forEach((plaza, index) => {
      console.log(`${index + 1}. ${plaza.identification.name}`);
      console.log(`   ID: ${plaza.identification.uniqueId}`);
      console.log(`   Location: ${plaza.location.physicalAddress.city}, ${plaza.location.physicalAddress.state}`);
      console.log(`   Smart Contract: ${plaza.operational.smartContractAddress}`);
      console.log(`   Toll Rates (ETH):`);
      Object.entries(plaza.tollRates.vehicleCategories).forEach(([vehicleType, rate]) => {
        console.log(`     ${vehicleType}: ${rate} ETH`);
      });
      console.log('');
    });

    console.log('Plaza database seeding completed successfully!');
    console.log('\nAdmin Credentials:');
    console.log('Super Admin: superadmin@tollchain.com / admin123');

  } catch (error) {
    console.error('Error seeding plaza database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
if (require.main === module) {
  seedPlazaDatabase();
}

export default seedPlazaDatabase;
