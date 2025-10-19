#!/usr/bin/env node

/**
 * Test script to check if backend is running and accessible
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function testBackendConnection() {
  console.log('🔍 Testing Backend Connection...\n');

  try {
    // Test 1: Check if backend is running
    console.log('1️⃣ Testing basic backend connectivity...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 });
      console.log('✅ Backend is running:', healthResponse.status);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Backend server is not running on', API_BASE_URL);
        console.log('💡 Please start the backend server with: npm run dev (in backend directory)');
        return;
      } else if (error.response?.status === 404) {
        console.log('⚠️  Backend is running but /api/health endpoint not found');
      } else {
        console.log('⚠️  Backend connection issue:', error.message);
      }
    }

    // Test 2: Check if topup-wallet routes are accessible
    console.log('\n2️⃣ Testing topup-wallet routes...');
    try {
      const routesResponse = await axios.get(`${API_BASE_URL}/api/topup-wallet/debug`, { 
        timeout: 5000,
        headers: {
          'X-Session-Token': 'test_token',
          'X-User-Address': '0x1234567890123456789012345678901234567890'
        }
      });
      console.log('✅ Topup-wallet routes are accessible');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Topup-wallet routes are accessible (authentication required)');
      } else if (error.response?.status === 404) {
        console.log('❌ Topup-wallet routes not found - check route registration');
      } else {
        console.log('⚠️  Topup-wallet routes issue:', error.response?.status, error.response?.data?.error || error.message);
      }
    }

    // Test 3: Check other API endpoints
    console.log('\n3️⃣ Testing other API endpoints...');
    const endpoints = [
      '/api/vehicles',
      '/api/toll',
      '/api/admin',
      '/api/qr',
      '/api/aadhaar'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, { timeout: 3000 });
        console.log(`✅ ${endpoint} - Status: ${response.status}`);
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 404) {
          console.log(`✅ ${endpoint} - Accessible (${error.response.status})`);
        } else {
          console.log(`⚠️  ${endpoint} - Issue: ${error.response?.status || error.message}`);
        }
      }
    }

    // Test 4: Check environment variables
    console.log('\n4️⃣ Checking environment configuration...');
    try {
      const envResponse = await axios.get(`${API_BASE_URL}/api/topup-wallet/debug`, {
        headers: {
          'X-Session-Token': 'test_token',
          'X-User-Address': '0x1234567890123456789012345678901234567890'
        }
      });
      
      if (envResponse.data.environment) {
        console.log('✅ Environment info:', envResponse.data.environment);
      }
    } catch (error) {
      console.log('⚠️  Could not get environment info');
    }

    console.log('\n📊 Summary:');
    console.log('============');
    console.log('If you see 404 errors for /api/topup-wallet/info, the issue is likely:');
    console.log('1. Backend server not running - Start with: npm run dev (in backend directory)');
    console.log('2. Authentication issue - Check session token and user address');
    console.log('3. Service configuration - Check environment variables for blockchain service');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testBackendConnection();
}

module.exports = { testBackendConnection };
