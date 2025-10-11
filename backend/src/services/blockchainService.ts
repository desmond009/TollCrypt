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

function setupEventListeners() {
  // Listen for vehicle registration events
  tollCollectionContract.on('VehicleRegistered', async (owner: string, vehicleId: string, timestamp: bigint, event: any) => {
    console.log(`Vehicle registered: ${vehicleId} by ${owner}`);
    
    try {
      // Update local database
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
  });

  // Listen for toll payment events
  tollCollectionContract.on('TollPaid', async (payer: string, vehicleId: string, amount: bigint, tollId: bigint, zkProofHash: string, timestamp: bigint, event: any) => {
    console.log(`Toll paid: ${amount} by ${payer} for vehicle ${vehicleId}`);
    
    try {
      // Create transaction record
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
      
      // Update vehicle's last toll time
      await Vehicle.findOneAndUpdate(
        { vehicleId },
        { lastTollTime: new Date(Number(timestamp) * 1000) }
      );
      
    } catch (error) {
      console.error('Error processing toll payment event:', error);
    }
  });

  // Listen for vehicle blacklist events
  tollCollectionContract.on('VehicleBlacklisted', async (vehicleId: string, isBlacklisted: boolean, timestamp: bigint, event: any) => {
    console.log(`Vehicle ${vehicleId} blacklist status: ${isBlacklisted}`);
    
    try {
      await Vehicle.findOneAndUpdate(
        { vehicleId },
        { isBlacklisted }
      );
    } catch (error) {
      console.error('Error updating vehicle blacklist status:', error);
    }
  });
}

export async function verifyAnonAadhaarProof(proof: string, publicInputs: number[], userAddress: string): Promise<boolean> {
  try {
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
