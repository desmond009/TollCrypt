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
  'function processTollPayment(address userWallet, string memory vehicleId, uint256 amount, uint256 timestamp) external returns (bool)',
  'function getVehicleRegistration(string memory vehicleId) external view returns (bool isRegistered, address owner, string memory vehicleType)',
  'function getTollRate(string memory vehicleType) external view returns (uint256)',
  'function isVehicleBlacklisted(string memory vehicleId) external view returns (bool)',
  'event TollPaymentProcessed(address indexed user, string indexed vehicleId, uint256 amount, uint256 timestamp)',
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
      const [isRegistered, owner, vehicleType] = await this.tollContract.getVehicleRegistration(vehicleId);
      return {
        isRegistered,
        owner,
        vehicleType,
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
      return await this.tollContract.isVehicleBlacklisted(vehicleId);
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
      const rate = await this.tollContract.getTollRate(vehicleType);
      return rate.toString();
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

  async processTollPayment(
    qrData: QRCodeData,
    tollAmount: string,
    adminWallet: string
  ): Promise<TransactionResult> {
    if (!this.tollContract || !this.signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      // Convert toll amount to wei (USDC has 6 decimals)
      const amountInWei = ethers.parseUnits(tollAmount, 6);
      
      // Call the smart contract function
      const tx = await this.tollContract.processTollPayment(
        qrData.walletAddress,
        qrData.vehicleId,
        amountInWei,
        qrData.timestamp,
        {
          from: adminWallet,
          gasLimit: 300000, // Adjust gas limit as needed
        }
      );

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
      // Check if QR code is not too old (5 minutes)
      const now = Date.now();
      const qrAge = now - qrData.timestamp;
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (qrAge > maxAge) {
        return {
          isValid: false,
          error: 'QR code has expired. Please generate a new one.',
        };
      }

      // Validate required fields
      if (!qrData.walletAddress || !qrData.vehicleId || !qrData.vehicleType) {
        return {
          isValid: false,
          error: 'Invalid QR code data structure',
        };
      }

      // Validate wallet address format
      if (!ethers.isAddress(qrData.walletAddress)) {
        return {
          isValid: false,
          error: 'Invalid wallet address format',
        };
      }

      // Check vehicle registration
      const registration = await this.getVehicleRegistration(qrData.vehicleId);
      if (!registration.isRegistered) {
        return {
          isValid: false,
          error: 'Vehicle is not registered',
        };
      }

      // Check if vehicle is blacklisted
      const isBlacklisted = await this.isVehicleBlacklisted(qrData.vehicleId);
      if (isBlacklisted) {
        return {
          isValid: false,
          error: 'Vehicle is blacklisted',
        };
      }

      // Verify vehicle owner matches QR code wallet
      if (registration.owner.toLowerCase() !== qrData.walletAddress.toLowerCase()) {
        return {
          isValid: false,
          error: 'Vehicle owner does not match wallet address',
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('QR code validation failed:', error);
      return {
        isValid: false,
        error: 'Failed to validate QR code',
      };
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
}

export const blockchainService = new BlockchainService();
