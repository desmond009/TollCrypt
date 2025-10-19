import { ethers } from 'ethers';

// Contract ABIs for TopUp Wallet system
const TOPUP_WALLET_FACTORY_ABI = [
  "function deployTopUpWallet(address user) external returns (address)",
  "function getUserTopUpWallet(address user) external view returns (address)",
  "function hasUserTopUpWallet(address user) external view returns (bool)",
  "function getUserWalletInfo(address user) external view returns (address walletAddress, bool exists, uint256 balance)",
  "event TopUpWalletCreated(address indexed user, address indexed walletAddress)"
];

const TOPUP_WALLET_ABI = [
  "function getBalance() external view returns (uint256)",
  "function isInitialized() external view returns (bool)",
  "function topUp(bytes memory signature) external payable",
  "function withdraw(uint256 amount, bytes memory signature) external",
  "function processTollPayment(uint256 amount, string memory vehicleId, bytes32 zkProofHash) external",
  "function getWalletStats() external view returns (uint256 totalTopUps, uint256 totalTollPayments, uint256 totalWithdrawals, uint256 currentBalance)"
];

const TOLL_COLLECTION_TOPUP_ABI = [
  "function authorizeTopUpWalletFromFactory(address topUpWallet) external",
  "function setTopUpWalletAuthorization(address topUpWallet, bool isAuthorized) external"
];

export interface TopUpWalletInfo {
  walletAddress: string;
  privateKey: string;
  publicKey: string;
  balance: string;
  isInitialized: boolean;
}

export interface WalletCreationResult {
  success: boolean;
  walletAddress?: string;
  privateKey?: string;
  publicKey?: string;
  error?: string;
}

// Global mock wallet storage to persist across service instances
const globalMockWallets: Map<string, string> = new Map();

// Global service instance
let globalServiceInstance: TopUpWalletService | null = null;

// Helper functions for global mock wallet management
export function getGlobalMockWallets(): Map<string, string> {
  return globalMockWallets;
}

export function setGlobalMockWallet(userAddress: string, walletAddress: string): void {
  globalMockWallets.set(userAddress, walletAddress);
}

export function hasGlobalMockWallet(userAddress: string): boolean {
  return globalMockWallets.has(userAddress);
}

export class TopUpWalletService {
  private provider: ethers.Provider;
  private factoryContract: ethers.Contract;
  private tollCollectionContract: ethers.Contract;
  private factoryWallet: ethers.Wallet;
  private tollCollectionWallet: ethers.Wallet;
  private isMockMode: boolean;

