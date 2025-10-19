#!/usr/bin/env node

/**
 * Debug script to help identify and fix the wallet existence issue
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

// You'll need to replace this with your actual user address and session token
const testUser = {
  address: 'YOUR_WALLET_ADDRESS_HERE', // Replace with your actual wallet address
  sessionToken: 'YOUR_SESSION_TOKEN_HERE' // Replace with your actual session token
};

async function debugWalletIssue() {
  console.log('🔍 Debugging Wallet Existence Issue...\n');

  if (testUser.address === 'YOUR_WALLET_ADDRESS_HERE') {
    console.log('❌ Please update the testUser object with your actual wallet address and session token');
    console.log('   Edit this file and replace YOUR_WALLET_ADDRESS_HERE and YOUR_SESSION_TOKEN_HERE');
    return;
  }

  try {
    // Test 1: Check debug endpoint
    console.log('1️⃣ Checking debug endpoint...');
    const debugResponse = await axios.get(`${API_BASE_URL}/api/topup-wallet/debug`, {
      headers: {
        'X-Session-Token': testUser.sessionToken,
        'X-User-Address': testUser.address
      }
    });

    console.log('✅ Debug response:', JSON.stringify(debugResponse.data, null, 2));

    // Test 2: Check exists endpoint
    console.log('\n2️⃣ Checking exists endpoint...');
    const existsResponse = await axios.get(`${API_BASE_URL}/api/topup-wallet/exists`, {
      headers: {
        'X-Session-Token': testUser.sessionToken,
        'X-User-Address': testUser.address
      }
    });

    console.log('✅ Exists response:', existsResponse.data);

    // Test 3: Check info endpoint
    console.log('\n3️⃣ Checking info endpoint...');
    try {
      const infoResponse = await axios.get(`${API_BASE_URL}/api/topup-wallet/info`, {
        headers: {
          'X-Session-Token': testUser.sessionToken,
          'X-User-Address': testUser.address
        }
      });
      console.log('✅ Info response:', infoResponse.data);
    } catch (error) {
      console.log('❌ Info endpoint error:', error.response?.data || error.message);
    }

    // Analysis
    console.log('\n📊 Analysis:');
    console.log('============');
    
    const debug = debugResponse.data;
    
    if (debug.database.userFound) {
      console.log('✅ User found in database');
      if (debug.database.topUpWalletAddress) {
        console.log('✅ Top-up wallet address stored in database:', debug.database.topUpWalletAddress);
      } else {
        console.log('❌ No top-up wallet address in database');
      }
    } else {
      console.log('❌ User not found in database');
    }
    
    if (debug.blockchain.exists) {
      console.log('✅ Wallet exists on blockchain');
      if (debug.blockchain.walletInfo) {
        console.log('✅ Wallet info retrieved from blockchain:', debug.blockchain.walletInfo.walletAddress);
      }
    } else {
      console.log('❌ Wallet does not exist on blockchain');
    }
    
    if (debug.mock.exists) {
      console.log('✅ Wallet exists in mock storage');
    } else {
      console.log('ℹ️  No mock wallet (this is normal for production)');
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('===================');
    
    if (!debug.database.userFound) {
      console.log('🔧 User not found in database - you may need to authenticate again');
    } else if (!debug.database.topUpWalletAddress && debug.blockchain.exists) {
      console.log('🔧 Wallet exists on blockchain but not in database - the system should auto-fix this');
      console.log('   Try calling the /exists endpoint again to trigger the database update');
    } else if (!debug.blockchain.exists) {
      console.log('🔧 Wallet does not exist on blockchain - you may need to create a new wallet');
    } else {
      console.log('✅ Everything looks good! The issue might be resolved now.');
    }

  } catch (error) {
    console.error('❌ Debug failed with error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Hint: Authentication failed. Make sure you have a valid session token.');
    } else if (error.response?.status === 503) {
      console.log('\n💡 Hint: Backend service not available. Make sure the server is running.');
    }
  }
}

// Run the debug
if (require.main === module) {
  debugWalletIssue();
}

module.exports = { debugWalletIssue };
