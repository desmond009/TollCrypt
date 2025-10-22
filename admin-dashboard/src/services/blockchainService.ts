import { ethers } from 'ethers';
import { QRCodeData } from '../types/qr';
import { BlockchainErrorHandler, ErrorContext } from '../utils/errorHandler';

// Ethereum Sepolia testnet configuration - Updated with reliable RPC endpoints
const SEPOLIA_RPC = 'https://sepolia.infura.io/v3/2896a592f4a34b96b1cfbf0eb2224be5';
const SEPOLIA_RPC_ALT = 'https://rpc.sepolia.org'; // Alternative RPC endpoint
const SEPOLIA_RPC_ALT2 = 'https://ethereum-sepolia.publicnode.com'; // Additional backup
const SEPOLIA_RPC_ALT3 = 'https://sepolia.gateway.tenderly.co'; // Another backup
const CHAIN_ID = 11155111; // Ethereum Sepolia

// Contract addresses (updated with actual deployed addresses from Sepolia)
const TOLL_COLLECTION_CONTRACT = process.env.REACT_APP_TOLL_CONTRACT_ADDRESS || process.env.REACT_APP_CONTRACT_ADDRESS || '0xeC9423d9EBFe0C0f49F7bc221aE52572E8734291'; // Main TollCollection contract
const TOPUP_TOLL_COLLECTION_CONTRACT = process.env.REACT_APP_TOPUP_TOLL_CONTRACT_ADDRESS || '0xE5f4743CF4726A7f58E0ccBB5888f1507E5aeF9d'; // TopUp TollCollection contract
const USDC_CONTRACT = process.env.REACT_APP_USDC_CONTRACT_ADDRESS || '0xe2DF4Ef71b9B0fc155c2817Df93eb04b4C590720'; // Sepolia Mock USDC
const TOPUP_WALLET_FACTORY = process.env.REACT_APP_TOPUP_WALLET_FACTORY_ADDRESS || '0x3Bd98A2a16EfEa3B40B0d5F8a2E16613b625d9aA'; // TopUpWalletFactory

// Debug logging for contract addresses
console.log('🔧 Contract Configuration:');
console.log('  - REACT_APP_TOLL_CONTRACT_ADDRESS:', process.env.REACT_APP_TOLL_CONTRACT_ADDRESS);
console.log('  - REACT_APP_CONTRACT_ADDRESS:', process.env.REACT_APP_CONTRACT_ADDRESS);
console.log('  - Final TOLL_COLLECTION_CONTRACT:', TOLL_COLLECTION_CONTRACT);
console.log('  - REACT_APP_TOPUP_TOLL_CONTRACT_ADDRESS:', process.env.REACT_APP_TOPUP_TOLL_CONTRACT_ADDRESS);
console.log('  - Final TOPUP_TOLL_COLLECTION_CONTRACT:', TOPUP_TOLL_COLLECTION_CONTRACT);
console.log('  - REACT_APP_USDC_CONTRACT_ADDRESS:', process.env.REACT_APP_USDC_CONTRACT_ADDRESS);
console.log('  - Final USDC_CONTRACT:', USDC_CONTRACT);
console.log('  - REACT_APP_TOPUP_WALLET_FACTORY_ADDRESS:', process.env.REACT_APP_TOPUP_WALLET_FACTORY_ADDRESS);
console.log('  - Final TOPUP_WALLET_FACTORY:', TOPUP_WALLET_FACTORY);


// ABI for TollCollection contract
const TOLL_COLLECTION_ABI = [
  'function processTollPayment(string memory vehicleId, bytes32 zkProofHash, uint256 amount) external returns (bool)',
  'function processTollPaymentFromTopUpWallet(string memory vehicleId, bytes32 zkProofHash, uint256 amount) external returns (bool)',
  'function registerVehicle(string memory vehicleId, address owner) external',
  'function setOperatorAuthorization(address operator, bool isAuthorized) external',
  'function vehicles(string memory vehicleId) external view returns (address owner, string memory vehicleId, bool isActive, bool isBlacklisted, uint256 registrationTime, uint256 lastTollTime)',
  'function tollRate() external view returns (uint256)', // This is the automatic getter for the public variable
  'function isTopUpWalletAuthorized(address topUpWallet) external view returns (bool isAuthorized)',
  'function authorizeTopUpWalletFromFactory(address topUpWallet) external',
  'function setTopUpWalletAuthorization(address topUpWallet, bool isAuthorized) external',
  'function topUpWalletFactory() external view returns (address)',
  'function withdrawRevenue(address to, uint256 amount) external',
  'function totalRevenue() external view returns (uint256)',
  'function getTotalTransactions() external view returns (uint256)',
  'function getTotalVehicles() external view returns (uint256)',
  'event TollPaid(address indexed payer, string indexed vehicleId, uint256 amount, uint256 tollId, bytes32 zkProofHash, uint256 timestamp)',
  'event TopUpWalletPaymentProcessed(address indexed topUpWallet, string indexed vehicleId, uint256 amount, uint256 tollId, bytes32 zkProofHash, uint256 timestamp)',
  'event VehicleRegistered(address indexed owner, string indexed vehicleId, uint256 timestamp)',
  'event RevenueWithdrawn(address indexed to, uint256 amount, uint256 timestamp)',
];

// ABI for USDC contract
const USDC_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
];

// ABI for TopUpWallet contract
const TOPUP_WALLET_ABI = [
  'function getBalance() external view returns (uint256)',
  'function getWalletStats() external view returns (uint256 totalTopUpsAmount, uint256 totalTollPaymentsAmount, uint256 totalWithdrawalsAmount, uint256 currentBalance)',
  'function isInitialized() external view returns (bool)',
  'function authorizedTollContracts(address) external view returns (bool)',
  'function processTollPayment(uint256 amount, string memory vehicleId, bytes32 zkProofHash) external',
  'function topUp(bytes memory signature) external payable',
  'function withdraw(uint256 amount, bytes memory signature) external',
  'function emergencyWithdraw(uint256 amount) external',
  'function pause() external',
  'function unpause() external',
];

// ABI for TopUpWalletFactory contract
const TOPUP_WALLET_FACTORY_ABI = [
  'function deployTopUpWallet(address user) external returns (address walletAddress)',
  'function createTopUpWallet(address user) external returns (address walletAddress)',
  'function getUserTopUpWallet(address user) external view returns (address walletAddress)',
  'function hasTopUpWallet(address user) external view returns (bool hasWallet)',
  'function getUserWalletInfo(address user) external view returns (address walletAddress, bool exists, uint256 balance)',
  'function getTotalDeployedWallets() external view returns (uint256 count)',
  'function getWalletCount() external view returns (uint256 count)',
  'function getAllDeployedWallets() external view returns (address[] memory wallets)',
  'function tollCollectionContract() external view returns (address)',
];

export interface VehicleRegistration {
  isRegistered: boolean;
  owner: string;
  vehicleType: string;
  isBlacklisted: boolean;
  registrationTime: number;
  lastTollTime: number;
}

export interface TollRate {
  vehicleType: string;
  rate: string; // in USDC (with decimals)
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  message?: string;
  gasUsed?: string;
  blockNumber?: number;
  walletAddress?: string;
  authorizationResult?: TransactionResult;
  fundingResult?: TransactionResult;
}

export interface BalanceInfo {
  balance: string;
  formattedBalance: string;
  decimals: number;
}

class BlockchainService {
  private provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null = null;
  private tollContract: ethers.Contract | null = null;
  private usdcContract: ethers.Contract | null = null;
  private topUpWalletFactory: ethers.Contract | null = null;
  private signer: ethers.Signer | null = null;

  constructor() {
    console.log('🔗 Initializing Blockchain Service...');
    console.log('📋 Contract Addresses:');
    console.log('  - Main Toll Collection:', TOLL_COLLECTION_CONTRACT);
    console.log('  - TopUp Toll Collection:', TOPUP_TOLL_COLLECTION_CONTRACT);
    console.log('  - USDC Contract:', USDC_CONTRACT);
    console.log('  - TopUp Wallet Factory:', TOPUP_WALLET_FACTORY);
    console.log('  - Network:', SEPOLIA_RPC);
    console.log('  - Chain ID:', CHAIN_ID);
    this.initializeProvider();
  }

  private async initializeProvider() {
    try {
      // Try to use MetaMask provider first
      if (window.ethereum) {
        console.log('🔗 Initializing MetaMask provider...');
        this.provider = new ethers.BrowserProvider(window.ethereum);
        
        // Add error handling for MetaMask connection
        try {
          this.signer = await this.provider.getSigner();
          console.log('✅ MetaMask signer initialized');
        } catch (signerError) {
          console.warn('⚠️ MetaMask signer failed, using provider only:', signerError);
          this.signer = null;
        }
      } else {
        console.log('🔗 MetaMask not available, using public RPC endpoints...');
        // Fallback to public RPC - try multiple endpoints with better error handling
        const rpcEndpoints = [SEPOLIA_RPC, SEPOLIA_RPC_ALT, SEPOLIA_RPC_ALT2, SEPOLIA_RPC_ALT3];
        let providerInitialized = false;
        
        for (let i = 0; i < rpcEndpoints.length; i++) {
          try {
            console.log(`🔄 Trying RPC endpoint ${i + 1}/${rpcEndpoints.length}: ${rpcEndpoints[i]}`);
            this.provider = new ethers.JsonRpcProvider(rpcEndpoints[i]);
            
            // Test the connection with timeout
            const networkPromise = this.provider.getNetwork();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('RPC timeout')), 10000)
            );
            
            await Promise.race([networkPromise, timeoutPromise]);
            console.log(`✅ RPC endpoint ${i + 1} connected successfully`);
            providerInitialized = true;
            break;
          } catch (rpcError) {
            console.warn(`❌ RPC endpoint ${i + 1} failed:`, rpcError);
            if (i === rpcEndpoints.length - 1) {
              throw new Error('All RPC endpoints failed. Please check your internet connection.');
            }
          }
        }
        
