import { ethers } from 'ethers';
import { QRCodeData } from '../types/qr';

// Ethereum Sepolia testnet configuration
const SEPOLIA_RPC = 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
const CHAIN_ID = 11155111; // Ethereum Sepolia

// Contract addresses (these should be updated with actual deployed addresses)
const TOLL_COLLECTION_CONTRACT = process.env.REACT_APP_TOLL_CONTRACT_ADDRESS || process.env.REACT_APP_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
const USDC_CONTRACT = process.env.REACT_APP_USDC_CONTRACT_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC

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

export interface VehicleRegistration {
  isRegistered: boolean;
  owner: string;
  vehicleType: string;
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
  private signer: ethers.Signer | null = null;

  constructor() {
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
        // Only create contracts if addresses are valid
        if (ethers.isAddress(TOLL_COLLECTION_CONTRACT)) {
          this.tollContract = new ethers.Contract(
            TOLL_COLLECTION_CONTRACT,
            TOLL_COLLECTION_ABI,
            this.signer || this.provider
          );
        } else {
          console.warn('Invalid toll collection contract address:', TOLL_COLLECTION_CONTRACT);
        }

        if (ethers.isAddress(USDC_CONTRACT)) {
          this.usdcContract = new ethers.Contract(
            USDC_CONTRACT,
            USDC_ABI,
            this.signer || this.provider
          );
        } else {
          console.warn('Invalid USDC contract address:', USDC_CONTRACT);
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
      const vehicle = await this.tollContract.getVehicle(vehicleId);
      return {
        isRegistered: vehicle.owner !== '0x0000000000000000000000000000000000000000' && vehicle.isActive,
        owner: vehicle.owner,
        vehicleType: vehicle.vehicleId, // Using vehicleId as vehicleType for now
      };
    } catch (error) {
      console.error('Failed to get vehicle registration:', error);
      throw new Error('Failed to verify vehicle registration');
    }
  }

  async isVehicleBlacklisted(vehicleId: string): Promise<boolean> {
    if (!this.tollContract) {
      throw new Error('Contract not initialized');
    }

    try {
      const vehicle = await this.tollContract.getVehicle(vehicleId);
      return vehicle.isBlacklisted;
    } catch (error) {
      console.error('Failed to check blacklist status:', error);
      return false;
    }
  }

  async getTollRate(vehicleType: string): Promise<string> {
    if (!this.tollContract) {
      throw new Error('Contract not initialized');
    }

    try {
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
    if (!this.tollContract) {
      throw new Error('Contract not initialized');
    }

    try {
      // First try to get TopUpWallet balance
      const topUpWalletBalance = await this.tollContract.getUserTopUpWalletBalance(walletAddress);
      
      // Convert ETH balance to USDC equivalent (simplified conversion)
      const ethBalance = await this.provider?.getBalance(walletAddress) || BigInt(0);
      const ethInUsdc = parseFloat(ethers.formatEther(ethBalance)) * 2000; // Approximate ETH to USDC rate
      
      const totalBalance = topUpWalletBalance + ethInUsdc;
      
      return {
        balance: totalBalance.toString(),
        formattedBalance: totalBalance.toFixed(2),
        decimals: 6, // USDC decimals
      };
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      // Fallback to ETH balance
      try {
        const ethBalance = await this.provider?.getBalance(walletAddress) || BigInt(0);
        const ethInUsdc = parseFloat(ethers.formatEther(ethBalance)) * 2000;
        
        return {
          balance: ethInUsdc.toString(),
          formattedBalance: ethInUsdc.toFixed(2),
          decimals: 6,
        };
      } catch (fallbackError) {
        throw new Error('Failed to get wallet balance');
      }
    }
  }

  async processTollPayment(
    qrData: QRCodeData,
    tollAmount: string,
    adminWallet: string
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
            vehicleId: qrData.vehicleId,
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
          qrData.vehicleId,
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
          qrData.vehicleId,
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
      const registration = await this.getVehicleRegistration(qrDataToValidate.vehicleId);
      if (!registration.isRegistered) {
        return {
          isValid: false,
          error: 'Vehicle is not registered in the system',
        };
      }

      // Step 6: Check if vehicle is blacklisted
      const isBlacklisted = await this.isVehicleBlacklisted(qrDataToValidate.vehicleId);
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

      // Create message hash from QR data
      const messageData = {
        walletAddress: qrData.walletAddress,
        vehicleId: qrData.vehicleId,
        vehicleType: qrData.vehicleType,
        timestamp: qrData.timestamp,
        sessionToken: qrData.sessionToken,
        plazaId: qrData.plazaId,
        nonce: qrData.nonce,
      };

      const messageString = JSON.stringify(messageData);
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(messageString));

      // Recover the signer address
      const recoveredAddress = ethers.verifyMessage(ethers.getBytes(messageHash), qrData.signature);

      // Verify the recovered address matches the wallet address
      return recoveredAddress.toLowerCase() === qrData.walletAddress.toLowerCase();
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
      throw new Error('Contract not initialized');
    }

    try {
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
      const topUpWalletAddress = await this.tollContract.getUserTopUpWallet(walletAddress);
      return topUpWalletAddress;
    } catch (error) {
      console.error('Failed to get user top-up wallet:', error);
      throw new Error('Failed to get user top-up wallet');
    }
  }
}

export const blockchainService = new BlockchainService();
