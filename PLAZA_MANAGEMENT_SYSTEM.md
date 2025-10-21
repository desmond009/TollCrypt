# Production-Grade Plaza Management System

## Overview

This document describes the comprehensive plaza management system implemented for the Toll Chain application. The system provides production-grade functionality for managing toll plazas with complete identification, location data, toll rate structures, operational metadata, and compliance tracking.

## Features Implemented

### ✅ Plaza Identification
- **Unique Plaza ID**: Format `PLAZA-{REGION}-{NUMBER}` (e.g., `PLAZA-MH-001`)
- **Plaza Name**: Format `{Highway/Road Name} - Plaza {Letter/Name}`
- **Region/State Code**: ISO 3166-2 format (e.g., `MH-PU`)
- **Operator/Authority Name**: Full operator organization name
- **License/Registration Number**: Unique license identifier

### ✅ Location Data
- **GPS Coordinates**: Decimal degrees with 6 decimal precision
- **Physical Address**: Complete address with street, city, state, postal code, country
- **Nearest Landmark**: Landmark within 5 km radius
- **Direction of Travel**: North/South/East/West bound

### ✅ Toll Rate Structure
- **Vehicle Categories**: 2-Wheeler, 4-Wheeler, LCV, HCV, Bus, MAV (Multi-Axle Vehicle)
- **Rates in Sepolia ETH**: All rates with 6 decimal precision
- **Time-based Multipliers**: Peak/off-peak hour rates
- **Discount Codes**: Percentage/fixed discounts with usage limits
- **Return Journey Validity**: Hours for return journey discounts

### ✅ Operational Metadata
- **Operating Hours**: 24/7 or specific timings
- **Lane Configuration**: Total, ETC-enabled, manual lanes
- **Payment Methods**: Blockchain wallet types supported
- **Smart Contract Address**: Sepolia testnet contract address
- **Rate Revision Tracking**: Last and next revision dates

### ✅ Compliance & Audit
- **Government Authorization Number**: Official authorization
- **Tax ID/GST Number**: Tax identification
- **Audit Trail Hash**: Blockchain transaction reference
- **Rate Approval Document Hash**: Document verification hash
- **Compliance Status**: Compliant/Pending/Non-compliant tracking

## Database Schema

### TollPlaza Model
```typescript
interface ITollPlaza {
  identification: PlazaIdentification;
  location: LocationData;
  tollRates: TollRateStructure;
  operational: OperationalMetadata;
  compliance: ComplianceAudit;
  status: PlazaStatus;
  assignedOperators: string[];
  analytics: AnalyticsData;
  createdAt: Date;
  updatedAt: Date;
}
```

### TollRate Model
```typescript
interface ITollRate {
  id: string;
  plazaUniqueId: string;
  vehicleType: VehicleCategory;
  baseRate: number; // 6 decimal precision ETH
  peakHourMultiplier: number;
  offPeakMultiplier: number;
  discountRules: DiscountRule[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  revisionNumber: number;
  approvedBy: string;
  approvalDocumentHash: string;
}
```

## API Endpoints

### Plaza Management
- `POST /api/plazas` - Create new plaza (Admin only)
- `GET /api/plazas` - Get all plazas with filters
- `GET /api/plazas/:uniqueId` - Get plaza by unique ID
- `PUT /api/plazas/:uniqueId` - Update plaza (Admin only)
- `DELETE /api/plazas/:uniqueId` - Delete plaza (Super Admin only)

### Plaza Search & Discovery
- `GET /api/plazas/proximity` - Find plazas by GPS coordinates
- `GET /api/plazas/search/text` - Text search across plaza data

### Toll Calculation
- `POST /api/plazas/:uniqueId/calculate-toll` - Calculate toll for vehicle

### Analytics
- `GET /api/plazas/:uniqueId/analytics` - Get plaza analytics (Admin only)
- `PUT /api/plazas/:uniqueId/analytics` - Update analytics (Admin only)

## Dummy Data Implementation

### 5 Production-Ready Dummy Plazas

1. **Mumbai-Pune Expressway - Plaza A**
   - ID: `PLAZA-MH-001`
   - Location: Mumbai, Maharashtra
   - Rates: 2-Wheeler: 0.0001 ETH, 4-Wheeler: 0.00025 ETH, etc.

2. **Delhi-Jaipur Highway - Plaza B**
   - ID: `PLAZA-DL-002`
   - Location: Delhi
   - Rates: 2-Wheeler: 0.00015 ETH, 4-Wheeler: 0.0003 ETH, etc.

3. **Bangalore-Mysore Highway - Plaza C**
   - ID: `PLAZA-KA-003`
   - Location: Bangalore, Karnataka
   - Rates: 2-Wheeler: 0.00012 ETH, 4-Wheeler: 0.00028 ETH, etc.

4. **Hyderabad-Vijayawada Express - Plaza D**
   - ID: `PLAZA-TS-004`
   - Location: Hyderabad, Telangana
   - Rates: 2-Wheeler: 0.0002 ETH, 4-Wheeler: 0.0004 ETH, etc.

5. **Chennai-Pondicherry Road - Plaza E**
   - ID: `PLAZA-TN-005`
   - Location: Chennai, Tamil Nadu
   - Rates: 2-Wheeler: 0.00008 ETH, 4-Wheeler: 0.0002 ETH, etc.

