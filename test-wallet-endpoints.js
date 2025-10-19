#!/usr/bin/env node

/**
 * Test script to verify wallet endpoints are working
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

// Test user data
const testUser = {
  address: '0x1234567890123456789012345678901234567890',
  sessionToken: 'anon_test_' + Date.now()
};

async function testWalletEndpoints() {
  console.log('🧪 Testing Wallet Endpoints...\n');

  try {
    // Test 1: Test exists endpoint
    console.log('1️⃣ Testing /exists endpoint...');
    try {
      const existsResponse = await axios.get(`${API_BASE_URL}/api/topup-wallet/exists`, {
        headers: {
          'X-Session-Token': testUser.sessionToken,
          'X-User-Address': testUser.address
        }
      });
      console.log('✅ /exists endpoint working:', existsResponse.data);
    } catch (error) {
      console.log('❌ /exists endpoint error:', error.response?.status, error.response?.data?.error || error.message);
    }

    // Test 2: Test info endpoint
    console.log('\n2️⃣ Testing /info endpoint...');
    try {
      const infoResponse = await axios.get(`${API_BASE_URL}/api/topup-wallet/info`, {
        headers: {
          'X-Session-Token': testUser.sessionToken,
          'X-User-Address': testUser.address
        }
      });
      console.log('✅ /info endpoint working:', infoResponse.data);
    } catch (error) {
      console.log('❌ /info endpoint error:', error.response?.status, error.response?.data?.error || error.message);
    }

    // Test 3: Test debug endpoint
    console.log('\n3️⃣ Testing /debug endpoint...');
    try {
      const debugResponse = await axios.get(`${API_BASE_URL}/api/topup-wallet/debug`, {
        headers: {
          'X-Session-Token': testUser.sessionToken,
          'X-User-Address': testUser.address
        }
      });
      console.log('✅ /debug endpoint working:', JSON.stringify(debugResponse.data, null, 2));
    } catch (error) {
      console.log('❌ /debug endpoint error:', error.response?.status, error.response?.data?.error || error.message);
    }

    // Test 4: Test create endpoint
    console.log('\n4️⃣ Testing /create endpoint...');
    try {
      const createResponse = await axios.post(`${API_BASE_URL}/api/topup-wallet/create`, {}, {
        headers: {
          'X-Session-Token': testUser.sessionToken,
          'X-User-Address': testUser.address,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ /create endpoint working:', createResponse.data);
    } catch (error) {
      console.log('❌ /create endpoint error:', error.response?.status, error.response?.data?.error || error.message);
    }

    console.log('\n📊 Test Summary:');
    console.log('================');
    console.log('If all endpoints return 404, the backend server is not running.');
    console.log('If endpoints return 401, there might be an authentication issue.');
    console.log('If endpoints return 503, the TopUp Wallet Service is not configured.');
    console.log('If endpoints work, the wallet persistence system is functioning correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Backend server is not running. Please start it with:');
      console.log('   cd backend && npm run dev');
    }
  }
}

// Run the test
if (require.main === module) {
  testWalletEndpoints();
}

module.exports = { testWalletEndpoints };
