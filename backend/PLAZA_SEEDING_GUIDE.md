# Plaza Seeding Implementation Guide

This document explains the plaza seeding functionality that has been implemented in the TollChain backend system.

## Overview

The plaza seeding functionality allows administrators to populate the database with predefined toll plaza data, making it easier to set up and test the system. Two types of plaza models are supported:

1. **TollPlaza** - Full-featured plaza model with comprehensive data
2. **SimplePlaza** - Simplified plaza model for admin dashboard

## API Endpoints

### TollPlaza Seeding Endpoints

#### 1. Seed Indian Plazas
```http
POST /api/plazas/seed/indian
Authorization: Bearer <admin_token>
```

**Description**: Seeds the database with 5 predefined Indian toll plazas including:
- Mumbai-Pune Expressway - Khalapur Plaza (Maharashtra)
- Bangalore-Mysore Highway - Ramanagara Plaza (Karnataka)
- Chennai-Bangalore Highway - Krishnagiri Plaza (Tamil Nadu)
- Ahmedabad-Vadodara Expressway - Anand Plaza (Gujarat)
- Delhi-Gurgaon Expressway - Kherki Daula Plaza (Haryana)

**Response**:
```json
{
  "success": true,
  "message": "Seeding completed. 5 plazas created successfully, 0 failed.",
  "data": {
    "success": 5,
    "failed": 0,
    "errors": []
  }
}
```

#### 2. Seed Custom Plazas
```http
POST /api/plazas/seed/custom
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "plazas": [
    {
      "identification": {
        "uniqueId": "PLAZA-STATE-001",
        "name": "Highway Name - Plaza Name",
        "regionCode": "ST-AB",
        "operatorName": "Operator Name",
        "licenseNumber": "LIC-001"
      },
      "location": {
        "gpsCoordinates": {
          "latitude": 12.3456,
          "longitude": 78.9012
        },
        "physicalAddress": {
          "street": "Highway Name",
          "city": "City Name",
          "state": "State Name",
          "postalCode": "123456",
          "country": "India"
        },
        "nearestLandmark": "Landmark Name",
        "travelDirection": "north"
      },
      "tollRates": {
        "vehicleCategories": {
          "2-wheeler": 0.0001,
          "4-wheeler": 0.0003,
          "lcv": 0.0005,
          "hcv": 0.0008,
          "bus": 0.0006,
          "mav": 0.0012
        },
        "timeBasedMultipliers": {
          "peakHourMultiplier": 1.5,
          "offPeakMultiplier": 1.0,
          "peakHours": {
            "start": "07:00",
            "end": "19:00"
          }
        },
        "discountCodes": [],
        "returnJourneyValidity": 24
      },
      "operational": {
        "operatingHours": {
          "is24x7": true
        },
        "laneConfiguration": {
          "totalLanes": 8,
          "etcEnabledLanes": 6,
          "manualLanes": 2
        },
        "paymentMethods": ["eth_wallet", "polygon_wallet", "upi"],
        "smartContractAddress": "0x1234567890123456789012345678901234567890",
        "lastRateRevisionDate": "2024-01-01T00:00:00.000Z",
        "nextRevisionDate": "2025-01-01T00:00:00.000Z"
      },
      "compliance": {
        "governmentAuthorizationNumber": "GOV-ST-2024-001",
        "taxId": "12ABCDE1234F1Z5",
        "auditTrailHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        "rateApprovalDocumentHash": "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
        "complianceStatus": "compliant",
        "lastAuditDate": "2024-01-01T00:00:00.000Z",
        "nextAuditDate": "2024-07-01T00:00:00.000Z"
      }
    }
  ]
}
```

#### 3. Clear All Plazas
```http
DELETE /api/plazas/seed/clear
Authorization: Bearer <admin_token>
```

**Description**: Removes all toll plazas from the database (for testing purposes).

#### 4. Get Seeding Statistics
```http
GET /api/plazas/seed/stats
Authorization: Bearer <admin_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalPlazas": 5,
    "activePlazas": 5,
    "inactivePlazas": 0,
    "maintenancePlazas": 0,
    "regions": ["MH-PU", "KA-BG", "TN-CH", "GJ-AH", "DL-GG"]
  }
}
```

### SimplePlaza Seeding Endpoints

#### 1. Seed Predefined Simple Plazas
```http
POST /api/simple-plazas/seed/predefined
Authorization: Bearer <admin_token>
```

**Description**: Seeds the database with 8 predefined simple plazas for the admin dashboard.

