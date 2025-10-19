#!/usr/bin/env node

/**
 * Test script to verify that top-up wallets are not recreated
 * This script simulates the wallet creation flow to ensure persistence
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

// Mock user data
const testUser = {
  address: '0x1234567890123456789012345678901234567890',
  sessionToken: 'test_session_token_' + Date.now()
};

async function testWalletPersistence() {
  console.log('🧪 Testing Top-up Wallet Persistence...\n');

  try {
    // Test 1: Create wallet for the first time
    console.log('1️⃣ Creating wallet for the first time...');
    const createResponse1 = await axios.post(`${API_BASE_URL}/api/topup-wallet/create`, {}, {
      headers: {
        'X-Session-Token': testUser.sessionToken,
        'X-User-Address': testUser.address,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ First creation response:', {
      success: createResponse1.data.success,
      walletAddress: createResponse1.data.walletAddress,
      message: createResponse1.data.message
    });

    const firstWalletAddress = createResponse1.data.walletAddress;

    // Test 2: Try to create wallet again (should retrieve existing)
    console.log('\n2️⃣ Attempting to create wallet again...');
    const createResponse2 = await axios.post(`${API_BASE_URL}/api/topup-wallet/create`, {}, {
      headers: {
        'X-Session-Token': testUser.sessionToken,
        'X-User-Address': testUser.address,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Second creation response:', {
      success: createResponse2.data.success,
      walletAddress: createResponse2.data.walletAddress,
      message: createResponse2.data.message
    });

    // Test 3: Check if wallet exists
    console.log('\n3️⃣ Checking if wallet exists...');
    const existsResponse = await axios.get(`${API_BASE_URL}/api/topup-wallet/exists`, {
      headers: {
        'X-Session-Token': testUser.sessionToken,
        'X-User-Address': testUser.address
      }
    });

    console.log('✅ Exists check response:', {
      exists: existsResponse.data.exists
    });

    // Test 4: Get wallet info
    console.log('\n4️⃣ Getting wallet info...');
    const infoResponse = await axios.get(`${API_BASE_URL}/api/topup-wallet/info`, {
      headers: {
        'X-Session-Token': testUser.sessionToken,
        'X-User-Address': testUser.address
      }
    });

    console.log('✅ Wallet info response:', {
      walletAddress: infoResponse.data.walletAddress,
      balance: infoResponse.data.balance,
      isInitialized: infoResponse.data.isInitialized
    });

    // Verify results
    console.log('\n📊 Test Results:');
    console.log('================');
    
    const walletsMatch = firstWalletAddress === createResponse2.data.walletAddress;
    const walletExists = existsResponse.data.exists;
    const infoRetrieved = infoResponse.data.walletAddress === firstWalletAddress;
    
    console.log(`✅ Wallet addresses match: ${walletsMatch ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Wallet exists check: ${walletExists ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Wallet info retrieval: ${infoRetrieved ? 'PASS' : 'FAIL'}`);
    
    if (walletsMatch && walletExists && infoRetrieved) {
      console.log('\n🎉 All tests PASSED! Wallet persistence is working correctly.');
      console.log('   - Wallets are not recreated on subsequent requests');
      console.log('   - Existing wallets are properly retrieved from database');
      console.log('   - Wallet information is consistently available');
    } else {
      console.log('\n❌ Some tests FAILED! Check the implementation.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
    
    if (error.response?.status === 503) {
      console.log('\n💡 Hint: Make sure the backend server is running and the TopUp Wallet Service is properly configured.');
    }
  }
}

// Run the test
if (require.main === module) {
  testWalletPersistence();
}

module.exports = { testWalletPersistence };
