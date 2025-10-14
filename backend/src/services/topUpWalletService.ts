import { ethers } from 'ethers';

// Contract ABIs for TopUp Wallet system
const TOPUP_WALLET_FACTORY_ABI = [
  "function deployTopUpWallet(address user) external returns (address)",
  "function getUserTopUpWallet(address user) external view returns (address)",
  "function hasUserTopUpWallet(address user) external view returns (bool)",
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
  "function authorizeTopUpWalletFromFactory(address topUpWallet) external"
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
    // Check if running in mock mode
    this.isMockMode = process.env.NODE_ENV === 'development' && process.env.MOCK_BLOCKCHAIN === 'true';
    
    if (this.isMockMode) {
      console.log('⚠️  TopUpWalletService running in mock mode');
      // Initialize with mock values
      this.provider = {} as ethers.Provider;
      this.factoryContract = {} as ethers.Contract;
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
   * Create a new top-up wallet for a user
   * @param userAddress User's wallet address
   * @returns Wallet creation result
   */
  async createTopUpWallet(userAddress: string): Promise<WalletCreationResult> {
    try {
      if (this.isMockMode) {
        // Mock implementation - create a fake wallet
        console.log(`⚠️  Mock createTopUpWallet for ${userAddress}`);
        const mockWallet = ethers.Wallet.createRandom();
        const mockWalletAddress = mockWallet.address;
        
        return {
          success: true,
          walletAddress: mockWalletAddress,
          privateKey: mockWallet.privateKey,
          publicKey: mockWallet.publicKey
        };
      }

      // Check if user already has a wallet
      const existingWallet = await this.factoryContract.getUserTopUpWallet(userAddress);
      if (existingWallet !== ethers.ZeroAddress) {
        return {
          success: false,
          error: 'User already has a top-up wallet'
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

      // Authorize the wallet in toll collection contract
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
        // Mock implementation - return false for now (no wallet exists)
        console.log(`⚠️  Mock hasTopUpWallet for ${userAddress}: false`);
        return false;
      }
      return await this.factoryContract.hasTopUpWallet(userAddress);
    } catch (error) {
      console.error('Error checking top-up wallet:', error);
      return false;
    }
  }

  /**
   * Get top-up wallet balance
   * @param userAddress User's wallet address
   * @returns Balance in ETH
   */
  async getTopUpWalletBalance(userAddress: string): Promise<string> {
    try {
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
      const tx = await this.tollCollectionContract.authorizeTopUpWalletFromFactory(walletAddress);
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
}
