import { ethers, Contract, JsonRpcProvider } from 'ethers';
import { TollTransaction } from '../models/TollTransaction';
import { Vehicle } from '../models/Vehicle';

// Contract ABIs (simplified for demo)
const TOLL_COLLECTION_ABI = [
  "event VehicleRegistered(address indexed owner, string vehicleId, uint256 timestamp)",
  "event VehicleUpdated(address indexed owner, string vehicleId, uint256 timestamp)",
  "event VehicleRemoved(address indexed owner, string vehicleId, uint256 timestamp)",
  "event TollPaid(address indexed payer, string vehicleId, uint256 amount, uint256 tollId, bytes32 zkProofHash, uint256 timestamp)",
  "event VehicleBlacklisted(string vehicleId, bool isBlacklisted, uint256 timestamp)",
  "function registerVehicle(string memory vehicleId, address owner) external",
  "function updateVehicle(string memory vehicleId, address newOwner) external",
  "function removeVehicle(string memory vehicleId) external",
  "function processTollPayment(string memory vehicleId, bytes32 zkProofHash, uint256 amount) external",
  "function setVehicleBlacklistStatus(string memory vehicleId, bool isBlacklisted) external"
];

const ANON_AADHAAR_VERIFIER_ABI = [
  "event ProofVerified(address indexed user, bytes32 proofHash, bool isValid, uint256 timestamp)",
  "function verifyAnonAadhaarProof(bytes calldata proof, uint256[] calldata publicInputs, address userAddress) external returns (bool isValid)"
];

let provider: JsonRpcProvider;
let tollCollectionContract: Contract;
let anonAadhaarVerifierContract: Contract;

// Filter management
let eventFilters: Map<string, any> = new Map();
let pollingInterval: NodeJS.Timeout | null = null;
let isPolling = false;

export async function connectToBlockchain() {
  try {
    // Check if running in mock mode first
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_BLOCKCHAIN === 'true') {
      console.log('⚠️  Blockchain connection skipped - running in mock mode');
      return;
    }
    
    // Initialize provider - prioritize testnet Alchemy URLs
    const rpcUrl = process.env.ALCHEMY_SEPOLIA_URL || 
                   process.env.ALCHEMY_MUMBAI_URL || 
                   process.env.ALCHEMY_GOERLI_URL ||
                   process.env.ALCHEMY_POLYGON_URL || 
                   process.env.ALCHEMY_MAINNET_URL || 
                   process.env.SEPOLIA_RPC_URL ||
                   process.env.MUMBAI_RPC_URL || 
                   process.env.GOERLI_RPC_URL ||
                   process.env.POLYGON_RPC_URL || 
                   process.env.ETHEREUM_RPC_URL ||
                   'http://localhost:8545';
    provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get contract addresses from environment
    const tollCollectionAddress = process.env.TOLL_COLLECTION_ADDRESS;
    const anonAadhaarVerifierAddress = process.env.ANON_AADHAAR_VERIFIER_ADDRESS;
    
    if (!tollCollectionAddress || !anonAadhaarVerifierAddress) {
      throw new Error('Contract addresses not configured in environment variables');
    }
    
    // Initialize contracts
    tollCollectionContract = new Contract(
      tollCollectionAddress,
      TOLL_COLLECTION_ABI,
      provider
    );
    
    anonAadhaarVerifierContract = new Contract(
      anonAadhaarVerifierAddress,
      ANON_AADHAAR_VERIFIER_ABI,
      provider
    );
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('Blockchain connection established');
    console.log(`Toll Collection Contract: ${tollCollectionAddress}`);
    console.log(`Anon-Aadhaar Verifier: ${anonAadhaarVerifierAddress}`);
    
  } catch (error) {
    console.error('Failed to connect to blockchain:', error);
    throw error;
  }
}

async function setupEventListeners() {
  try {
    // Create filters for each event type
    const vehicleRegisteredFilter = await tollCollectionContract.filters.VehicleRegistered();
    const tollPaidFilter = await tollCollectionContract.filters.TollPaid();
    const vehicleBlacklistedFilter = await tollCollectionContract.filters.VehicleBlacklisted();
    
    // Store filters for cleanup
    eventFilters.set('VehicleRegistered', vehicleRegisteredFilter);
    eventFilters.set('TollPaid', tollPaidFilter);
    eventFilters.set('VehicleBlacklisted', vehicleBlacklistedFilter);
    
    // Start polling for events
    startEventPolling();
    
    console.log('Event listeners setup with manual polling');
  } catch (error) {
    console.error('Error setting up event listeners:', error);
    throw error;
  }
}

async function startEventPolling() {
  if (isPolling) {
    return; // Already polling
  }
  
  isPolling = true;
  console.log('Starting event polling...');
  
  // Poll every 5 seconds
  pollingInterval = setInterval(async () => {
    try {
      await pollForEvents();
    } catch (error) {
      console.error('Error during event polling:', error);
      // If we get filter errors, recreate the filters
      if (error instanceof Error && error.message.includes('filter not found')) {
        console.log('Recreating filters due to filter not found error...');
        await recreateFilters();
      }
    }
  }, 5000);
}