## Services

### PlazaService
Comprehensive service class providing:
- Plaza CRUD operations
- Proximity-based search
- Toll calculation with time-based multipliers
- Analytics management
- Validation and error handling

### Key Methods
- `createPlaza()` - Create new plaza with validation
- `searchPlazas()` - Filtered plaza search
- `findPlazasByProximity()` - GPS-based proximity search
- `calculateToll()` - Dynamic toll calculation
- `getPlazaAnalytics()` - Analytics retrieval

## Database Indexes

### Performance Optimizations
- **Compound Indexes**: Plaza ID, region, status combinations
- **Geospatial Index**: 2dsphere index for proximity searches
- **Text Index**: Full-text search across plaza names and locations
- **Toll Rate Indexes**: Plaza-vehicle type-active status combinations

## Validation & Constraints

### Data Validation
- **Unique Constraints**: Plaza ID, license number, authorization number, tax ID
- **Format Validation**: GPS coordinates (6 decimal precision), time formats
- **Business Logic**: Lane configuration validation, rate precision validation
- **Referential Integrity**: Admin user references, smart contract addresses

### Security Features
- **Admin Authentication**: Role-based access control
- **Input Validation**: Comprehensive request validation
- **Audit Trail**: Blockchain hash tracking for compliance
- **Rate Approval**: Document hash verification

## Usage Examples

### Create a New Plaza
```typescript
const plazaData = {
  identification: {
    uniqueId: 'PLAZA-MH-001',
    name: 'Mumbai-Pune Expressway - Plaza A',
    regionCode: 'MH-PU',
    operatorName: 'MSRDC',
    licenseNumber: 'MSRDC-2024-001'
  },
  location: {
    gpsCoordinates: { latitude: 19.076000, longitude: 72.877700 },
    physicalAddress: { /* address data */ },
    nearestLandmark: 'Mumbai Airport Terminal 2',
    travelDirection: 'east'
  },
  tollRates: {
    vehicleCategories: {
      '2-wheeler': 0.000100,
      '4-wheeler': 0.000250,
      // ... other categories
    },
    timeBasedMultipliers: {
      peakHourMultiplier: 1.5,
      offPeakMultiplier: 1.0,
      peakHours: { start: '07:00', end: '19:00' }
    }
  },
  // ... other required fields
};

const plaza = await PlazaService.createPlaza(plazaData);
```

### Calculate Toll
```typescript
const tollCalculation = await PlazaService.calculateToll(
  'PLAZA-MH-001',
  VehicleCategory.FOUR_WHEELER,
  new Date(),
  'REGULAR20' // optional discount code
);

// Returns:
// {
//   baseRate: 0.000250,
//   multiplier: 1.5,
//   finalRate: 0.000375,
//   discountApplied: 0.000075,
//   currency: 'ETH'
// }
```

### Find Nearby Plazas
```typescript
const nearbyPlazas = await PlazaService.findPlazasByProximity({
  latitude: 19.076000,
  longitude: 72.877700,
  radiusInKm: 10,
  maxResults: 5
});
```

## Seeding the Database

### Run Plaza Seeding
```bash
cd backend
npm run seed:plazas
# or
npx ts-node src/scripts/seedPlazaDatabase.ts
```

### What Gets Created
- 5 production-ready dummy plazas
- Associated toll rates for each vehicle category
- Admin user (if not exists)
- Complete compliance and operational data

## Integration Points

### Smart Contract Integration
- Each plaza has a dedicated smart contract address
- Toll rates are validated against blockchain contracts
- Transaction hashes are stored for audit trails

### Frontend Integration
- RESTful API endpoints for all operations
- Real-time updates via WebSocket
- Comprehensive error handling and validation

### Admin Dashboard
- Plaza management interface
- Analytics and reporting
- Compliance monitoring
- Rate revision tracking

## Testing Strategy

### Unit Tests
- Plaza service methods
- Validation logic
- Toll calculation algorithms
- Proximity search functionality

### Integration Tests
- API endpoint testing
- Database operations
- Smart contract integration
- Authentication and authorization

### Performance Tests
- Geospatial query performance
- Large dataset handling
- Concurrent plaza operations
- Analytics calculation speed

## Future Enhancements

### Planned Features
- **Real-time Analytics**: Live traffic and revenue monitoring
- **Dynamic Pricing**: AI-based rate optimization
- **Mobile Integration**: GPS-based automatic plaza detection
- **Compliance Automation**: Automated audit trail generation
- **Multi-language Support**: Internationalization for global deployment

### Scalability Considerations
- **Database Sharding**: By region for large-scale deployments
- **Caching Layer**: Redis for frequently accessed plaza data
- **CDN Integration**: Static plaza data distribution
- **Microservices**: Separate plaza service for independent scaling

## Conclusion

The production-grade plaza management system provides comprehensive functionality for managing toll plazas in a blockchain-based toll collection system. With complete identification, location tracking, dynamic toll calculation, compliance monitoring, and analytics capabilities, it serves as a robust foundation for scalable toll management operations.

The system is designed with production requirements in mind, including data validation, security, performance optimization, and audit trails. The dummy data implementation provides immediate testing capabilities with realistic plaza configurations across major Indian highways.
