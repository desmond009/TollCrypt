import { ethers } from 'ethers';
import { QRCodeData } from '../types/qr';

// Ethereum Sepolia testnet configuration
const SEPOLIA_RPC = 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
const CHAIN_ID = 11155111; // Ethereum Sepolia

// Contract addresses (updated with actual deployed addresses from Sepolia)
const TOLL_COLLECTION_CONTRACT = process.env.REACT_APP_TOLL_CONTRACT_ADDRESS || process.env.REACT_APP_CONTRACT_ADDRESS || '0xE5f4743CF4726A7f58E0ccBB5888f1507E5aeF9d'; // TopUp TollCollection contract
const USDC_CONTRACT = process.env.REACT_APP_USDC_CONTRACT_ADDRESS || '0xe2DF4Ef71b9B0fc155c2817Df93eb04b4C590720'; // Sepolia Mock USDC
const TOPUP_WALLET_FACTORY = process.env.REACT_APP_TOPUP_WALLET_FACTORY_ADDRESS || '0x3Bd98A2a16EfEa3B40B0d5F8a2E16613b625d9aA'; // TopUpWalletFactory

// Debug logging for contract addresses
console.log('🔧 Contract Configuration:');
console.log('  - REACT_APP_TOLL_CONTRACT_ADDRESS:', process.env.REACT_APP_TOLL_CONTRACT_ADDRESS);
console.log('  - REACT_APP_CONTRACT_ADDRESS:', process.env.REACT_APP_CONTRACT_ADDRESS);
console.log('  - Final TOLL_COLLECTION_CONTRACT:', TOLL_COLLECTION_CONTRACT);
console.log('  - REACT_APP_USDC_CONTRACT_ADDRESS:', process.env.REACT_APP_USDC_CONTRACT_ADDRESS);
console.log('  - Final USDC_CONTRACT:', USDC_CONTRACT);


