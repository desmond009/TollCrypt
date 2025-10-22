const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

// Simple dummy plazas that match the frontend interface
const dummyPlazas = [
  {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

async function addDummyPlazas() {
  try {
    console.log('Adding dummy plazas via API...');
    
    for (const plaza of dummyPlazas) {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/admin/plazas`, plaza, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          console.log(`✅ Created plaza: ${plaza.name}`);
        } else {
          console.log(`❌ Failed to create plaza: ${plaza.name} - ${response.data.message}`);
        }
      } catch (error) {
        if (error.response) {
          console.log(`❌ Failed to create plaza: ${plaza.name} - ${error.response.data.message || error.response.statusText}`);
        } else {
          console.log(`❌ Failed to create plaza: ${plaza.name} - ${error.message}`);
        }
      }
    }
    
    console.log('\n🎉 Dummy plazas addition completed!');
    console.log('You can now refresh the admin dashboard to see the plazas.');
    
  } catch (error) {
    console.error('Error adding dummy plazas:', error.message);
  }
}

addDummyPlazas();