#### 2. Seed Custom Simple Plazas
```http
POST /api/simple-plazas/seed/custom
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "plazas": [
    {
      "id": "SIMPLE-ST-001",
      "name": "Highway Name - Plaza Name",
      "location": "City, State",
      "coordinates": {
        "lat": 12.3456,
        "lng": 78.9012
      },
      "status": "active",
      "tollRates": {
        "2-wheeler": 0.0001,
        "4-wheeler": 0.0003,
        "car": 0.0003,
        "lcv": 0.0005,
        "hcv": 0.0008,
        "truck": 0.0008,
        "bus": 0.0006
      },
      "operatingHours": {
        "start": "06:00",
        "end": "22:00"
      },
      "todayTransactions": 0,
      "todayRevenue": 0
    }
  ]
}
```

#### 3. Clear All Simple Plazas
```http
DELETE /api/simple-plazas/seed/clear
Authorization: Bearer <admin_token>
```

#### 4. Get Simple Plaza Statistics
```http
GET /api/simple-plazas/seed/stats
Authorization: Bearer <admin_token>
```

## Usage Examples

### Using cURL

#### Seed Indian Plazas
```bash
curl -X POST http://localhost:3001/api/plazas/seed/indian \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### Seed Simple Plazas
```bash
curl -X POST http://localhost:3001/api/simple-plazas/seed/predefined \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### Check Statistics
```bash
curl -X GET http://localhost:3001/api/plazas/seed/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Using JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';
const ADMIN_TOKEN = 'your_admin_token';

// Seed Indian plazas
async function seedIndianPlazas() {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/plazas/seed/indian`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Seeding result:', response.data);
  } catch (error) {
    console.error('Error seeding plazas:', error.response?.data || error.message);
  }
}

// Seed simple plazas
async function seedSimplePlazas() {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/simple-plazas/seed/predefined`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Simple plaza seeding result:', response.data);
  } catch (error) {
    console.error('Error seeding simple plazas:', error.response?.data || error.message);
  }
}

// Get statistics
async function getStats() {
  try {
    const [tollStats, simpleStats] = await Promise.all([
      axios.get(`${API_BASE_URL}/plazas/seed/stats`, {
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
      }),
      axios.get(`${API_BASE_URL}/simple-plazas/seed/stats`, {
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
      })
    ]);
    
    console.log('Toll Plaza Stats:', tollStats.data);
    console.log('Simple Plaza Stats:', simpleStats.data);
  } catch (error) {
    console.error('Error getting stats:', error.response?.data || error.message);
  }
}

// Run the functions
seedIndianPlazas();
seedSimplePlazas();
getStats();
```

## Data Structure Details

### TollPlaza Model Features

- **Comprehensive Identification**: Unique ID, name, region code, operator details
- **Detailed Location Data**: GPS coordinates, physical address, landmarks
- **Flexible Toll Rates**: Vehicle-specific rates with time-based multipliers
- **Operational Metadata**: Lane configuration, payment methods, smart contract integration
- **Compliance Tracking**: Government authorization, tax ID, audit trails
- **Analytics Support**: Transaction and revenue tracking

### SimplePlaza Model Features

- **Simplified Structure**: Basic plaza information for dashboard display
- **Essential Data**: ID, name, location, coordinates, status
- **Toll Rates**: Vehicle-specific rates in a simplified format
- **Operating Hours**: Start and end times
- **Transaction Tracking**: Daily transaction and revenue counters

## Security Considerations

- All seeding endpoints require admin authentication
- Only super admins can perform seeding operations
- Clear operations are restricted to super admins only
- All operations are logged and can be audited

## Error Handling

The seeding functions include comprehensive error handling:

- Individual plaza creation failures don't stop the entire process
- Detailed error messages are provided for each failure
- Success and failure counts are returned
- Database constraints are validated before creation

## Best Practices

1. **Test Environment**: Always test seeding in a development environment first
2. **Backup Data**: Create database backups before clearing existing data
3. **Incremental Seeding**: Use custom seeding for additional plazas rather than clearing and re-seeding
4. **Validation**: Verify seeded data through the statistics endpoints
5. **Monitoring**: Monitor the seeding process for any errors or issues

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure you're using a valid admin token with super_admin role
2. **Validation Errors**: Check that all required fields are provided and properly formatted
3. **Duplicate Errors**: Ensure unique IDs and license numbers are not already in use
4. **Database Connection**: Verify MongoDB connection is active

### Debug Steps

1. Check the API response for detailed error messages
2. Verify admin token permissions
3. Validate data format against the model schemas
4. Check database connectivity and permissions
5. Review server logs for additional error details

## Integration with Frontend

The seeded plaza data can be accessed through the existing plaza endpoints:

- `GET /api/plazas` - List all toll plazas
- `GET /api/simple-plazas` - List all simple plazas
- `GET /api/plazas/:uniqueId` - Get specific plaza details
- `GET /api/simple-plazas/:id` - Get specific simple plaza details

This allows the frontend applications to display and interact with the seeded plaza data seamlessly.