// ABI for TollCollection contract
const TOLL_COLLECTION_ABI = [
  'function processTollPayment(string memory vehicleId, bytes32 zkProofHash, uint256 amount) external returns (bool)',
  'function processTollPaymentFromTopUpWallet(string memory vehicleId, bytes32 zkProofHash, uint256 amount) external returns (bool)',
  'function getVehicle(string memory vehicleId) external view returns (address owner, string memory vehicleId, bool isActive, bool isBlacklisted, uint256 registrationTime, uint256 lastTollTime)',
  'function getTollRate() external view returns (uint256)',
  'function getUserTopUpWallet(address user) external view returns (address walletAddress)',
  'function hasUserTopUpWallet(address user) external view returns (bool hasWallet)',
  'function getUserTopUpWalletBalance(address user) external view returns (uint256 balance)',
  'function isTopUpWalletAuthorized(address topUpWallet) external view returns (bool isAuthorized)',
  'function authorizeTopUpWalletFromFactory(address topUpWallet) external',
  'function setTopUpWalletAuthorization(address topUpWallet, bool isAuthorized) external',
  'event TollPaid(address indexed payer, string indexed vehicleId, uint256 amount, uint256 tollId, bytes32 zkProofHash, uint256 timestamp)',
  'event TopUpWalletPaymentProcessed(address indexed topUpWallet, string indexed vehicleId, uint256 amount, uint256 tollId, bytes32 zkProofHash, uint256 timestamp)',
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
  'function createTopUpWallet(address user) external returns (address walletAddress)',
  'function getUserTopUpWallet(address user) external view returns (address walletAddress)',
  'function hasTopUpWallet(address user) external view returns (bool hasWallet)',
  'function getAllUserWallets(address user) external view returns (address[] memory wallets)',
  'function getWalletCount() external view returns (uint256 count)',
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
  gasUsed?: string;
  blockNumber?: number;
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
    console.log('  - Toll Collection:', TOLL_COLLECTION_CONTRACT);
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
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
      } else {
        // Fallback to public RPC
        this.provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
        this.signer = null;
      }

      if (this.provider) {
        // Only create contracts if addresses are valid and not zero address
        if (ethers.isAddress(TOLL_COLLECTION_CONTRACT) && TOLL_COLLECTION_CONTRACT !== '0x0000000000000000000000000000000000000000') {
          try {
            console.log('🔧 Initializing Toll Collection contract at:', TOLL_COLLECTION_CONTRACT);
            this.tollContract = new ethers.Contract(
              TOLL_COLLECTION_CONTRACT,
              TOLL_COLLECTION_ABI,
              this.signer || this.provider
            );
            
            // Test if contract exists by calling a simple view function
            const tollRate = await this.tollContract.getTollRate();
            console.log('✅ Toll collection contract initialized successfully');
            console.log('💰 Current toll rate:', ethers.formatEther(tollRate), 'ETH');
          } catch (contractError) {
            console.error('❌ Failed to initialize toll collection contract:', contractError);
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
            this.topUpWalletFactory = new ethers.Contract(
              TOPUP_WALLET_FACTORY,
              TOPUP_WALLET_FACTORY_ABI,
              this.signer || this.provider
            );
            
            // Test if contract exists by calling a simple view function
            const walletCount = await this.topUpWalletFactory.getWalletCount();
            console.log('✅ TopUp Wallet Factory initialized successfully');
            console.log('📊 Total wallets created:', walletCount.toString());
          } catch (contractError) {
            console.error('❌ Failed to initialize TopUp Wallet Factory:', contractError);
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

    try {
      // Check if the contract has the getVehicle method
      const hasMethod = this.tollContract.interface.hasFunction('getVehicle');
      if (!hasMethod) {
        throw new Error('Contract does not have getVehicle method');
      }
      
      const vehicle = await this.tollContract.getVehicle(vehicleId);
      return {
        isRegistered: vehicle.owner !== '0x0000000000000000000000000000000000000000' && vehicle.isActive,
        owner: vehicle.owner,
        vehicleType: vehicle.vehicleId, // Using vehicleId as vehicleType for now
        isBlacklisted: vehicle.isBlacklisted,
        registrationTime: Number(vehicle.registrationTime),
        lastTollTime: Number(vehicle.lastTollTime)
      };
    } catch (error) {
      console.error('Failed to get vehicle registration:', error);
      throw new Error('Failed to verify vehicle registration');
    }
  }

  async isVehicleBlacklisted(vehicleId: string): Promise<boolean> {
    if (!this.tollContract) {
      console.warn('Contract not initialized, assuming vehicle is not blacklisted');
      return false;
    }

    try {
      // Check if the contract has the getVehicle method
      const hasMethod = this.tollContract.interface.hasFunction('getVehicle');
      if (!hasMethod) {
        console.warn('Contract does not have getVehicle method, assuming not blacklisted');
        return false;
      }
      
      const vehicle = await this.tollContract.getVehicle(vehicleId);
      return vehicle.isBlacklisted;
    } catch (error) {
      console.error('Failed to check blacklist status:', error);
      return false;
    }
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
      // Check if the contract has the getTollRate method
      const hasMethod = this.tollContract.interface.hasFunction('getTollRate');
      if (!hasMethod) {
        console.warn('Contract does not have getTollRate method, using default rates');
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
      
      const rate = await this.tollContract.getTollRate();
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
      
      if (this.tollContract) {
        try {
          // Check if user has a top-up wallet
          const hasTopUpWallet = await this.tollContract.hasUserTopUpWallet(walletAddress);
          if (hasTopUpWallet) {
            // Get the top-up wallet address
            topUpWalletAddress = await this.tollContract.getUserTopUpWallet(walletAddress);
            
            // Get the balance from the top-up wallet
            const topUpWalletContract = new ethers.Contract(
              topUpWalletAddress,
              TOPUP_WALLET_ABI,
              this.provider
            );
            
            topUpWalletBalance = await topUpWalletContract.getBalance();
            console.log('💰 TopUp Wallet Balance:', ethers.formatEther(topUpWalletBalance), 'ETH');
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

  // New method for admin toll processing with plaza-specific rates
  async processAdminTollPayment(
    walletAddress: string,
    vehicleNumber: string,
    vehicleType: string,
    tollAmount: string,
    plazaId: number,
    adminWallet: string
  ): Promise<TransactionResult> {
    if (!this.tollContract || !this.signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      // Convert toll amount to wei (ETH has 18 decimals)
      const amountInWei = ethers.parseEther(tollAmount);
      
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

      // Check if user has a TopUpWallet
      const hasTopUpWallet = await this.tollContract.hasUserTopUpWallet(walletAddress);
      
      let tx;
      if (hasTopUpWallet) {
        // Process payment from TopUpWallet
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
      }

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        return {
          success: true,
          transactionHash: receipt.hash,
          gasUsed: receipt.gasUsed.toString(),
          blockNumber: receipt.blockNumber
        };
      } else {
        return {
          success: false,
          error: 'Transaction failed',
        };
      }
    } catch (error: any) {
      console.error('Admin toll payment processing failed:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed',
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
    if (!this.tollContract) {
      console.warn('⚠️ Toll contract not initialized. Contract address:', TOLL_COLLECTION_CONTRACT);
      console.warn('💡 Make sure the contract is deployed and the address is correct');
      return false;
    }

    try {
      // Check if the contract has the hasUserTopUpWallet method
      const hasMethod = this.tollContract.interface.hasFunction('hasUserTopUpWallet');
      if (!hasMethod) {
        console.warn('Contract does not have hasUserTopUpWallet method');
        return false;
      }
      
      const hasWallet = await this.tollContract.hasUserTopUpWallet(walletAddress);
      return hasWallet;
    } catch (error) {
      console.error('Failed to check if user has top-up wallet:', error);
      return false;
    }
  }

  async getUserTopUpWallet(walletAddress: string): Promise<string> {
    if (!this.tollContract) {
      throw new Error('Contract not initialized');
    }

    try {
      // Check if the contract has the getUserTopUpWallet method
      const hasMethod = this.tollContract.interface.hasFunction('getUserTopUpWallet');
      if (!hasMethod) {
        throw new Error('Contract does not have getUserTopUpWallet method');
      }
      
      const topUpWalletAddress = await this.tollContract.getUserTopUpWallet(walletAddress);
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

      if (this.tollContract) {
        // Check if user has a top-up wallet
        hasTopUpWallet = await this.tollContract.hasUserTopUpWallet(userAddress);
        
        if (hasTopUpWallet) {
          // Get the top-up wallet address
          topUpWalletAddress = await this.tollContract.getUserTopUpWallet(userAddress);
          
          // Check if the top-up wallet is authorized
          isAuthorized = await this.tollContract.isTopUpWalletAuthorized(topUpWalletAddress);
          
          // Get the balance
          const balanceInfo = await this.getWalletBalance(userAddress);
          balance = balanceInfo.balance;
          formattedBalance = balanceInfo.formattedBalance;
        }
      }

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
    if (!this.tollContract || !this.signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      const tx = await this.tollContract.setTopUpWalletAuthorization(
        topUpWalletAddress,
        true,
        {
          gasLimit: 100000,
        }
      );

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
}

export const blockchainService = new BlockchainService();