async function pollForEvents() {
  for (const [eventName, filter] of eventFilters) {
    try {
      const events = await tollCollectionContract.queryFilter(filter);
      
      for (const event of events) {
        await processEvent(eventName, event);
      }
    } catch (error) {
      // Handle filter not found errors gracefully
      if (error instanceof Error && error.message.includes('filter not found')) {
        console.log(`Filter for ${eventName} not found, will recreate on next cycle`);
        eventFilters.delete(eventName);
      } else {
        console.error(`Error polling ${eventName} events:`, error);
      }
    }
  }
}

async function processEvent(eventName: string, event: any) {
  try {
    switch (eventName) {
      case 'VehicleRegistered':
        await handleVehicleRegistered(event);
        break;
      case 'TollPaid':
        await handleTollPaid(event);
        break;
      case 'VehicleBlacklisted':
        await handleVehicleBlacklisted(event);
        break;
    }
  } catch (error) {
    console.error(`Error processing ${eventName} event:`, error);
  }
}

async function handleVehicleRegistered(event: any) {
  const [owner, vehicleId, timestamp] = event.args;
  console.log(`Vehicle registered: ${vehicleId} by ${owner}`);
  
  try {
    await Vehicle.findOneAndUpdate(
      { vehicleId },
      {
        vehicleId,
        owner,
        isActive: true,
        isBlacklisted: false,
        registrationTime: new Date(Number(timestamp) * 1000)
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error updating vehicle in database:', error);
  }
}

async function handleTollPaid(event: any) {
  const [payer, vehicleId, amount, tollId, zkProofHash, timestamp] = event.args;
  console.log(`Toll paid: ${amount} by ${payer} for vehicle ${vehicleId}`);
  
  try {
    const transaction = new TollTransaction({
      transactionId: `toll_${tollId}`,
      vehicleId,
      payer,
      amount: Number(ethers.formatEther(amount)),
      zkProofHash,
      status: 'confirmed',
      blockchainTxHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: new Date(Number(timestamp) * 1000)
    });
    
    await transaction.save();
    
    await Vehicle.findOneAndUpdate(
      { vehicleId },
      { lastTollTime: new Date(Number(timestamp) * 1000) }
    );
  } catch (error) {
    console.error('Error processing toll payment event:', error);
  }
}

async function handleVehicleBlacklisted(event: any) {
  const [vehicleId, isBlacklisted, timestamp] = event.args;
  console.log(`Vehicle ${vehicleId} blacklist status: ${isBlacklisted}`);
  
  try {
    await Vehicle.findOneAndUpdate(
      { vehicleId },
      { isBlacklisted }
    );
  } catch (error) {
    console.error('Error updating vehicle blacklist status:', error);
  }
}

async function recreateFilters() {
  try {
    console.log('Recreating event filters...');
    
    // Clear existing filters
    eventFilters.clear();
    
    // Recreate filters
    const vehicleRegisteredFilter = await tollCollectionContract.filters.VehicleRegistered();
    const tollPaidFilter = await tollCollectionContract.filters.TollPaid();
    const vehicleBlacklistedFilter = await tollCollectionContract.filters.VehicleBlacklisted();
    
    eventFilters.set('VehicleRegistered', vehicleRegisteredFilter);
    eventFilters.set('TollPaid', tollPaidFilter);
    eventFilters.set('VehicleBlacklisted', vehicleBlacklistedFilter);
    
    console.log('Event filters recreated successfully');
  } catch (error) {
    console.error('Error recreating filters:', error);
  }
}

function stopEventPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  isPolling = false;
  eventFilters.clear();
  console.log('Event polling stopped');
}

export async function verifyAnonAadhaarProof(proof: string, publicInputs: number[], userAddress: string): Promise<boolean> {
  try {
    // Mock implementation for development/testing
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_BLOCKCHAIN === 'true') {
      console.log('⚠️  Using mock anon-Aadhaar verification');
      // Accept any proof that starts with '0x' and has valid format
      return proof.startsWith('0x') && proof.length >= 10 && publicInputs.length >= 2;
    }
    
    if (!anonAadhaarVerifierContract) {
      throw new Error('Anon-Aadhaar verifier contract not initialized');
    }
    
    // Convert proof to bytes
    const proofBytes = ethers.getBytes(proof);
    
    // Call the verification function
    const isValid = await anonAadhaarVerifierContract.verifyAnonAadhaarProof(
      proofBytes,
      publicInputs,
      userAddress
    );
    
    return isValid;
  } catch (error) {
    console.error('Error verifying anon-Aadhaar proof:', error);
    return false;
  }
}

export async function getContractBalance(): Promise<string> {
  try {
    if (!tollCollectionContract) {
      throw new Error('Toll collection contract not initialized');
    }
    
    const balance = await provider.getBalance(await tollCollectionContract.getAddress());
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Error getting contract balance:', error);
    return '0';
  }
}

export function getProvider(): JsonRpcProvider {
  return provider;
}

export function getTollCollectionContract(): Contract {
  return tollCollectionContract;
}

export function getAnonAadhaarVerifierContract(): Contract {
  return anonAadhaarVerifierContract;
}

export function cleanupBlockchainConnection() {
  console.log('Cleaning up blockchain connection...');
  stopEventPolling();
}

// Default export for the blockchain service
const blockchainService = {
  connectToBlockchain,
  verifyAnonAadhaarProof,
  getContractBalance,
  getProvider,
  getTollCollectionContract,
  getAnonAadhaarVerifierContract,
  cleanupBlockchainConnection
};

export default blockchainService;