  constructor(
    rpcUrl: string,
    factoryAddress: string,
    tollCollectionAddress: string,
    factoryPrivateKey: string,
    tollCollectionPrivateKey: string
  ) {
    // Check if running in mock mode - be more flexible with detection
    const isMockMode = process.env.NODE_ENV === 'development' && 
                     (process.env.MOCK_BLOCKCHAIN === 'true' || 
                      factoryAddress === '0x0000000000000000000000000000000000000000' ||
                      factoryPrivateKey === '0x0000000000000000000000000000000000000000000000000000000000000000');
    
    this.isMockMode = isMockMode;
    
    if (this.isMockMode) {
      console.log('⚠️  TopUpWalletService running in mock mode');
      // Initialize with mock values
      this.provider = {} as ethers.Provider;
      this.factoryContract = this.createMockContract();
      this.tollCollectionContract = {} as ethers.Contract;
      this.factoryWallet = {} as ethers.Wallet;
      this.tollCollectionWallet = {} as ethers.Wallet;
      return;
    }

    // Validate inputs for production mode
    if (!factoryAddress || factoryAddress === '') {
      throw new Error('Factory address is required');
    }
    if (!tollCollectionAddress || tollCollectionAddress === '') {
      throw new Error('Toll collection address is required');
    }
    if (!factoryPrivateKey || factoryPrivateKey === '') {
      throw new Error('Factory private key is required');
    }
    if (!tollCollectionPrivateKey || tollCollectionPrivateKey === '') {
      throw new Error('Toll collection private key is required');
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    try {
      this.factoryWallet = new ethers.Wallet(factoryPrivateKey, this.provider);
    } catch (error) {
      throw new Error(`Invalid factory private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    try {
      this.tollCollectionWallet = new ethers.Wallet(tollCollectionPrivateKey, this.provider);
    } catch (error) {
      throw new Error(`Invalid toll collection private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    this.factoryContract = new ethers.Contract(
      factoryAddress,
      TOPUP_WALLET_FACTORY_ABI,
      this.factoryWallet
    );
    
    this.tollCollectionContract = new ethers.Contract(
      tollCollectionAddress,
      TOLL_COLLECTION_TOPUP_ABI,
      this.tollCollectionWallet
    );
  }

  /**
   * Get singleton instance of TopUpWalletService
   */
  static getInstance(
    rpcUrl?: string,
    factoryAddress?: string,
    tollCollectionAddress?: string,
    factoryPrivateKey?: string,
    tollCollectionPrivateKey?: string
  ): TopUpWalletService {
    if (!globalServiceInstance) {
      console.log('Creating new TopUpWalletService instance');
      if (!rpcUrl || !factoryAddress || !tollCollectionAddress || !factoryPrivateKey || !tollCollectionPrivateKey) {
        throw new Error('Service parameters required for first initialization');
      }
      globalServiceInstance = new TopUpWalletService(
        rpcUrl,
        factoryAddress,
        tollCollectionAddress,
        factoryPrivateKey,
        tollCollectionPrivateKey
      );
    } else {
      console.log('Using existing TopUpWalletService instance');
    }
    return globalServiceInstance;
  }

  /**
   * Create a mock contract for development/testing
   */
  private createMockContract(): any {
    return {
      getUserTopUpWallet: async (userAddress: string) => {
        // Check if user has a wallet in global storage for mock mode
        return globalMockWallets.get(userAddress) || '0x0000000000000000000000000000000000000000';
      },
      hasUserTopUpWallet: async (userAddress: string) => {
        // Check global storage for mock wallet existence
        const exists = globalMockWallets.has(userAddress);
        console.log(`Checking wallet existence for ${userAddress}: ${exists}`);
        console.log('Global mock wallets:', Array.from(globalMockWallets.entries()));
        return exists;
      },
      deployTopUpWallet: async (userAddress: string) => {
        // Generate a mock wallet address and store it in global storage
        const mockWalletAddress = '0x' + userAddress.slice(2).padStart(40, '0') + Math.random().toString(16).slice(2, 8);
        globalMockWallets.set(userAddress, mockWalletAddress);
        console.log(`Created mock wallet for ${userAddress}: ${mockWalletAddress}`);
        console.log('Global mock wallets after creation:', Array.from(globalMockWallets.entries()));
        return mockWalletAddress;
      }
    };
  }

  /**
   * Create a new top-up wallet for a user
   * @param userAddress User's wallet address
   * @returns Wallet creation result
   */
  async createTopUpWallet(userAddress: string): Promise<WalletCreationResult> {
    try {
      if (this.isMockMode) {
        // Check if user already has a mock wallet
        if (globalMockWallets.has(userAddress)) {
          const existingWalletAddress = globalMockWallets.get(userAddress)!;
          return {
            success: true,
            walletAddress: existingWalletAddress,
            privateKey: '0x' + 'mock_private_key_' + userAddress.slice(2, 10),
            publicKey: '0x' + 'mock_public_key_' + userAddress.slice(2, 10)
          };
        }

        // Mock implementation - create a fake wallet
        console.log(`⚠️  Mock createTopUpWallet for ${userAddress}`);
        const mockWallet = ethers.Wallet.createRandom();
        const mockWalletAddress = mockWallet.address;
        
        // Store in global mock wallets
        globalMockWallets.set(userAddress, mockWalletAddress);
        
        return {
          success: true,
          walletAddress: mockWalletAddress,
          privateKey: mockWallet.privateKey,
          publicKey: mockWallet.publicKey
        };
      }

      // Check if user already has a wallet on blockchain
      const existingWallet = await this.factoryContract.getUserTopUpWallet(userAddress);
      if (existingWallet !== ethers.ZeroAddress) {
        console.log(`User ${userAddress} already has a top-up wallet: ${existingWallet}`);
        return {
          success: true,
          walletAddress: existingWallet,
          privateKey: '', // Private key is not stored on-chain
          publicKey: '' // Public key is not stored on-chain
        };
      }

      // Deploy new wallet
      const tx = await this.factoryContract.deployTopUpWallet(userAddress);
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction failed');
      }

      // Get the deployed wallet address from events
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.factoryContract.interface.parseLog(log);
          return parsed?.name === 'TopUpWalletCreated';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('Wallet creation event not found');
      }

      const parsedEvent = this.factoryContract.interface.parseLog(event);
      const walletAddress = parsedEvent?.args[1]; // walletAddress is the second argument

      if (!walletAddress) {
        throw new Error('Wallet address not found in event');
      }

      // Generate new private/public key pair for the wallet
      const wallet = ethers.Wallet.createRandom();
      const privateKey = wallet.privateKey;
      const publicKey = wallet.publicKey;

      // Manually authorize the wallet in the toll collection contract
      // This is needed because the factory address in the contract is incorrect
      await this.authorizeTopUpWallet(walletAddress);

      return {
        success: true,
        walletAddress,
        privateKey,
        publicKey
      };

    } catch (error) {
      console.error('Error creating top-up wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get top-up wallet information for a user
   * @param userAddress User's wallet address
   * @returns Top-up wallet information
   */
  async getTopUpWalletInfo(userAddress: string): Promise<TopUpWalletInfo | null> {
    try {
      if (this.isMockMode) {
        // Mock implementation for development
        const mockWalletAddress = globalMockWallets.get(userAddress);
        if (!mockWalletAddress) {
          return null;
        }
        return {
          walletAddress: mockWalletAddress,
          privateKey: '0x' + 'mock_private_key_' + userAddress.slice(2, 10),
          publicKey: '0x' + 'mock_public_key_' + userAddress.slice(2, 10),
          balance: '0.0',
          isInitialized: true
        };
      }

      const walletAddress = await this.factoryContract.getUserTopUpWallet(userAddress);
      
      if (walletAddress === ethers.ZeroAddress) {
        return null;
      }

      const walletContract = new ethers.Contract(walletAddress, TOPUP_WALLET_ABI, this.provider);
      
      const [balance, isInitialized] = await Promise.all([
        walletContract.getBalance(),
        walletContract.isInitialized()
      ]);

      return {
        walletAddress,
        privateKey: '', // Private key is not stored on-chain
        publicKey: '', // Public key is not stored on-chain
        balance: ethers.formatEther(balance),
        isInitialized
      };

    } catch (error) {
      console.error('Error getting top-up wallet info:', error);
      return null;
    }
  }

  /**
   * Check if user has a top-up wallet
   * @param userAddress User's wallet address
   * @returns True if user has a wallet
   */
  async hasTopUpWallet(userAddress: string): Promise<boolean> {
    try {
      if (this.isMockMode) {
        // Mock implementation for development
        return globalMockWallets.has(userAddress);
      }
      return await this.factoryContract.hasTopUpWallet(userAddress);
    } catch (error) {
      console.error('Error checking top-up wallet:', error);
      return false;
    }
  }

  /**
   * Get wallet info from blockchain (Tier 1 - Authoritative source)
   * @param userAddress User's wallet address
   * @returns Wallet info from blockchain or null if not found
   */
  async getWalletInfoFromBlockchain(userAddress: string): Promise<TopUpWalletInfo | null> {
    try {
      if (this.isMockMode) {
        // Mock implementation for development
        const mockWalletAddress = globalMockWallets.get(userAddress);
        if (!mockWalletAddress) {
          return null;
        }
        return {
          walletAddress: mockWalletAddress,
          privateKey: '0x' + 'mock_private_key_' + userAddress.slice(2, 10),
          publicKey: '0x' + 'mock_public_key_' + userAddress.slice(2, 10),
          balance: '0.0',
          isInitialized: true
        };
      }

      // Use the new getUserWalletInfo function from the contract
      const [walletAddress, exists, balance] = await this.factoryContract.getUserWalletInfo(userAddress);
      
      if (!exists || walletAddress === ethers.ZeroAddress) {
        return null;
      }

      // Get additional info from the wallet contract
      const walletContract = new ethers.Contract(walletAddress, TOPUP_WALLET_ABI, this.provider);
      const isInitialized = await walletContract.isInitialized();

      return {
        walletAddress,
        privateKey: '', // Private key is not stored on-chain
        publicKey: '', // Public key is not stored on-chain
        balance: ethers.formatEther(balance),
        isInitialized
      };

    } catch (error) {
      console.error('Error getting wallet info from blockchain:', error);
      return null;
    }
  }

  /**
   * Get top-up wallet balance
   * @param userAddress User's wallet address
   * @returns Balance in ETH
   */
  async getTopUpWalletBalance(userAddress: string): Promise<string> {
    try {
      if (this.isMockMode) {
        // Mock implementation for development
        const mockWalletAddress = globalMockWallets.get(userAddress);
        if (!mockWalletAddress) {
          return '0';
        }
        // Return a mock balance
        return '0.0';
      }

      const walletAddress = await this.factoryContract.getUserTopUpWallet(userAddress);
      
      if (walletAddress === ethers.ZeroAddress) {
        return '0';
      }

      const walletContract = new ethers.Contract(walletAddress, TOPUP_WALLET_ABI, this.provider);
      const balance = await walletContract.getBalance();
      
      return ethers.formatEther(balance);

    } catch (error) {
      console.error('Error getting top-up wallet balance:', error);
      return '0';
    }
  }

  /**
   * Process top-up transaction
   * @param userAddress User's wallet address
   * @param amount Amount to top-up in ETH
   * @param signature User's signature for authorization
   * @returns Transaction hash
   */
  async processTopUp(
    userAddress: string,
    amount: string,
    signature: string
  ): Promise<string> {
    try {
      if (this.isMockMode) {
        // Mock implementation for development
        console.log(`Mock top-up: ${amount} ETH for user ${userAddress}`);
        // In mock mode, we'll simulate a successful top-up
        // The actual balance update should be handled by the frontend
        return '0x' + 'mock_tx_hash_' + Date.now().toString(16);
      }

      const walletAddress = await this.factoryContract.getUserTopUpWallet(userAddress);
      
      if (walletAddress === ethers.ZeroAddress) {
        throw new Error('User does not have a top-up wallet');
      }

      const walletContract = new ethers.Contract(walletAddress, TOPUP_WALLET_ABI, this.provider);
      
      // Convert amount to wei
      const amountWei = ethers.parseEther(amount);
      
      // Process top-up with signature
      const tx = await walletContract.topUp(signature, {
        value: amountWei
      });

      return tx.hash;

    } catch (error) {
      console.error('Error processing top-up:', error);
      throw error;
    }
  }

  /**
   * Process toll payment from top-up wallet
   * @param userAddress User's wallet address
   * @param vehicleId Vehicle ID
   * @param amount Amount to pay
   * @param zkProofHash ZK proof hash
   * @returns Transaction hash
   */
  async processTollPayment(
    userAddress: string,
    vehicleId: string,
    amount: string,
    zkProofHash: string
  ): Promise<string> {
    try {
      const walletAddress = await this.factoryContract.getUserTopUpWallet(userAddress);
      
      if (walletAddress === ethers.ZeroAddress) {
        throw new Error('User does not have a top-up wallet');
      }

      const walletContract = new ethers.Contract(walletAddress, TOPUP_WALLET_ABI, this.provider);
      
      // Convert amount to wei
      const amountWei = ethers.parseEther(amount);
      
      // Process toll payment
      const tx = await walletContract.processTollPayment(
        amountWei,
        vehicleId,
        zkProofHash
      );

      return tx.hash;

    } catch (error) {
      console.error('Error processing toll payment:', error);
      throw error;
    }
  }

  /**
   * Withdraw funds from top-up wallet
   * @param userAddress User's wallet address
   * @param amount Amount to withdraw in ETH
   * @param signature User's signature for authorization
   * @returns Transaction hash
   */
  async withdrawFromTopUpWallet(
    userAddress: string,
    amount: string,
    signature: string
  ): Promise<string> {
    try {
      const walletAddress = await this.factoryContract.getUserTopUpWallet(userAddress);
      
      if (walletAddress === ethers.ZeroAddress) {
        throw new Error('User does not have a top-up wallet');
      }

      const walletContract = new ethers.Contract(walletAddress, TOPUP_WALLET_ABI, this.provider);
      
      // Convert amount to wei
      const amountWei = ethers.parseEther(amount);
      
      // Process withdrawal with signature
      const tx = await walletContract.withdraw(amountWei, signature);

      return tx.hash;

    } catch (error) {
      console.error('Error withdrawing from top-up wallet:', error);
      throw error;
    }
  }

  /**
   * Authorize a top-up wallet in the toll collection contract
   * @param walletAddress Top-up wallet address
   */
  private async authorizeTopUpWallet(walletAddress: string): Promise<void> {
    try {
      const tx = await this.tollCollectionContract.setTopUpWalletAuthorization(walletAddress, true);
      await tx.wait();
    } catch (error) {
      console.error('Error authorizing top-up wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet statistics
   * @param userAddress User's wallet address
   * @returns Wallet statistics
   */
  async getWalletStats(userAddress: string): Promise<{
    totalTopUps: string;
    totalTollPayments: string;
    totalWithdrawals: string;
    currentBalance: string;
  } | null> {
    try {
      const walletAddress = await this.factoryContract.getUserTopUpWallet(userAddress);
      
      if (walletAddress === ethers.ZeroAddress) {
        return null;
      }

      const walletContract = new ethers.Contract(walletAddress, TOPUP_WALLET_ABI, this.provider);
      const stats = await walletContract.getWalletStats();
      
      return {
        totalTopUps: ethers.formatEther(stats.totalTopUps),
        totalTollPayments: ethers.formatEther(stats.totalTollPayments),
        totalWithdrawals: ethers.formatEther(stats.totalWithdrawals),
        currentBalance: ethers.formatEther(stats.currentBalance)
      };

    } catch (error) {
      console.error('Error getting wallet stats:', error);
      return null;
    }
  }

  /**
   * Create signature for top-up authorization
   * @param userAddress User's wallet address
   * @param amount Amount to top-up
   * @param nonce Nonce for replay protection
   * @param privateKey User's private key
   * @returns Signature
   */
  async createTopUpSignature(
    userAddress: string,
    amount: string,
    nonce: number,
    privateKey: string
  ): Promise<string> {
    const message = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint256'],
      [userAddress, ethers.parseEther(amount), nonce]
    );
    
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signMessage(ethers.getBytes(message));
  }

  /**
   * Create signature for withdrawal authorization
   * @param userAddress User's wallet address
   * @param amount Amount to withdraw
   * @param nonce Nonce for replay protection
   * @param privateKey User's private key
   * @returns Signature
   */
  async createWithdrawalSignature(
    userAddress: string,
    amount: string,
    nonce: number,
    privateKey: string
  ): Promise<string> {
    const message = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint256'],
      [userAddress, ethers.parseEther(amount), nonce]
    );
    
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signMessage(ethers.getBytes(message));
  }

  /**
   * Get user's existing top-up wallet from database
   * @param userAddress User's wallet address
   * @returns Top-up wallet information or null if not found
   */
  async getExistingTopUpWallet(userAddress: string): Promise<TopUpWalletInfo | null> {
    try {
      // Import User model here to avoid circular dependency
      const { User } = await import('../models/User');
      
      const user = await User.findOne({ walletAddress: userAddress.toLowerCase() });
      if (!user || !user.topUpWalletAddress) {
        return null;
      }

      console.log(`Found existing top-up wallet in database: ${user.topUpWalletAddress}`);

      // Return wallet info from database first
      const walletInfo: TopUpWalletInfo = {
        walletAddress: user.topUpWalletAddress,
        privateKey: '', // Don't store private keys in database for security
        publicKey: '', // Don't store public keys in database for security
        balance: '0', // Will be fetched from blockchain if needed
        isInitialized: true
      };

      // Try to get balance from blockchain if possible
      try {
        if (process.env.NODE_ENV !== 'development' || process.env.MOCK_BLOCKCHAIN !== 'true') {
          const balance = await this.getTopUpWalletBalance(userAddress);
          walletInfo.balance = balance;
        }
      } catch (blockchainError) {
        console.warn('Could not fetch balance from blockchain, using default:', blockchainError);
      }

      return walletInfo;
    } catch (error) {
      console.error('Error getting existing top-up wallet:', error);
      return null;
    }
  }

  /**
   * Check if user has an existing top-up wallet
   * @param userAddress User's wallet address
   * @returns True if user has a wallet
   */
  async hasExistingTopUpWallet(userAddress: string): Promise<boolean> {
    try {
      // Import User model here to avoid circular dependency
      const { User } = await import('../models/User');
      
      const normalizedAddress = userAddress.toLowerCase();
      console.log(`Looking for user with address: ${normalizedAddress}`);
      
      const user = await User.findOne({ walletAddress: normalizedAddress });
      console.log(`User found: ${!!user}`);
      if (user) {
        console.log(`User topUpWalletAddress: ${user.topUpWalletAddress}`);
        console.log(`Has topUpWalletAddress: ${!!user.topUpWalletAddress}`);
      }
      
      return !!(user && user.topUpWalletAddress);
    } catch (error) {
      console.error('Error checking existing top-up wallet:', error);
      return false;
    }
  }
}