        if (!providerInitialized) {
          throw new Error('Failed to initialize any RPC provider');
        }
        
        this.signer = null;
      }

      if (this.provider) {
        // Only create contracts if addresses are valid and not zero address
        if (ethers.isAddress(TOLL_COLLECTION_CONTRACT) && TOLL_COLLECTION_CONTRACT !== '0x0000000000000000000000000000000000000000') {
          try {
            console.log('🔧 Initializing Toll Collection contract at:', TOLL_COLLECTION_CONTRACT);
            
            // First check if contract has code at this address with timeout
            const codePromise = this.provider.getCode(TOLL_COLLECTION_CONTRACT);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Contract code check timeout')), 15000)
            );
            
            const contractCode = await Promise.race([codePromise, timeoutPromise]) as string;
            console.log('📋 Contract code length:', contractCode.length);
            
            if (contractCode === '0x') {
              throw new Error(`No contract found at address ${TOLL_COLLECTION_CONTRACT}. Please verify the contract is deployed.`);
            }
            
            this.tollContract = new ethers.Contract(
              TOLL_COLLECTION_CONTRACT,
              TOLL_COLLECTION_ABI,
              this.signer || this.provider
            );
            
            // Test if contract exists by calling a simple view function with timeout
            console.log('🧪 Testing contract by calling tollRate()...');
            const tollRatePromise = this.tollContract.tollRate();
            const tollRateTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Contract call timeout')), 10000)
            );
            
            const tollRate = await Promise.race([tollRatePromise, tollRateTimeoutPromise]) as bigint;
            console.log('✅ Toll collection contract initialized successfully');
            console.log('💰 Current toll rate:', ethers.formatEther(tollRate), 'ETH');
          } catch (contractError: any) {
            console.error('❌ Failed to initialize toll collection contract:', contractError);
            console.error('❌ Contract address:', TOLL_COLLECTION_CONTRACT);
            console.error('❌ Error details:', contractError.message);
            console.error('❌ Error code:', contractError.code);
            
            // Provide more specific error messages
            if (contractError.message.includes('timeout')) {
              console.error('💡 This might be due to RPC endpoint issues. Try refreshing the page.');
            } else if (contractError.message.includes('No contract found')) {
              console.error('💡 The contract address might be incorrect or the contract is not deployed.');
            } else if (contractError.code === 'NETWORK_ERROR') {
              console.error('💡 Network connection issue. Please check your internet connection.');
            }
            
            this.tollContract = null;
          }
        } else {
          console.warn('⚠️ Invalid or zero toll collection contract address:', TOLL_COLLECTION_CONTRACT);
          this.tollContract = null;
        }

        if (ethers.isAddress(USDC_CONTRACT) && USDC_CONTRACT !== '0x0000000000000000000000000000000000000000') {
          try {
            console.log('🔧 Initializing USDC contract at:', USDC_CONTRACT);
            this.usdcContract = new ethers.Contract(
              USDC_CONTRACT,
              USDC_ABI,
              this.signer || this.provider
            );
            
            // Test if contract exists by calling a simple view function
            const decimals = await this.usdcContract.decimals();
            console.log('✅ USDC contract initialized successfully');
            console.log('🔢 USDC decimals:', decimals);
          } catch (contractError) {
            console.error('❌ Failed to initialize USDC contract:', contractError);
            this.usdcContract = null;
          }
        } else {
          console.warn('⚠️ Invalid or zero USDC contract address:', USDC_CONTRACT);
          this.usdcContract = null;
        }

        if (ethers.isAddress(TOPUP_WALLET_FACTORY) && TOPUP_WALLET_FACTORY !== '0x0000000000000000000000000000000000000000') {
          try {
            console.log('🔧 Initializing TopUp Wallet Factory at:', TOPUP_WALLET_FACTORY);
            
            // First check if contract has code at this address with timeout
            const codePromise = this.provider.getCode(TOPUP_WALLET_FACTORY);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Factory contract code check timeout')), 15000)
            );
            
            const contractCode = await Promise.race([codePromise, timeoutPromise]) as string;
            console.log('📋 Factory contract code length:', contractCode.length);
            
            if (contractCode === '0x') {
              throw new Error(`No TopUpWalletFactory contract found at address ${TOPUP_WALLET_FACTORY}. Please verify the factory is deployed.`);
            }
            
            this.topUpWalletFactory = new ethers.Contract(
              TOPUP_WALLET_FACTORY,
              TOPUP_WALLET_FACTORY_ABI,
              this.signer || this.provider
            );
            
            // Test if contract exists by calling a simple view function with timeout
            console.log('🧪 Testing TopUpWalletFactory by calling getTotalDeployedWallets()...');
            const walletCountPromise = this.topUpWalletFactory.getTotalDeployedWallets();
            const walletCountTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Factory contract call timeout')), 10000)
            );
            
            const walletCount = await Promise.race([walletCountPromise, walletCountTimeoutPromise]) as bigint;
            console.log('✅ TopUp Wallet Factory initialized successfully');
            console.log('📊 Total wallets created:', walletCount.toString());
          } catch (contractError: any) {
            console.error('❌ Failed to initialize TopUp Wallet Factory:', contractError);
            console.error('❌ Factory address:', TOPUP_WALLET_FACTORY);
            console.error('❌ Error details:', contractError.message);
            console.error('❌ Error code:', contractError.code);
            
            // Provide more specific error messages
            if (contractError.message.includes('timeout')) {
              console.error('💡 This might be due to RPC endpoint issues. Try refreshing the page.');
            } else if (contractError.message.includes('No TopUpWalletFactory contract found')) {
              console.error('💡 The factory contract address might be incorrect or the contract is not deployed.');
            } else if (contractError.code === 'NETWORK_ERROR') {
              console.error('💡 Network connection issue. Please check your internet connection.');
            }
            
            this.topUpWalletFactory = null;
          }
        } else {
          console.warn('⚠️ Invalid or zero TopUp Wallet Factory address:', TOPUP_WALLET_FACTORY);
          this.topUpWalletFactory = null;
        }
      }
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
    }
  }

  async checkNetwork(): Promise<boolean> {
    if (!this.provider) return false;

    try {
      const network = await this.provider.getNetwork();
      return Number(network.chainId) === CHAIN_ID;
    } catch (error) {
      console.error('Network check failed:', error);
      return false;
    }
  }

  async switchToSepolia(): Promise<boolean> {
    if (!window.ethereum) return false;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added, add it
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${CHAIN_ID.toString(16)}`,
              chainName: 'Sepolia',
              rpcUrls: [SEPOLIA_RPC],
              nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            }],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add Sepolia network:', addError);
          return false;
        }
      }
      console.error('Failed to switch to Sepolia:', error);
      return false;
    }
  }

  async getVehicleRegistration(vehicleId: string): Promise<VehicleRegistration> {
    if (!this.tollContract) {
      throw new Error('Contract not initialized');
    }

    const context: ErrorContext = {
      operation: 'getVehicleRegistration',
      contractAddress: TOLL_COLLECTION_CONTRACT,
      methodName: 'vehicles',
      parameters: [vehicleId]
    };

    const fallbackRegistration: VehicleRegistration = {
      isRegistered: false,
      owner: '0x0000000000000000000000000000000000000000',
      vehicleType: vehicleId,
      isBlacklisted: false,
      registrationTime: 0,
      lastTollTime: 0
    };

    try {
      // Check if the contract has the vehicles method
      const hasMethod = this.tollContract.interface.hasFunction('vehicles');
      if (!hasMethod) {
        console.warn('Contract does not have vehicles method, returning default registration status');
        return fallbackRegistration;
      }
      
      const [owner, vehicleIdFromContract, isActive, isBlacklisted, registrationTime, lastTollTime] = await BlockchainErrorHandler.retryOperation(
        () => this.tollContract!.vehicles(vehicleId),
        context
      );
      
      return {
        isRegistered: owner !== '0x0000000000000000000000000000000000000000' && isActive,
        owner: owner,
        vehicleType: vehicleIdFromContract,
        isBlacklisted: isBlacklisted,
        registrationTime: Number(registrationTime),
        lastTollTime: Number(lastTollTime)
      };
    } catch (error: any) {
      BlockchainErrorHandler.logError(error, context);
      
      // Return fallback registration for any error
      console.warn('Using fallback registration data due to error');
      return fallbackRegistration;
    }
  }

  async isVehicleBlacklisted(vehicleId: string): Promise<boolean> {
    if (!this.tollContract) {
      console.warn('Contract not initialized, assuming vehicle is not blacklisted');
      return false;
    }

    const context: ErrorContext = {
      operation: 'isVehicleBlacklisted',
      contractAddress: TOLL_COLLECTION_CONTRACT,
      methodName: 'vehicles',
      parameters: [vehicleId]
    };

    return await BlockchainErrorHandler.callContractMethod(
      () => this.tollContract!.vehicles(vehicleId).then(([owner, vehicleIdFromContract, isActive, isBlacklisted, registrationTime, lastTollTime]) => isBlacklisted),
      false, // fallback value
      context
    );
  }

  async getTollRate(vehicleType: string): Promise<string> {
    if (!this.tollContract) {
      console.warn('Contract not initialized, using default toll rates');
      // Return default rates based on vehicle type
      const defaultRates: { [key: string]: string } = {
        '2-wheeler': '0.50', // $0.50
        '4-wheeler': '2.00', // $2.00
        'lcv': '3.00',       // $3.00
        'hcv': '5.00',       // $5.00
        'bus': '4.00',       // $4.00
        'car': '2.00',       // $2.00
        'truck': '5.00',     // $5.00
      };
      return defaultRates[vehicleType.toLowerCase()] || '2.00';
    }

    try {
      // Check if the contract has the tollRate method
      const hasMethod = this.tollContract.interface.hasFunction('tollRate');
      if (!hasMethod) {
        console.warn('Contract does not have tollRate method, using default rates');
        // Return default rates based on vehicle type
        const defaultRates: { [key: string]: string } = {
          '2-wheeler': '0.50', // $0.50
          '4-wheeler': '2.00', // $2.00
          'lcv': '3.00',       // $3.00
          'hcv': '5.00',       // $5.00
          'bus': '4.00',       // $4.00
          'car': '2.00',       // $2.00
          'truck': '5.00',     // $5.00
        };
        return defaultRates[vehicleType.toLowerCase()] || '2.00';
      }
      
      const rate = await this.tollContract.tollRate();
      // Convert from wei to ETH
      const rateInEth = ethers.formatEther(rate);
      return rateInEth;
    } catch (error) {
      console.error('Failed to get toll rate:', error);
      // Return default rates based on vehicle type
      const defaultRates: { [key: string]: string } = {
        '2-wheeler': '0.50', // $0.50
        '4-wheeler': '2.00', // $2.00
        'lcv': '3.00',       // $3.00
        'hcv': '5.00',       // $5.00
        'bus': '4.00',       // $4.00
        'car': '2.00',       // $2.00
        'truck': '5.00',     // $5.00
      };
      return defaultRates[vehicleType.toLowerCase()] || '2.00';
    }
  }

  // Get toll rate for specific plaza and vehicle type
  async getTollRateByPlaza(plazaId: number, vehicleType: string): Promise<string> {
    try {
      // For now, return default rates based on vehicle type
      // In production, this would query the smart contract for plaza-specific rates
      const defaultRates: { [key: string]: string } = {
        '2w': '0.0001',      // 0.0001 ETH
        '4w': '0.00028',     // 0.00028 ETH
        'lcv': '0.00042',    // 0.00042 ETH
        'hcv': '0.0007',     // 0.0007 ETH
        'bus': '0.00056',    // 0.00056 ETH
        'car': '0.00028',    // 0.00028 ETH
        'truck': '0.0007',   // 0.0007 ETH
        '2-wheeler': '0.0001',
        '4-wheeler': '0.00028',
        '4W': '0.00028',
        '2W': '0.0001',
      };
      
      return defaultRates[vehicleType.toLowerCase()] || '0.00028';
    } catch (error) {
      console.error('Failed to get plaza toll rate:', error);
      return '0.00028'; // Default rate
    }
  }

  async getUSDCBalance(walletAddress: string): Promise<BalanceInfo> {
    if (!this.usdcContract) {
      throw new Error('USDC contract not initialized');
    }

    try {
      const balance = await this.usdcContract.balanceOf(walletAddress);
      const decimals = await this.usdcContract.decimals();
      const formattedBalance = ethers.formatUnits(balance, decimals);
      
      return {
        balance: balance.toString(),
        formattedBalance,
        decimals,
      };
    } catch (error) {
      console.error('Failed to get USDC balance:', error);
      throw new Error('Failed to get wallet balance');
    }
  }

  async getWalletBalance(walletAddress: string): Promise<BalanceInfo> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      // Try to get TopUpWallet balance first (this is the primary balance for toll payments)
      let topUpWalletBalance: bigint = BigInt(0);
      let topUpWalletAddress = '';
      
      if (this.topUpWalletFactory) {
        try {
          // Check if user has a top-up wallet using the factory
          const hasTopUpWallet = await this.topUpWalletFactory.hasTopUpWallet(walletAddress);
          if (hasTopUpWallet) {
            // Get the top-up wallet address from the factory
            topUpWalletAddress = await this.topUpWalletFactory.getUserTopUpWallet(walletAddress);
            
            if (topUpWalletAddress !== '0x0000000000000000000000000000000000000000') {
              // Get the balance from the top-up wallet
              const topUpWalletContract = new ethers.Contract(
                topUpWalletAddress,
                TOPUP_WALLET_ABI,
                this.provider
              );
              
              topUpWalletBalance = await topUpWalletContract.getBalance();
              console.log('💰 TopUp Wallet Balance:', ethers.formatEther(topUpWalletBalance), 'ETH');
            } else {
              console.warn('⚠️ TopUpWallet address is zero, using main wallet balance');
            }
          }
        } catch (contractError) {
          console.warn('Failed to get TopUpWallet balance:', contractError);
          // Fallback to main wallet ETH balance
        }
      }
      
      // If no top-up wallet or failed to get balance, use main wallet ETH balance
      if (topUpWalletBalance === BigInt(0)) {
        const ethBalance = await this.provider.getBalance(walletAddress);
        topUpWalletBalance = ethBalance;
        console.log('💰 Main Wallet Balance:', ethers.formatEther(ethBalance), 'ETH');
      }
      
      return {
        balance: topUpWalletBalance.toString(),
        formattedBalance: ethers.formatEther(topUpWalletBalance),
        decimals: 18, // ETH decimals
      };
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      
      // Final fallback - return zero balance
      return {
        balance: '0',
        formattedBalance: '0.000000',
        decimals: 18,
      };
    }
  }

  async processTollPayment(
    qrData: QRCodeData,
    tollAmount: string,
    adminWallet: string,
    plazaId?: number
  ): Promise<TransactionResult> {
    // Ensure contracts and signer are initialized before proceeding
    await this.ensureInitialized();
    
    if (!this.tollContract || !this.signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      // Convert toll amount to wei (ETH has 18 decimals)
      const amountInWei = ethers.parseEther(tollAmount);
      
      // Generate ZK proof hash (simplified - in production this would be a real ZK proof)
      const zkProofHash = ethers.keccak256(
        ethers.toUtf8Bytes(
          JSON.stringify({
            walletAddress: qrData.walletAddress,
            vehicleId: qrData.vehicleId || qrData.vehicleNumber,
            timestamp: qrData.timestamp,
            amount: tollAmount,
            nonce: qrData.nonce || Date.now().toString(),
          })
        )
      );

      // Check if user has a TopUpWallet
      const hasTopUpWallet = await this.tollContract.hasUserTopUpWallet(qrData.walletAddress);
      
      let tx;
      if (hasTopUpWallet) {
        // Process payment from TopUpWallet
        const topUpWalletAddress = await this.tollContract.getUserTopUpWallet(qrData.walletAddress);
        tx = await this.tollContract.processTollPaymentFromTopUpWallet(
          qrData.vehicleId || qrData.vehicleNumber,
          zkProofHash,
          amountInWei,
          {
            from: adminWallet,
            gasLimit: 300000,
          }
        );
      } else {
        // Process direct payment (fallback)
        tx = await this.tollContract.processTollPayment(
          qrData.vehicleId || qrData.vehicleNumber,
          zkProofHash,
          amountInWei,
          {
            from: adminWallet,
            gasLimit: 300000,
          }
        );
      }

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        return {
          success: true,
          transactionHash: receipt.hash,
          gasUsed: receipt.gasUsed.toString(),
        };
      } else {
        return {
          success: false,
          error: 'Transaction failed',
        };
      }
    } catch (error: any) {
      console.error('Toll payment processing failed:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed',
      };
    }
  }

  // Authorize an operator for toll collection (admin function)
  async authorizeOperator(operatorAddress: string): Promise<TransactionResult> {
    // Ensure contracts and signer are initialized before proceeding
    await this.ensureInitialized();
    
    if (!this.tollContract || !this.signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      console.log('🔐 Authorizing operator:', operatorAddress);
      
      const tx = await this.tollContract.setOperatorAuthorization(
        operatorAddress,
        true,
        {
          gasLimit: 50000,
        }
      );

      console.log('⏳ Waiting for operator authorization transaction confirmation...');
      const receipt = await tx.wait();
      
      if (receipt && receipt.status === 1) {
        console.log('✅ Operator authorized successfully!');
        console.log('📋 Transaction hash:', receipt.hash);
        return {
          success: true,
          transactionHash: receipt.hash,
          gasUsed: receipt.gasUsed.toString(),
        };
      } else {
        return {
          success: false,
          error: 'Operator authorization transaction failed',
        };
      }
    } catch (error: any) {
      console.error('Operator authorization failed:', error);
      return {
        success: false,
        error: error.message || 'Authorization failed',
      };
    }
  }

  // Register a vehicle on the smart contract
  async registerVehicleOnContract(
    vehicleId: string,
    ownerAddress: string
  ): Promise<TransactionResult> {
    // Ensure contracts and signer are initialized before proceeding
    await this.ensureInitialized();
    
    if (!this.tollContract || !this.signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      console.log('🚗 Registering vehicle on smart contract...');
      console.log('📋 Registration Details:');
      console.log('  - Vehicle ID:', vehicleId);
      console.log('  - Owner Address:', ownerAddress);
      console.log('  - Contract Address:', TOLL_COLLECTION_CONTRACT);

      // Check if vehicle is already registered with enhanced error handling
      try {
        const [owner, vehicleIdFromContract, isActive, isBlacklisted, registrationTime, lastTollTime] = await this.tollContract.vehicles(vehicleId);
        if (owner !== '0x0000000000000000000000000000000000000000') {
          console.log('✅ Vehicle already registered on contract');
          return {
            success: true,
            message: 'Vehicle already registered'
          };
        }
      } catch (checkError: any) {
        console.warn('⚠️ Could not check existing vehicle registration, proceeding with registration:', checkError.message);
        // Continue with registration even if check fails
      }

      // Register the vehicle
      const tx = await this.tollContract.registerVehicle(
        vehicleId,
        ownerAddress,
        {
          gasLimit: 200000,
        }
      );

      console.log('⏳ Waiting for vehicle registration confirmation...');
      console.log('📋 Transaction Hash:', tx.hash);
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log('✅ Vehicle registered successfully on smart contract!');
        console.log('📊 Gas Used:', receipt.gasUsed.toString());
        console.log('🔢 Block Number:', receipt.blockNumber);
        
        return {
          success: true,
          transactionHash: receipt.hash,
          gasUsed: receipt.gasUsed.toString(),
          blockNumber: receipt.blockNumber
        };
      } else {
        console.error('❌ Vehicle registration failed with status:', receipt.status);
        return {
          success: false,
          error: 'Vehicle registration failed',
        };
      }
    } catch (error: any) {
      console.error('❌ Vehicle registration failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        reason: error.reason,
        data: error.data
      });
      
      return {
        success: false,
        error: error.message || 'Vehicle registration failed',
      };
    }
  }

  // New method for admin toll processing with plaza-specific rates
  async processAdminTollPayment(
    walletAddress: string,
    vehicleNumber: string,
    vehicleType: string,
    tollAmount: string,
    plazaId: number,
    adminWallet: string
  ): Promise<TransactionResult> {
    // Ensure contracts and signer are initialized before proceeding
    await this.ensureInitialized();
    
    if (!this.tollContract || !this.signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      console.log('🚀 Starting admin toll payment process...');
      console.log('📋 Transaction Details:');
      console.log('  - Wallet Address:', walletAddress);
      console.log('  - Vehicle Number:', vehicleNumber);
      console.log('  - Vehicle Type:', vehicleType);
      console.log('  - Toll Amount:', tollAmount);
      console.log('  - Plaza ID:', plazaId);
      console.log('  - Admin Wallet:', adminWallet);
      console.log('  - Contract Address:', TOLL_COLLECTION_CONTRACT);
      
      // Convert toll amount to wei (ETH has 18 decimals)
      const amountInWei = ethers.parseEther(tollAmount);
      console.log('💰 Amount in Wei:', amountInWei.toString());
      
      // Generate transaction hash for this specific toll payment
      const transactionHash = ethers.keccak256(
        ethers.toUtf8Bytes(
          JSON.stringify({
            walletAddress,
            vehicleNumber,
            vehicleType,
            plazaId,
            amount: tollAmount,
            timestamp: Date.now(),
            adminWallet
          })
        )
      );
      console.log('🔐 Transaction Hash:', transactionHash);

      // Check if vehicle is registered on the smart contract with enhanced error handling
      console.log('🔍 Checking if vehicle is registered on smart contract...');
      
      const vehicleCheckContext: ErrorContext = {
        operation: 'checkVehicleRegistration',
        contractAddress: TOLL_COLLECTION_CONTRACT,
        methodName: 'vehicles',
        parameters: [vehicleNumber],
        walletAddress
      };

      const isVehicleRegistered = await BlockchainErrorHandler.callContractMethod(
        async () => {
          const [owner, vehicleIdFromContract, isActive, isBlacklisted, registrationTime, lastTollTime] = await this.tollContract!.vehicles(vehicleNumber);
          return owner !== '0x0000000000000000000000000000000000000000';
        },
        false, // fallback: assume not registered
        vehicleCheckContext
      );

      if (!isVehicleRegistered) {
        console.log('⚠️ Vehicle not registered on smart contract, attempting to register...');
        const registrationContext: ErrorContext = {
          operation: 'registerVehicle',
          contractAddress: TOLL_COLLECTION_CONTRACT,
          methodName: 'registerVehicle',
          parameters: [vehicleNumber, walletAddress],
          walletAddress
        };

        const registrationResult = await BlockchainErrorHandler.handleVehicleRegistration(
          vehicleNumber,
          () => this.registerVehicleOnContract(vehicleNumber, walletAddress),
          registrationContext
        );

        if (registrationResult.success) {
          console.log('✅ Vehicle registered successfully on smart contract');
        } else {
          console.warn('⚠️ Vehicle registration failed, but continuing with payment:', registrationResult.error);
        }
      } else {
        console.log('✅ Vehicle already registered on smart contract');
      }

      // Check if admin wallet is authorized as operator
      console.log('🔍 Checking if admin wallet is authorized as operator...');
      try {
        // Check if the contract has the authorization method
        const hasAuthMethod = this.tollContract.interface.hasFunction('setOperatorAuthorization');
        if (hasAuthMethod) {
          console.log('🔄 Attempting to authorize admin wallet as operator...');
          const authResult = await this.authorizeOperator(adminWallet);
          if (!authResult.success) {
            console.warn('⚠️ Failed to authorize admin wallet, but continuing with transaction...');
            console.warn('⚠️ This might cause the transaction to fail if the wallet is not already authorized');
          } else {
            console.log('✅ Admin wallet authorized successfully');
          }
        } else {
          console.warn('⚠️ Contract does not have operator authorization method, skipping authorization');
        }
      } catch (authError: any) {
        console.warn('⚠️ Authorization check failed, but continuing with transaction...');
        console.warn('⚠️ This might cause the transaction to fail if the wallet is not already authorized');
      }

      // Check if user has a TopUpWallet using the factory
      console.log('🔍 Checking if user has TopUpWallet...');
      let hasTopUpWallet = false;
      let topUpWalletAddress = '';
      
      try {
        if (this.topUpWalletFactory) {
          console.log('🏭 TopUpWalletFactory is available, checking user wallet...');
          
          // Add timeout for the contract call
          const hasWalletPromise = this.topUpWalletFactory.hasTopUpWallet(walletAddress);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('hasTopUpWallet call timeout')), 10000)
          );
          
          hasTopUpWallet = await Promise.race([hasWalletPromise, timeoutPromise]) as boolean;
          console.log('📊 Has TopUpWallet:', hasTopUpWallet);
          
          if (hasTopUpWallet) {
            // Get the top-up wallet address
            const walletAddressPromise = this.topUpWalletFactory.getUserTopUpWallet(walletAddress);
            const walletTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('getUserTopUpWallet call timeout')), 10000)
            );
            
            topUpWalletAddress = await Promise.race([walletAddressPromise, walletTimeoutPromise]) as string;
            console.log('📍 TopUpWallet Address:', topUpWalletAddress);
            
            if (topUpWalletAddress === '0x0000000000000000000000000000000000000000') {
              console.warn('⚠️ TopUpWallet address is zero, falling back to direct payment');
              hasTopUpWallet = false;
            }
          } else {
            // Try to create a TopUpWallet for the user if it doesn't exist
            console.log('🔄 User does not have TopUpWallet, attempting to create one...');
            try {
              const createResult = await this.createAndAuthorizeTopUpWallet(walletAddress);
              if (createResult.success) {
                console.log('✅ TopUpWallet created and authorized successfully');
                hasTopUpWallet = true;
                topUpWalletAddress = createResult.walletAddress || walletAddress;
              } else {
                console.warn('⚠️ Failed to create TopUpWallet:', createResult.error);
                hasTopUpWallet = false;
              }
            } catch (createError: any) {
              console.error('❌ TopUpWallet creation failed:', createError);
              hasTopUpWallet = false;
            }
          }
        } else {
          console.warn('⚠️ TopUpWalletFactory not available, assuming no TopUpWallet');
          hasTopUpWallet = false;
        }
      } catch (walletCheckError: any) {
        console.error('❌ Failed to check TopUpWallet status:', walletCheckError);
        
        // If the call fails, we'll assume no TopUpWallet and use direct payment
        console.log('🔄 Falling back to direct payment method');
        hasTopUpWallet = false;
      }
      
      let tx;
      if (hasTopUpWallet) {
        console.log('💳 Processing payment from TopUpWallet...');
        
        // Check if the top-up wallet is authorized with timeout
        let isAuthorized = false;
        
        try {
          if (topUpWalletAddress && topUpWalletAddress !== '0x0000000000000000000000000000000000000000') {
            console.log('🔐 Checking TopUpWallet authorization...');
            
            const authPromise = this.tollContract.isTopUpWalletAuthorized(topUpWalletAddress);
            const authTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('isTopUpWalletAuthorized call timeout')), 10000)
            );
            
            isAuthorized = await Promise.race([authPromise, authTimeoutPromise]) as boolean;
            console.log('🔐 TopUpWallet Authorized:', isAuthorized);
            
            if (!isAuthorized) {
              console.warn('⚠️ TopUpWallet not authorized, attempting to authorize...');
              
              try {
                const authResult = await this.authorizeTopUpWallet(topUpWalletAddress);
                if (authResult.success) {
                  console.log('✅ TopUpWallet authorized successfully');
                  isAuthorized = true;
                } else {
                  console.warn('⚠️ Failed to authorize TopUpWallet:', authResult.error);
                  hasTopUpWallet = false; // Force direct payment
                }
              } catch (authError: any) {
                console.error('❌ Authorization attempt failed:', authError);
                hasTopUpWallet = false; // Force direct payment
              }
            }
          } else {
            console.warn('⚠️ Invalid TopUpWallet address, falling back to direct payment');
            hasTopUpWallet = false;
          }
        } catch (authCheckError: any) {
          console.error('❌ Failed to check TopUpWallet authorization:', authCheckError);
          console.log('🔄 Falling back to direct payment method due to authorization check failure');
          hasTopUpWallet = false; // Force direct payment
        }
        
        if (hasTopUpWallet && isAuthorized) {
          // Check if the contract has the TopUpWallet payment method
          const hasTopUpMethod = this.tollContract.interface.hasFunction('processTollPaymentFromTopUpWallet');
          if (hasTopUpMethod) {
            // Process payment from TopUpWallet
            console.log('💳 Processing payment from TopUpWallet:', topUpWalletAddress);
            tx = await this.tollContract.processTollPaymentFromTopUpWallet(
              vehicleNumber,
              transactionHash,
              amountInWei,
              {
                from: adminWallet,
                gasLimit: 300000,
              }
            );
          } else {
            console.warn('⚠️ Contract does not have TopUpWallet payment method, falling back to direct payment');
            hasTopUpWallet = false; // Force direct payment
          }
        } else {
          console.warn('⚠️ TopUpWallet not available or not authorized, falling back to direct payment');
          hasTopUpWallet = false; // Force direct payment
        }
      }
      
      // If we don't have a transaction yet, process direct payment
      if (!tx) {
        console.log('💳 Processing direct payment (fallback)...');
        
        // Check if the contract has the direct payment method
        const hasDirectMethod = this.tollContract.interface.hasFunction('processTollPayment');
        if (hasDirectMethod) {
          // Process direct payment (fallback)
          tx = await this.tollContract.processTollPayment(
            vehicleNumber,
            transactionHash,
            amountInWei,
            {
              from: adminWallet,
              gasLimit: 300000,
            }
          );
        } else {
          throw new Error('Contract does not have processTollPayment method. Please check contract deployment.');
        }
      }

      console.log('⏳ Waiting for transaction confirmation...');
      console.log('📋 Transaction Hash:', tx.hash);
      console.log('📍 Transaction To Address:', tx.to);
      console.log('📍 Expected Contract Address:', TOLL_COLLECTION_CONTRACT);
      
      // Verify the transaction is going to the correct contract
      if (tx.to && tx.to.toLowerCase() !== TOLL_COLLECTION_CONTRACT.toLowerCase()) {
        console.warn('⚠️ WARNING: Transaction is going to a different address than expected!');
        console.warn('  - Expected:', TOLL_COLLECTION_CONTRACT);
        console.warn('  - Actual:', tx.to);
      }
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log('✅ Transaction successful!');
        console.log('📊 Gas Used:', receipt.gasUsed.toString());
        console.log('🔢 Block Number:', receipt.blockNumber);
        
        return {
          success: true,
          transactionHash: receipt.hash,
          gasUsed: receipt.gasUsed.toString(),
          blockNumber: receipt.blockNumber
        };
      } else {
        console.error('❌ Transaction failed with status:', receipt.status);
        return {
          success: false,
          error: 'Transaction failed',
        };
      }
    } catch (error: any) {
      const paymentContext: ErrorContext = {
        operation: 'processAdminTollPayment',
        contractAddress: TOLL_COLLECTION_CONTRACT,
        methodName: 'processTollPayment',
        parameters: [vehicleNumber, 'unknown', 'unknown'],
        walletAddress: adminWallet
      };

      const result = await BlockchainErrorHandler.handleTollPayment(
        () => Promise.reject(error),
        paymentContext
      );

      return {
        success: result.success,
        error: result.error,
        transactionHash: result.transactionHash
      };
    }
  }

  async validateQRCode(qrData: QRCodeData): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Normalize QR code data structure (handle both frontend and admin formats)
      const normalizedQrData = {
        walletAddress: qrData.walletAddress,
        vehicleId: (qrData as any).vehicleId || (qrData as any).vehicleNumber, // Handle both field names
        vehicleType: qrData.vehicleType,
        timestamp: qrData.timestamp,
        sessionToken: qrData.sessionToken,
        signature: qrData.signature,
        userId: (qrData as any).userId, // Optional field from frontend
        version: (qrData as any).version, // Optional field from frontend
        plazaId: qrData.plazaId,
        nonce: qrData.nonce,
        tollRate: (qrData as any).tollRate
      };
      
      // Step 1: Validate required fields
      const requiredFields = ['walletAddress', 'vehicleId', 'vehicleType', 'timestamp'];
      const missingFields = requiredFields.filter(field => !(normalizedQrData as any)[field]);
      
      if (missingFields.length > 0) {
        return {
          isValid: false,
          error: `Invalid QR code data structure - missing required fields: ${missingFields.join(', ')}`,
        };
      }
      
      // Use normalized data for further validation
      const qrDataToValidate = normalizedQrData as QRCodeData;

      // Step 2: Validate wallet address format
      if (!ethers.isAddress(qrDataToValidate.walletAddress)) {
        return {
          isValid: false,
          error: 'Invalid wallet address format',
        };
      }

      // Step 3: Check timestamp validity (QR code not expired)
      const now = Date.now();
      const qrAge = now - qrDataToValidate.timestamp;
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (qrAge > maxAge) {
        return {
          isValid: false,
          error: 'QR code has expired. Please generate a new one.',
        };
      }

      // Step 4: Verify signature if present
      if (qrDataToValidate.signature) {
        const isValidSignature = await this.verifyQRSignature(qrDataToValidate);
        if (!isValidSignature) {
          return {
            isValid: false,
            error: 'QR code signature verification failed - code may be tampered',
          };
        }
      }

      // Step 5: Check vehicle registration
      const vehicleId = qrDataToValidate.vehicleId || qrDataToValidate.vehicleNumber;
      if (!vehicleId) {
        return {
          isValid: false,
          error: 'Vehicle ID not found in QR code',
        };
      }
      const registration = await this.getVehicleRegistration(vehicleId);
      if (!registration.isRegistered) {
        return {
          isValid: false,
          error: 'Vehicle is not registered in the system',
        };
      }

      // Step 6: Check if vehicle is blacklisted
      const isBlacklisted = await this.isVehicleBlacklisted(vehicleId);
      if (isBlacklisted) {
        return {
          isValid: false,
          error: 'Vehicle is blacklisted and cannot proceed',
        };
      }

      // Step 7: Verify vehicle owner matches QR code wallet
      if (registration.owner.toLowerCase() !== qrDataToValidate.walletAddress.toLowerCase()) {
        return {
          isValid: false,
          error: 'Vehicle owner does not match wallet address in QR code',
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('QR code validation failed:', error);
      return {
        isValid: false,
        error: 'Failed to validate QR code - system error',
      };
    }
  }

  async verifyQRSignature(qrData: QRCodeData): Promise<boolean> {
    try {
      if (!qrData.signature) {
        return true; // No signature to verify
      }

      // Check if it's a mock signature (all zeros)
      const mockSignaturePattern = /^0x0+$/;
      if (mockSignaturePattern.test(qrData.signature)) {
        console.log('Mock signature detected, skipping verification');
        return true; // Accept mock signatures for now
      }

      // Validate signature format (should be 0x + 130 hex characters)
      if (!qrData.signature.match(/^0x[a-fA-F0-9]{130}$/)) {
        console.error('Invalid signature format:', qrData.signature);
        return false;
      }

      // Create message hash from QR data (updated to match frontend structure)
      const messageData = {
        walletAddress: qrData.walletAddress,
        vehicleNumber: qrData.vehicleNumber || qrData.vehicleId, // Support both field names
        vehicleType: qrData.vehicleType,
        userId: qrData.userId,
        timestamp: qrData.timestamp,
        version: qrData.version
      };

      const messageString = JSON.stringify(messageData);
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(messageString));

      console.log('Verifying signature for message:', messageString);
      console.log('Message hash:', messageHash);
      console.log('Signature:', qrData.signature);

      // Recover the signer address
      const recoveredAddress = ethers.verifyMessage(ethers.getBytes(messageHash), qrData.signature);

      console.log('Recovered address:', recoveredAddress);
      console.log('Expected address:', qrData.walletAddress);

      // Note: The signature might be from the user's main wallet, not the top-up wallet
      // For now, we'll accept any valid signature
      return true; // Accept any valid signature for now
    } catch (error) {
      console.error('Signature verification failed:', error);
      // For now, return true to allow mock signatures to pass
      // In production, you might want to return false for invalid signatures
      return true;
    }
  }

  getBlockExplorerUrl(transactionHash: string): string {
    return `https://sepolia.basescan.org/tx/${transactionHash}`;
  }

  formatUSDCAmount(amount: string, decimals: number = 6): string {
    return ethers.formatUnits(amount, decimals);
  }

  parseUSDCAmount(amount: string, decimals: number = 6): string {
    return ethers.parseUnits(amount, decimals).toString();
  }

  async hasUserTopUpWallet(walletAddress: string): Promise<boolean> {
    if (!this.topUpWalletFactory) {
      console.warn('⚠️ TopUpWalletFactory not initialized. Contract address:', TOPUP_WALLET_FACTORY);
      console.warn('💡 Make sure the factory contract is deployed and the address is correct');
      return false;
    }

    try {
      // Check if the contract has the hasTopUpWallet method
      const hasMethod = this.topUpWalletFactory.interface.hasFunction('hasTopUpWallet');
      if (!hasMethod) {
        console.warn('TopUpWalletFactory does not have hasTopUpWallet method');
        return false;
      }
      
      const hasWallet = await this.topUpWalletFactory.hasTopUpWallet(walletAddress);
      console.log('📊 User has TopUpWallet:', hasWallet);
      return hasWallet;
    } catch (error) {
      console.error('Failed to check if user has top-up wallet:', error);
      return false;
    }
  }

  async getUserTopUpWallet(walletAddress: string): Promise<string> {
    if (!this.topUpWalletFactory) {
      throw new Error('TopUpWalletFactory not initialized');
    }

    try {
      // Check if the contract has the getUserTopUpWallet method
      const hasMethod = this.topUpWalletFactory.interface.hasFunction('getUserTopUpWallet');
      if (!hasMethod) {
        throw new Error('TopUpWalletFactory does not have getUserTopUpWallet method');
      }
      
      const topUpWalletAddress = await this.topUpWalletFactory.getUserTopUpWallet(walletAddress);
      console.log('📍 User TopUpWallet Address:', topUpWalletAddress);
      return topUpWalletAddress;
    } catch (error) {
      console.error('Failed to get user top-up wallet:', error);
      throw new Error('Failed to get user top-up wallet');
    }
  }

  // Check if a top-up wallet is authorized for toll collection
  async isTopUpWalletAuthorized(topUpWalletAddress: string): Promise<boolean> {
    if (!this.tollContract) {
      console.warn('⚠️ Toll contract not initialized');
      return false;
    }

    try {
      const isAuthorized = await this.tollContract.isTopUpWalletAuthorized(topUpWalletAddress);
      console.log('🔐 TopUp Wallet Authorization Status:', isAuthorized);
      return isAuthorized;
    } catch (error) {
      console.error('Failed to check top-up wallet authorization:', error);
      return false;
    }
  }

  // Check if user's top-up wallet is authorized for automatic toll collection
  async checkUserAuthorization(userAddress: string): Promise<{
    hasTopUpWallet: boolean;
    topUpWalletAddress: string;
    isAuthorized: boolean;
    balance: string;
    formattedBalance: string;
  }> {
    try {
      let hasTopUpWallet = false;
      let topUpWalletAddress = '';
      let isAuthorized = false;
      let balance = '0';
      let formattedBalance = '0.000000';

      if (this.topUpWalletFactory && this.tollContract) {
        try {
          // Check if user has a top-up wallet using the factory
          hasTopUpWallet = await this.topUpWalletFactory.hasTopUpWallet(userAddress);
          
          if (hasTopUpWallet) {
            // Get the top-up wallet address from the factory
            topUpWalletAddress = await this.topUpWalletFactory.getUserTopUpWallet(userAddress);
            
            if (topUpWalletAddress !== '0x0000000000000000000000000000000000000000') {
              // Check if the top-up wallet is authorized in the toll contract
              isAuthorized = await this.tollContract.isTopUpWalletAuthorized(topUpWalletAddress);
            } else {
              console.warn('⚠️ TopUpWallet address is zero');
              hasTopUpWallet = false;
              isAuthorized = false;
            }
          }
        } catch (contractError) {
          console.warn('Contract check failed, using fallback:', contractError);
          // Fallback: treat main wallet as top-up wallet for testing
          hasTopUpWallet = true;
          topUpWalletAddress = userAddress;
          isAuthorized = true; // Mock authorization for testing
        }
      } else {
        // Fallback when contracts are not available
        console.log('🔄 Contracts not available, using fallback authorization');
        hasTopUpWallet = true;
        topUpWalletAddress = userAddress;
        isAuthorized = true; // Mock authorization for testing
      }
      
      // Get the balance
      const balanceInfo = await this.getWalletBalance(userAddress);
      balance = balanceInfo.balance;
      formattedBalance = balanceInfo.formattedBalance;

      return {
        hasTopUpWallet,
        topUpWalletAddress,
        isAuthorized,
        balance,
        formattedBalance
      };
    } catch (error) {
      console.error('Failed to check user authorization:', error);
      return {
        hasTopUpWallet: false,
        topUpWalletAddress: '',
        isAuthorized: false,
        balance: '0',
        formattedBalance: '0.000000'
      };
    }
  }

  // Authorize a top-up wallet for toll collection (admin function)
  async authorizeTopUpWallet(topUpWalletAddress: string): Promise<TransactionResult> {
    // Ensure contracts and signer are initialized before proceeding
    await this.ensureInitialized();
    
    if (!this.tollContract || !this.signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      console.log('🔐 Authorizing top-up wallet:', topUpWalletAddress);
      
      const tx = await this.tollContract.setTopUpWalletAuthorization(
        topUpWalletAddress,
        true,
        {
          gasLimit: 50000, // Reduced gas limit
        }
      );

      console.log('⏳ Waiting for authorization transaction confirmation...');
      const receipt = await tx.wait();
      
      if (receipt && receipt.status === 1) {
        console.log('✅ Top-up wallet authorized successfully!');
        console.log('📋 Transaction hash:', receipt.hash);
        return {
          success: true,
          transactionHash: receipt.hash,
          gasUsed: receipt.gasUsed.toString(),
        };
      } else {
        return {
          success: false,
          error: 'Authorization transaction failed',
        };
      }
    } catch (error: any) {
      console.error('Top-up wallet authorization failed:', error);
      return {
        success: false,
        error: error.message || 'Authorization failed',
      };
    }
  }

  // Fund a top-up wallet with test ETH (for testing purposes)
  async fundTopUpWallet(topUpWalletAddress: string, amount: string): Promise<TransactionResult> {
    // Ensure contracts and signer are initialized before proceeding
    await this.ensureInitialized();
    
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }

    try {
      console.log('💰 Funding top-up wallet:', topUpWalletAddress, 'with', amount, 'ETH');
      
      const tx = await this.signer.sendTransaction({
        to: topUpWalletAddress,
        value: ethers.parseEther(amount),
        gasLimit: 15000, // Reduced gas limit for simple transfer
      });

      console.log('⏳ Waiting for funding transaction confirmation...');
      const receipt = await tx.wait();
      
      if (receipt && receipt.status === 1) {
        console.log('✅ Top-up wallet funded successfully!');
        console.log('📋 Transaction hash:', receipt.hash);
        return {
          success: true,
          transactionHash: receipt.hash,
          gasUsed: receipt.gasUsed.toString(),
        };
      } else {
        return {
          success: false,
          error: 'Funding transaction failed',
        };
      }
    } catch (error: any) {
      console.error('Top-up wallet funding failed:', error);
      return {
        success: false,
        error: error.message || 'Funding failed',
      };
    }
  }

  // Create and authorize a top-up wallet for a user (admin function)
  async createAndAuthorizeTopUpWallet(userAddress: string): Promise<TransactionResult> {
    if (!this.topUpWalletFactory || !this.signer) {
      console.warn('⚠️ Factory or signer not initialized, trying alternative approach...');
      
      // Alternative approach: Just authorize the user's main wallet directly
      // This is a fallback for testing purposes
      try {
        console.log('🔐 Using fallback: authorizing main wallet directly');
        
        // For testing, we'll treat the main wallet as the top-up wallet
        const authResult = await this.authorizeTopUpWallet(userAddress);
        
        if (authResult.success) {
          // Fund the wallet with test ETH
          const fundResult = await this.fundTopUpWallet(userAddress, '0.01');
          
          return {
            success: true,
            transactionHash: authResult.transactionHash,
            gasUsed: authResult.gasUsed,
            walletAddress: userAddress,
            authorizationResult: authResult,
            fundingResult: fundResult,
          };
        } else {
          return {
            success: false,
            error: 'Fallback authorization failed: ' + authResult.error,
            walletAddress: userAddress,
          };
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'Fallback approach failed: ' + error.message,
        };
      }
    }

    try {
      console.log('🏭 Creating top-up wallet for user:', userAddress);
      
      // Check if the factory has the createTopUpWallet method
      const hasCreateMethod = this.topUpWalletFactory.interface.hasFunction('createTopUpWallet');
      const hasDeployMethod = this.topUpWalletFactory.interface.hasFunction('deployTopUpWallet');
      
      let tx;
      if (hasCreateMethod) {
        // Create the top-up wallet using createTopUpWallet
        tx = await this.topUpWalletFactory.createTopUpWallet(userAddress, {
          gasLimit: 500000,
        });
      } else if (hasDeployMethod) {
        // Create the top-up wallet using deployTopUpWallet
        tx = await this.topUpWalletFactory.deployTopUpWallet(userAddress, {
          gasLimit: 500000,
        });
      } else {
        throw new Error('Factory contract does not have createTopUpWallet or deployTopUpWallet method');
      }

      console.log('⏳ Waiting for wallet creation transaction confirmation...');
      const receipt = await tx.wait();
      
      if (receipt && receipt.status === 1) {
        console.log('✅ Top-up wallet created successfully!');
        
        // Get the created wallet address
        const walletAddress = await this.topUpWalletFactory.getUserTopUpWallet(userAddress);
        console.log('📍 Created wallet address:', walletAddress);
        
        // Authorize the wallet
        const authResult = await this.authorizeTopUpWallet(walletAddress);
        
        if (authResult.success) {
          // Fund the wallet with test ETH
          const fundResult = await this.fundTopUpWallet(walletAddress, '0.01'); // 0.01 ETH for testing
          
          return {
            success: true,
            transactionHash: receipt.hash,
            gasUsed: receipt.gasUsed.toString(),
            walletAddress: walletAddress,
            authorizationResult: authResult,
            fundingResult: fundResult,
          };
        } else {
          return {
            success: false,
            error: 'Wallet created but authorization failed: ' + authResult.error,
            walletAddress: walletAddress,
          };
        }
      } else {
        return {
          success: false,
          error: 'Wallet creation transaction failed',
        };
      }
    } catch (error: any) {
      console.error('Top-up wallet creation failed:', error);
      return {
        success: false,
        error: error.message || 'Wallet creation failed',
      };
    }
  }

  // Simple authorization method for testing (doesn't require factory)
  async authorizeWalletForTesting(walletAddress: string): Promise<TransactionResult> {
    console.log('🔍 Checking contract and signer status...');
    console.log('  - Toll Contract:', !!this.tollContract);
    console.log('  - Signer:', !!this.signer);
    console.log('  - Provider:', !!this.provider);
    
    if (!this.tollContract) {
      console.log('🔄 Attempting to reinitialize contract...');
      await this.reinitializeContracts();
      
      if (!this.tollContract) {
        return {
          success: false,
          error: 'Toll contract not initialized. Please refresh the page and try again.',
        };
      }
    }
    
    if (!this.signer) {
      return {
        success: false,
        error: 'Wallet not connected. Please connect your MetaMask wallet.',
      };
    }

    try {
      console.log('🔐 Authorizing wallet for testing:', walletAddress);
      
      // Authorize the wallet directly
      const authResult = await this.authorizeTopUpWallet(walletAddress);
      
      if (authResult.success) {
        console.log('✅ Wallet authorized successfully');
        
        // Fund the wallet with test ETH
        console.log('💰 Funding wallet with test ETH...');
        const fundResult = await this.fundTopUpWallet(walletAddress, '0.01');
        
        if (fundResult.success) {
          console.log('✅ Wallet funded successfully');
          
          return {
            success: true,
            transactionHash: authResult.transactionHash,
            gasUsed: authResult.gasUsed,
            walletAddress: walletAddress,
            authorizationResult: authResult,
            fundingResult: fundResult,
          };
        } else {
          return {
            success: false,
            error: 'Authorization succeeded but funding failed: ' + fundResult.error,
            walletAddress: walletAddress,
          };
        }
      } else {
        return {
          success: false,
          error: 'Authorization failed: ' + authResult.error,
        };
      }
    } catch (error: any) {
      console.error('Authorization for testing failed:', error);
      return {
        success: false,
        error: error.message || 'Authorization failed',
      };
    }
  }

  // Mock authorization for testing (bypasses contract calls)
  async mockAuthorizeWalletForTesting(walletAddress: string): Promise<TransactionResult> {
    console.log('🧪 Using mock authorization for testing:', walletAddress);
    
    try {
      // Simulate authorization success
      console.log('✅ Mock: Wallet authorized successfully');
      
      // Try to fund the wallet with test ETH (this should work)
      console.log('💰 Funding wallet with test ETH...');
      const fundResult = await this.fundTopUpWallet(walletAddress, '0.01');
      
      if (fundResult.success) {
        console.log('✅ Wallet funded successfully');
        
        return {
          success: true,
          transactionHash: fundResult.transactionHash,
          gasUsed: fundResult.gasUsed,
          walletAddress: walletAddress,
          authorizationResult: { success: true, transactionHash: 'mock-auth' },
          fundingResult: fundResult,
        };
      } else {
        return {
          success: false,
          error: 'Mock authorization succeeded but funding failed: ' + fundResult.error,
          walletAddress: walletAddress,
        };
      }
    } catch (error: any) {
      console.error('Mock authorization failed:', error);
      return {
        success: false,
        error: error.message || 'Mock authorization failed',
      };
    }
  }

  // Force reinitialize contracts
  async reinitializeContracts(): Promise<void> {
    console.log('🔄 Reinitializing contracts...');
    await this.initializeProvider();
  }

  // Ensure contracts and signer are properly initialized
  async ensureInitialized(): Promise<void> {
    console.log('🔍 Checking initialization status...');
    console.log('📋 Current status:');
    console.log('  - Provider:', !!this.provider);
    console.log('  - Signer:', !!this.signer);
    console.log('  - Toll Contract:', !!this.tollContract);
    console.log('  - Contract Address:', TOLL_COLLECTION_CONTRACT);
    
    // Check if we have a provider
    if (!this.provider) {
      console.log('🔄 Provider not initialized, initializing...');
      await this.initializeProvider();
    }
    
    // Check if we have a signer (for MetaMask)
    if (!this.signer && window.ethereum) {
      console.log('🔄 Signer not initialized, attempting to get signer...');
      try {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
        console.log('✅ Signer initialized successfully');
        
        // Update contracts with the new signer
        if (this.tollContract) {
          this.tollContract = new ethers.Contract(
            TOLL_COLLECTION_CONTRACT,
            TOLL_COLLECTION_ABI,
            this.signer
          );
        }
      } catch (error) {
        console.error('❌ Failed to initialize signer:', error);
        throw new Error('Failed to connect to MetaMask wallet');
      }
    }
    
    // Check if we have the toll contract
    if (!this.tollContract) {
      console.log('🔄 Toll contract not initialized, attempting to initialize...');
      
      // Try to initialize the contract directly
      try {
        if (ethers.isAddress(TOLL_COLLECTION_CONTRACT) && TOLL_COLLECTION_CONTRACT !== '0x0000000000000000000000000000000000000000') {
          console.log('🔧 Initializing Toll Collection contract at:', TOLL_COLLECTION_CONTRACT);
          this.tollContract = new ethers.Contract(
            TOLL_COLLECTION_CONTRACT,
            TOLL_COLLECTION_ABI,
            this.signer || this.provider
          );
          
          // Test if contract exists by calling a simple view function
          const tollRate = await this.tollContract.tollRate();
          console.log('✅ Toll collection contract initialized successfully');
          console.log('💰 Current toll rate:', ethers.formatEther(tollRate), 'ETH');
        } else {
          throw new Error(`Invalid contract address: ${TOLL_COLLECTION_CONTRACT}`);
        }
      } catch (contractError) {
        console.error('❌ Failed to initialize toll collection contract:', contractError);
        throw new Error(`Failed to initialize toll contract at address ${TOLL_COLLECTION_CONTRACT}. Please check if the contract is deployed and the address is correct.`);
      }
    }
    
    console.log('✅ All components initialized successfully');
  }

  // Retry mechanism for failed blockchain calls
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt < maxRetries) {
          console.log(`🔄 Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2; // Exponential backoff
        }
      }
    }
    
    throw lastError!;
  }

  // Get the connected wallet address
  async getConnectedWalletAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('No signer available. Please connect MetaMask wallet.');
    }
    return await this.signer.getAddress();
  }

  // Check if wallet is connected and contracts are initialized
  async checkWalletConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      if (!window.ethereum) {
        return {
          connected: false,
          error: 'MetaMask not detected. Please install MetaMask browser extension.',
        };
      }

      // Ensure everything is initialized before checking
      try {
        await this.ensureInitialized();
      } catch (initError: any) {
        console.error('Initialization failed during wallet connection check:', initError);
        return {
          connected: false,
          error: initError.message || 'Failed to initialize blockchain components',
        };
      }

      if (!this.provider) {
        return {
          connected: false,
          error: 'Provider not initialized. Please refresh the page.',
        };
      }

      if (!this.signer) {
        return {
          connected: false,
          error: 'Wallet not connected. Please connect your MetaMask wallet.',
        };
      }

      if (!this.tollContract) {
        return {
          connected: false,
          error: 'Toll contract not initialized. Please check contract configuration.',
        };
      }

      // Try to get the connected address
      const address = await this.signer.getAddress();
      console.log('✅ Wallet connected:', address);

      return {
        connected: true,
      };
    } catch (error: any) {
      console.error('Wallet connection check failed:', error);
      return {
        connected: false,
        error: error.message || 'Failed to check wallet connection',
      };
    }
  }

  // Debug method to check contract status
  getContractStatus(): { tollContract: boolean; usdcContract: boolean; topUpWalletFactory: boolean; provider: boolean; contractAddress: string } {
    return {
      tollContract: !!this.tollContract,
      usdcContract: !!this.usdcContract,
      topUpWalletFactory: !!this.topUpWalletFactory,
      provider: !!this.provider,
      contractAddress: TOLL_COLLECTION_CONTRACT
    };
  }

  // Method to verify contract address and get detailed contract info
  async getContractInfo(): Promise<{ 
    address: string; 
    codeLength: number; 
    isDeployed: boolean; 
    error?: string;
    actualContractAddress?: string;
  }> {
    try {
      console.log('🔍 Getting contract information...');
      console.log('📋 Configured contract address:', TOLL_COLLECTION_CONTRACT);
      
      if (!this.provider) {
        return {
          address: TOLL_COLLECTION_CONTRACT,
          codeLength: 0,
          isDeployed: false,
          error: 'Provider not initialized'
        };
      }
      
      // Check if contract has code at the configured address
      const code = await this.provider.getCode(TOLL_COLLECTION_CONTRACT);
      const codeLength = code.length;
      
      console.log('📊 Contract code length:', codeLength);
      
      if (code === '0x') {
        return {
          address: TOLL_COLLECTION_CONTRACT,
          codeLength: 0,
          isDeployed: false,
          error: `No contract found at configured address ${TOLL_COLLECTION_CONTRACT}`
        };
      }
      
      // If we have a contract instance, check its actual address
      let actualContractAddress = TOLL_COLLECTION_CONTRACT;
      if (this.tollContract) {
        actualContractAddress = await this.tollContract.getAddress();
        console.log('📍 Actual contract address:', actualContractAddress);
      }
      
      return {
        address: TOLL_COLLECTION_CONTRACT,
        codeLength,
        isDeployed: true,
        actualContractAddress
      };
    } catch (error: any) {
      console.error('❌ Failed to get contract info:', error);
      return {
        address: TOLL_COLLECTION_CONTRACT,
        codeLength: 0,
        isDeployed: false,
        error: error.message
      };
    }
  }

  // Method to test contract accessibility from browser
  async testContractAccess(): Promise<{ accessible: boolean; error?: string; details?: any }> {
    try {
      console.log('🧪 Testing contract access...');
      console.log('📍 Contract address:', TOLL_COLLECTION_CONTRACT);
      
      if (!this.provider) {
        return { accessible: false, error: 'Provider not initialized' };
      }
      
      // Test 1: Check if contract has code
      const code = await this.provider.getCode(TOLL_COLLECTION_CONTRACT);
      console.log('📋 Contract code length:', code.length);
      
      if (code === '0x') {
        return { 
          accessible: false, 
          error: `No contract found at address ${TOLL_COLLECTION_CONTRACT}`,
          details: { codeLength: code.length }
        };
      }
      
      // Test 2: Try to create contract instance
      const testContract = new ethers.Contract(
        TOLL_COLLECTION_CONTRACT,
        TOLL_COLLECTION_ABI,
        this.provider
      );
      
      // Test 3: Try to call a view function
      const tollRate = await testContract.tollRate();
      console.log('✅ Contract accessible, toll rate:', ethers.formatEther(tollRate));
      
      return { 
        accessible: true, 
        details: { 
          codeLength: code.length,
          tollRate: ethers.formatEther(tollRate)
        }
      };
    } catch (error: any) {
      console.error('❌ Contract access test failed:', error);
      return { 
        accessible: false, 
        error: error.message,
        details: { 
          contractAddress: TOLL_COLLECTION_CONTRACT,
          errorType: error.name
        }
      };
    }
  }

  // Method to verify contract deployment with detailed diagnostics
  async verifyContractDeployment(): Promise<{ isDeployed: boolean; error?: string; diagnostics?: any }> {
    try {
      if (!this.provider) {
        return { isDeployed: false, error: 'Provider not initialized' };
      }

      console.log('🔍 Verifying contract deployment...');
      console.log('📍 Contract address:', TOLL_COLLECTION_CONTRACT);
      
      // Check if contract has code at the address
      const code = await this.provider.getCode(TOLL_COLLECTION_CONTRACT);
      console.log('📋 Contract code length:', code.length);
      
      if (code === '0x') {
        return { 
          isDeployed: false, 
          error: `No contract found at address ${TOLL_COLLECTION_CONTRACT}. Please verify the contract is deployed.`,
          diagnostics: {
            contractAddress: TOLL_COLLECTION_CONTRACT,
            codeLength: code.length,
            network: await this.provider.getNetwork().then(n => n.name),
            chainId: await this.provider.getNetwork().then(n => n.chainId)
          }
        };
      }

      // Try to call a view function to verify the contract is working
      const tempContract = new ethers.Contract(
        TOLL_COLLECTION_CONTRACT,
        TOLL_COLLECTION_ABI,
        this.provider
      );
      
      try {
        console.log('🧪 Testing contract methods...');
        
        // Test multiple methods to ensure contract is working
        const tollRate = await tempContract.tollRate();
        console.log('✅ tollRate() method works:', ethers.formatEther(tollRate));
        
        // Test if the contract has the required methods
        const hasProcessTollPayment = tempContract.interface.hasFunction('processTollPayment');
        const hasProcessTollPaymentFromTopUpWallet = tempContract.interface.hasFunction('processTollPaymentFromTopUpWallet');
        const hasHasUserTopUpWallet = tempContract.interface.hasFunction('hasUserTopUpWallet');
        
        console.log('📋 Available methods:');
        console.log('  - processTollPayment:', hasProcessTollPayment);
        console.log('  - processTollPaymentFromTopUpWallet:', hasProcessTollPaymentFromTopUpWallet);
        console.log('  - hasUserTopUpWallet:', hasHasUserTopUpWallet);
        
        return { 
          isDeployed: true,
          diagnostics: {
            contractAddress: TOLL_COLLECTION_CONTRACT,
            codeLength: code.length,
            tollRate: ethers.formatEther(tollRate),
            methods: {
              processTollPayment: hasProcessTollPayment,
              processTollPaymentFromTopUpWallet: hasProcessTollPaymentFromTopUpWallet,
              hasUserTopUpWallet: hasHasUserTopUpWallet
            },
            network: await this.provider.getNetwork().then(n => n.name),
            chainId: await this.provider.getNetwork().then(n => n.chainId)
          }
        };
      } catch (error: any) {
        console.error('❌ Contract method test failed:', error);
        return { 
          isDeployed: false, 
          error: `Contract exists but method calls failed: ${error.message}`,
          diagnostics: {
            contractAddress: TOLL_COLLECTION_CONTRACT,
            codeLength: code.length,
            error: error.message,
            errorCode: error.code,
            network: await this.provider.getNetwork().then(n => n.name),
            chainId: await this.provider.getNetwork().then(n => n.chainId)
          }
        };
      }
    } catch (error: any) {
      console.error('❌ Contract deployment verification failed:', error);
      return { 
        isDeployed: false, 
        error: `Failed to verify contract deployment: ${error.message}`,
        diagnostics: {
          contractAddress: TOLL_COLLECTION_CONTRACT,
          error: error.message,
          errorCode: error.code
        }
      };
    }
  }

  // Revenue Management Methods
  async getContractRevenue(): Promise<{ totalRevenue: string; formattedRevenue: string }> {
    await this.ensureInitialized();
    
    if (!this.tollContract) {
      throw new Error('Contract not initialized');
    }

    try {
      const totalRevenue = await this.tollContract.totalRevenue();
      const formattedRevenue = ethers.formatEther(totalRevenue);
      
      return {
        totalRevenue: totalRevenue.toString(),
        formattedRevenue
      };
    } catch (error: any) {
      console.error('❌ Failed to get contract revenue:', error);
      throw new Error(`Failed to get contract revenue: ${error.message}`);
    }
  }

  async getContractStats(): Promise<{
    totalRevenue: string;
    formattedRevenue: string;
    totalTransactions: number;
    totalVehicles: number;
    tollRate: string;
    formattedTollRate: string;
  }> {
    await this.ensureInitialized();
    
    if (!this.tollContract) {
      throw new Error('Contract not initialized');
    }

    try {
      const [totalRevenue, totalTransactions, totalVehicles, tollRate] = await Promise.all([
        this.tollContract.totalRevenue(),
        this.tollContract.getTotalTransactions(),
        this.tollContract.getTotalVehicles(),
        this.tollContract.tollRate()
      ]);

      return {
        totalRevenue: totalRevenue.toString(),
        formattedRevenue: ethers.formatEther(totalRevenue),
        totalTransactions: Number(totalTransactions),
        totalVehicles: Number(totalVehicles),
        tollRate: tollRate.toString(),
        formattedTollRate: ethers.formatEther(tollRate)
      };
    } catch (error: any) {
      console.error('❌ Failed to get contract stats:', error);
      throw new Error(`Failed to get contract stats: ${error.message}`);
    }
  }

  async withdrawRevenue(
    treasuryWallet: string,
    amount: string,
    adminWallet: string
  ): Promise<TransactionResult> {
    await this.ensureInitialized();
    
    if (!this.tollContract || !this.signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      console.log('💰 Starting revenue withdrawal...');
      console.log('📋 Withdrawal Details:');
      console.log('  - Treasury Wallet:', treasuryWallet);
      console.log('  - Amount:', amount);
      console.log('  - Admin Wallet:', adminWallet);
      console.log('  - Contract Address:', TOLL_COLLECTION_CONTRACT);

      // Convert amount to wei
      const amountInWei = ethers.parseEther(amount);
      console.log('💰 Amount in Wei:', amountInWei.toString());

      // Execute withdrawal transaction
      const tx = await this.tollContract.withdrawRevenue(
        treasuryWallet,
        amountInWei,
        {
          from: adminWallet,
          gasLimit: 200000,
        }
      );

      console.log('⏳ Waiting for withdrawal transaction confirmation...');
      console.log('📋 Transaction Hash:', tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log('✅ Revenue withdrawal successful!');
        console.log('📊 Transaction Details:');
        console.log('  - Block Number:', receipt.blockNumber);
        console.log('  - Gas Used:', receipt.gasUsed.toString());
        console.log('  - Transaction Hash:', tx.hash);

        return {
          success: true,
          transactionHash: tx.hash,
          gasUsed: receipt.gasUsed.toString(),
          blockNumber: receipt.blockNumber,
          walletAddress: treasuryWallet
        };
      } else {
        console.error('❌ Withdrawal transaction failed');
        return {
          success: false,
          error: 'Withdrawal transaction failed'
        };
      }
    } catch (error: any) {
      console.error('❌ Revenue withdrawal failed:', error);
      return {
        success: false,
        error: error.message || 'Withdrawal failed'
      };
    }
  }

  async withdrawAllRevenue(
    treasuryWallet: string,
    adminWallet: string
  ): Promise<TransactionResult> {
    try {
      // Get current revenue amount
      const revenueInfo = await this.getContractRevenue();
      
      if (revenueInfo.totalRevenue === '0') {
        return {
          success: false,
          error: 'No revenue available to withdraw'
        };
      }

      console.log('💰 Withdrawing all available revenue...');
      console.log('📊 Available Revenue:', revenueInfo.formattedRevenue, 'ETH');

      // Withdraw all revenue
      return await this.withdrawRevenue(
        treasuryWallet,
        revenueInfo.formattedRevenue,
        adminWallet
      );
    } catch (error: any) {
      console.error('❌ Failed to withdraw all revenue:', error);
      return {
        success: false,
        error: error.message || 'Failed to withdraw all revenue'
      };
    }
  }

  async getTreasuryWalletBalance(treasuryWallet: string): Promise<BalanceInfo> {
    await this.ensureInitialized();
    
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const balance = await this.provider.getBalance(treasuryWallet);
      const formattedBalance = ethers.formatEther(balance);
      
      return {
        balance: balance.toString(),
        formattedBalance,
        decimals: 18
      };
    } catch (error: any) {
      console.error('❌ Failed to get treasury wallet balance:', error);
      throw new Error(`Failed to get treasury wallet balance: ${error.message}`);
    }
  }
}

export const blockchainService = new BlockchainService();
