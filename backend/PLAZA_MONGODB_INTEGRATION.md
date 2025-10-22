# Plaza Management - MongoDB Integration

This document explains how plaza data is stored and managed in MongoDB for the TollChain admin dashboard.

## Overview

The TollChain system uses two MongoDB collections for plaza management:

1. **SimplePlaza Collection** - Used by the admin dashboard for simplified plaza management
2. **TollPlaza Collection** - Used by the comprehensive system for detailed plaza information

## Collections

### SimplePlaza Collection
- **Purpose**: Admin dashboard plaza management
- **Model**: `src/models/SimplePlaza.ts`
- **Interface**: Simplified plaza data structure
- **Used by**: Admin dashboard frontend

### TollPlaza Collection
- **Purpose**: Comprehensive plaza system
- **Model**: `src/models/TollPlaza.ts`
- **Interface**: Detailed plaza data with compliance, analytics, and operational metadata
- **Used by**: Full system operations

## Seeding Scripts

### Available Scripts

```bash
# Seed only SimplePlaza collection (for admin dashboard)
npm run seed:simple-plazas

# Seed only TollPlaza collection (comprehensive system)
npm run seed:plazas

# Seed both collections with synchronized data
npm run seed:all-plazas

# Seed basic database (admin users, system config)
npm run seed
```

### Recommended Approach

For the admin dashboard to work properly with MongoDB data, use:

```bash
npm run seed:all-plazas
```

This script will:
- Clear existing plaza data from both collections
- Create synchronized plaza records in both collections
- Ensure the admin dashboard displays data from MongoDB
- Provide comprehensive plaza data for the full system

## Plaza Data Structure

### SimplePlaza (Admin Dashboard)
```typescript
{
  id: string;
  name: string;
  location: string;
  coordinates: { lat: number; lng: number };
  status: 'active' | 'maintenance' | 'inactive';
  tollRates: {
    '2-wheeler': number;
    '4-wheeler': number;
    'car': number;
    'lcv': number;
    'hcv': number;
    'truck': number;
    'bus': number;
  };
  operatingHours: { start: string; end: string };
  assignedOperators: string[];
  todayTransactions: number;
  todayRevenue: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### TollPlaza (Comprehensive System)
```typescript
{
  identification: PlazaIdentification;
  location: LocationData;
  tollRates: TollRateStructure;
  operational: OperationalMetadata;
  compliance: ComplianceAudit;
  status: PlazaStatus;
  assignedOperators: string[];
  analytics: {
    todayTransactions: number;
    todayRevenue: number;
    monthlyTransactions: number;
    monthlyRevenue: number;
    averageTransactionTime: number;
    peakHourTraffic: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

The admin dashboard uses these endpoints to interact with plaza data:

- `GET /api/admin/plazas` - Get all plazas (from SimplePlaza collection)
- `POST /api/admin/plazas` - Create new plaza (saves to SimplePlaza collection)
- `PUT /api/admin/plazas/:id` - Update plaza (updates SimplePlaza collection)
- `DELETE /api/admin/plazas/:id` - Delete plaza (removes from SimplePlaza collection)

## Future Plaza Creation

When creating new plazas through the admin dashboard:

1. **Frontend**: Admin dashboard form submits plaza data
2. **Backend**: API endpoint receives data and saves to SimplePlaza collection
3. **Database**: MongoDB stores the plaza data
4. **Real-time**: Socket.io broadcasts plaza creation to all connected admins
5. **Sync**: Optionally sync with TollPlaza collection for comprehensive data

## Data Synchronization

The seeding scripts ensure both collections have synchronized data:

- **SimplePlaza**: Contains essential data for admin dashboard
- **TollPlaza**: Contains comprehensive data for full system operations
- **Consistency**: Both collections reference the same plaza locations and basic information

## Running the Scripts

### Prerequisites
- MongoDB running on `mongodb://localhost:27017/tollchain`
- Backend dependencies installed (`npm install`)
- TypeScript compilation (`npm run build`)

### Quick Start
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Seed all plaza collections
npm run seed:all-plazas

# Start the backend server
npm run dev
```

### Verification
After running the seeding script, you can verify the data:

1. **Admin Dashboard**: Refresh the admin dashboard to see plazas loaded from MongoDB
2. **MongoDB Compass**: Connect to `mongodb://localhost:27017/tollchain` and check:
   - `simpleplazas` collection
   - `tollplazas` collection
3. **API Testing**: Use `GET /api/admin/plazas` to verify data is accessible

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in scripts
   - Verify database permissions

2. **TypeScript Compilation Error**
   - Run `npm run build` first
   - Check for missing dependencies
   - Verify TypeScript configuration

3. **Admin Dashboard Not Showing Data**
   - Run `npm run seed:simple-plazas` specifically
   - Check browser network tab for API calls
   - Verify backend server is running

4. **Data Not Persisting**
   - Check MongoDB logs for errors
   - Verify database write permissions
   - Ensure no duplicate key constraints

### Reset Data
To completely reset plaza data:

```bash
# Clear and reseed all plaza collections
npm run seed:all-plazas
```

This will remove all existing plaza data and create fresh records.

## Development Notes

- **Hot Reload**: Backend supports hot reload with `npm run dev`
- **Database**: MongoDB collections are automatically created when first accessed
- **Indexes**: Both collections have appropriate indexes for performance
- **Validation**: Schema validation ensures data integrity
- **Real-time**: Socket.io integration provides real-time updates

## Production Considerations

For production deployment:

1. **Environment Variables**: Set `MONGODB_URI` for production database
2. **Data Migration**: Use migration scripts for existing data
3. **Backup**: Implement regular MongoDB backups
4. **Monitoring**: Monitor collection sizes and query performance
5. **Security**: Ensure proper database access controls
