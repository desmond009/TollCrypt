#!/usr/bin/env node

/**
 * Wallet Connection Test Script
 * 
 * This script helps test wallet connections and identify extension conflicts
 * Run with: node test-wallet-connection.js
 */

const { ethers } = require('ethers');

console.log('🔍 Wallet Connection Test Script');
console.log('================================\n');

// Test 1: Check for multiple ethereum providers
function testEthereumProviders() {
  console.log('1. Testing Ethereum Providers...');
  
  if (typeof window !== 'undefined' && window.ethereum) {
    const providers = window.ethereum.providers || [window.ethereum];
    console.log(`   Found ${providers.length} Ethereum provider(s)`);
    
    providers.forEach((provider, index) => {
      console.log(`   Provider ${index + 1}:`, {
        isMetaMask: provider.isMetaMask,
        isCoinbaseWallet: provider.isCoinbaseWallet,
        isTrust: provider.isTrust,
        isRainbow: provider.isRainbow
      });
    });
    
    if (providers.length > 1) {
      console.log('   ⚠️  Multiple providers detected - this may cause conflicts');
    } else {
      console.log('   ✅ Single provider detected - good');
    }
  } else {
    console.log('   ❌ No Ethereum provider found');
  }
  console.log('');
}

// Test 2: Check for extension conflicts
function testExtensionConflicts() {
  console.log('2. Testing Extension Conflicts...');
  
  const conflictIndicators = [
    'Invalid runtime',
    'content_script.js',
    'origins don\'t match',
    'Magic.link',
    'WalletConnect'
  ];
  
  let conflictsFound = 0;
  
  // Override console.error to catch extension errors
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    conflictIndicators.forEach(indicator => {
      if (message.includes(indicator)) {
        conflictsFound++;
        console.log(`   ⚠️  Conflict detected: ${indicator}`);
      }
    });
    originalError.apply(console, args);
  };
  
  // Simulate some operations that might trigger conflicts
  if (typeof window !== 'undefined') {
    try {
      // Try to access ethereum
      if (window.ethereum) {
        window.ethereum.request({ method: 'eth_accounts' }).catch(() => {});
      }
    } catch (error) {
      console.log(`   ⚠️  Error accessing ethereum: ${error.message}`);
    }
  }
  
  if (conflictsFound === 0) {
    console.log('   ✅ No extension conflicts detected');
  } else {
    console.log(`   ⚠️  ${conflictsFound} conflict(s) detected`);
  }
  
  // Restore original console.error
  console.error = originalError;
  console.log('');
}

// Test 3: Check wallet connection
async function testWalletConnection() {
  console.log('3. Testing Wallet Connection...');
  
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      
      if (accounts.length > 0) {
        console.log(`   ✅ Wallet connected: ${accounts[0].address}`);
        
        // Test network
        const network = await provider.getNetwork();
        console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
        
        // Test balance
        const balance = await provider.getBalance(accounts[0].address);
        console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
      } else {
        console.log('   ⚠️  Wallet installed but not connected');
      }
    } catch (error) {
      console.log(`   ❌ Wallet connection failed: ${error.message}`);
    }
  } else {
    console.log('   ❌ No wallet detected');
  }
  console.log('');
}

// Test 4: Check browser environment
function testBrowserEnvironment() {
  console.log('4. Testing Browser Environment...');
  
  if (typeof window !== 'undefined') {
    console.log(`   User Agent: ${navigator.userAgent}`);
    console.log(`   Origin: ${window.location.origin}`);
    console.log(`   Protocol: ${window.location.protocol}`);
    
    // Check for common wallet extensions
    const walletExtensions = {
      'MetaMask': window.ethereum?.isMetaMask,
      'Coinbase': window.ethereum?.isCoinbaseWallet,
      'Trust': window.ethereum?.isTrust,
      'Rainbow': window.ethereum?.isRainbow
    };
    
    console.log('   Detected Extensions:');
    Object.entries(walletExtensions).forEach(([name, detected]) => {
      console.log(`     ${name}: ${detected ? '✅' : '❌'}`);
    });
  } else {
    console.log('   ❌ Not running in browser environment');
  }
  console.log('');
}

// Test 5: Provide recommendations
function provideRecommendations() {
  console.log('5. Recommendations...');
  
  if (typeof window !== 'undefined') {
    const providers = window.ethereum?.providers || (window.ethereum ? [window.ethereum] : []);
    
    if (providers.length > 1) {
      console.log('   🔧 Multiple wallet extensions detected:');
      console.log('      - Disable unused wallet extensions');
      console.log('      - Keep only one primary wallet active');
      console.log('      - Refresh the page after disabling extensions');
    }
    
    if (!window.ethereum) {
      console.log('   🔧 No wallet extension detected:');
      console.log('      - Install MetaMask or another wallet extension');
      console.log('      - Make sure the extension is enabled');
    }
    
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      console.log('   🔧 Security warning:');
      console.log('      - Using HTTP instead of HTTPS');
      console.log('      - Some wallets may not work on HTTP sites');
    }
  }
  
  console.log('   📖 For more help, see BROWSER_EXTENSION_CONFLICTS.md');
  console.log('');
}

// Run all tests
async function runTests() {
  testEthereumProviders();
  testExtensionConflicts();
  await testWalletConnection();
  testBrowserEnvironment();
  provideRecommendations();
  
  console.log('✅ Wallet connection test completed');
}

// Run tests if in browser environment
if (typeof window !== 'undefined') {
  runTests().catch(console.error);
} else {
  console.log('❌ This script must be run in a browser environment');
  console.log('   Open browser console and paste the script content');
}
