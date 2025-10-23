"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToBlockchain = connectToBlockchain;
exports.verifyAnonAadhaarProof = verifyAnonAadhaarProof;
exports.getContractBalance = getContractBalance;
exports.getProvider = getProvider;
exports.getTollCollectionContract = getTollCollectionContract;
exports.getAnonAadhaarVerifierContract = getAnonAadhaarVerifierContract;
exports.cleanupBlockchainConnection = cleanupBlockchainConnection;
const ethers_1 = require("ethers");
const TollTransaction_1 = require("../models/TollTransaction");
const Vehicle_1 = require("../models/Vehicle");
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
let provider;
let tollCollectionContract;
let anonAadhaarVerifierContract;
// Filter management
let eventFilters = new Map();
let pollingInterval = null;
let isPolling = false;
let lastProcessedBlock = 0;
const MAX_BLOCK_RANGE = 10; // Alchemy free tier limit
// Load last processed block from environment or start from recent block
function loadLastProcessedBlock() {
    const saved = process.env.LAST_PROCESSED_BLOCK;
    return saved ? parseInt(saved, 10) : 0;
}
// Save last processed block (in production, you'd want to persist this to a database)
function saveLastProcessedBlock(blockNumber) {
    process.env.LAST_PROCESSED_BLOCK = blockNumber.toString();
}
async function connectToBlockchain() {
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
        provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        // Get contract addresses from environment
        const tollCollectionAddress = process.env.TOLL_COLLECTION_ADDRESS;
        const anonAadhaarVerifierAddress = process.env.ANON_AADHAAR_VERIFIER_ADDRESS;
        if (!tollCollectionAddress || !anonAadhaarVerifierAddress) {
            throw new Error('Contract addresses not configured in environment variables');
        }
        // Initialize contracts
        tollCollectionContract = new ethers_1.Contract(tollCollectionAddress, TOLL_COLLECTION_ABI, provider);
        anonAadhaarVerifierContract = new ethers_1.Contract(anonAadhaarVerifierAddress, ANON_AADHAAR_VERIFIER_ABI, provider);
        // Setup event listeners
        setupEventListeners();
        console.log('Blockchain connection established');
        console.log(`Toll Collection Contract: ${tollCollectionAddress}`);
        console.log(`Anon-Aadhaar Verifier: ${anonAadhaarVerifierAddress}`);
    }
    catch (error) {
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
    }
    catch (error) {
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
        }
        catch (error) {
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
    try {
        // Get current block number
        const currentBlock = await provider.getBlockNumber();
        // Load last processed block from saved state
        if (lastProcessedBlock === 0) {
            lastProcessedBlock = loadLastProcessedBlock();
            // If no saved state, start from a recent block (last 100 blocks)
            if (lastProcessedBlock === 0) {
                lastProcessedBlock = Math.max(0, currentBlock - 100);
                console.log(`Starting event polling from block ${lastProcessedBlock}`);
            }
            else {
                console.log(`Resuming event polling from block ${lastProcessedBlock}`);
            }
        }
        // Process events in chunks to respect Alchemy's block range limit
        while (lastProcessedBlock < currentBlock) {
            const toBlock = Math.min(lastProcessedBlock + MAX_BLOCK_RANGE, currentBlock);
            console.log(`Polling events from block ${lastProcessedBlock} to ${toBlock}`);
            for (const [eventName, filter] of eventFilters) {
                try {
                    const events = await tollCollectionContract.queryFilter(filter, lastProcessedBlock + 1, toBlock);
                    for (const event of events) {
                        await processEvent(eventName, event);
                    }
                }
                catch (error) {
                    // Handle filter not found errors gracefully
                    if (error instanceof Error && error.message.includes('filter not found')) {
                        console.log(`Filter for ${eventName} not found, will recreate on next cycle`);
                        eventFilters.delete(eventName);
                    }
                    else if (error instanceof Error && error.message.includes('Under the Free tier plan')) {
                        console.log(`Rate limited by Alchemy free tier, reducing block range for ${eventName}`);
                        // Reduce block range and retry
                        const reducedToBlock = Math.min(lastProcessedBlock + 5, toBlock);
                        try {
                            const events = await tollCollectionContract.queryFilter(filter, lastProcessedBlock + 1, reducedToBlock);
                            for (const event of events) {
                                await processEvent(eventName, event);
                            }
                        }
                        catch (retryError) {
                            console.error(`Error polling ${eventName} events with reduced range:`, retryError);
                        }
                    }
                    else {
                        console.error(`Error polling ${eventName} events:`, error);
                    }
                }
            }
            lastProcessedBlock = toBlock;
            saveLastProcessedBlock(lastProcessedBlock);
            // Add a small delay to avoid overwhelming the RPC
            if (lastProcessedBlock < currentBlock) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }
    catch (error) {
        console.error('Error in pollForEvents:', error);
    }
}
async function processEvent(eventName, event) {
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
    }
    catch (error) {
        console.error(`Error processing ${eventName} event:`, error);
    }
}
async function handleVehicleRegistered(event) {
    const [owner, vehicleId, timestamp] = event.args;
    console.log(`Vehicle registered: ${vehicleId} by ${owner}`);
    try {
        await Vehicle_1.Vehicle.findOneAndUpdate({ vehicleId }, {
            vehicleId,
            owner,
            isActive: true,
            isBlacklisted: false,
            registrationTime: new Date(Number(timestamp) * 1000)
        }, { upsert: true, new: true });
    }
    catch (error) {
        console.error('Error updating vehicle in database:', error);
    }
}
async function handleTollPaid(event) {
    const [payer, vehicleId, amount, tollId, zkProofHash, timestamp] = event.args;
    console.log(`Toll paid: ${amount} by ${payer} for vehicle ${vehicleId}`);
    try {
        // Find the vehicle to get its ObjectId
        const vehicle = await Vehicle_1.Vehicle.findOne({ vehicleId });
        if (!vehicle) {
            console.error(`Vehicle not found: ${vehicleId}`);
            return;
        }
        const transaction = new TollTransaction_1.TollTransaction({
            transactionId: `toll_${tollId}`,
            vehicleId: vehicle._id,
            payer,
            amount: Number(ethers_1.ethers.formatEther(amount)),
            zkProofHash,
            status: 'confirmed',
            blockchainTxHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: new Date(Number(timestamp) * 1000)
        });
        await transaction.save();
        await Vehicle_1.Vehicle.findOneAndUpdate({ vehicleId }, { lastTollTime: new Date(Number(timestamp) * 1000) });
        // Broadcast to user for real-time dashboard updates
        try {
            const { getSocketService } = await Promise.resolve().then(() => __importStar(require('./socketInstance')));
            const socketService = getSocketService();
            socketService.emitToUser(payer, 'transaction:new', {
                transactionId: transaction.transactionId,
                amount: transaction.amount,
                status: transaction.status,
                timestamp: transaction.timestamp
            });
            socketService.emitToUser(payer, 'toll:payment:completed', {
                transactionId: transaction.transactionId,
                amount: transaction.amount,
                vehicleId: vehicleId,
                status: transaction.status
            });
        }
        catch (socketError) {
            console.error('Error broadcasting blockchain transaction:', socketError);
        }
    }
    catch (error) {
        console.error('Error processing toll payment event:', error);
    }
}
async function handleVehicleBlacklisted(event) {
    const [vehicleId, isBlacklisted, timestamp] = event.args;
    console.log(`Vehicle ${vehicleId} blacklist status: ${isBlacklisted}`);
    try {
        await Vehicle_1.Vehicle.findOneAndUpdate({ vehicleId }, { isBlacklisted });
    }
    catch (error) {
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
    }
    catch (error) {
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
async function verifyAnonAadhaarProof(proof, publicInputs, userAddress) {
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
        const proofBytes = ethers_1.ethers.getBytes(proof);
        // Call the verification function
        const isValid = await anonAadhaarVerifierContract.verifyAnonAadhaarProof(proofBytes, publicInputs, userAddress);
        return isValid;
    }
    catch (error) {
        console.error('Error verifying anon-Aadhaar proof:', error);
        return false;
    }
}
async function getContractBalance() {
    try {
        if (!tollCollectionContract) {
            throw new Error('Toll collection contract not initialized');
        }
        const balance = await provider.getBalance(await tollCollectionContract.getAddress());
        return ethers_1.ethers.formatEther(balance);
    }
    catch (error) {
        console.error('Error getting contract balance:', error);
        return '0';
    }
}
function getProvider() {
    return provider;
}
function getTollCollectionContract() {
    return tollCollectionContract;
}
function getAnonAadhaarVerifierContract() {
    return anonAadhaarVerifierContract;
}
function cleanupBlockchainConnection() {
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
exports.default = blockchainService;
//# sourceMappingURL=blockchainService.js.map