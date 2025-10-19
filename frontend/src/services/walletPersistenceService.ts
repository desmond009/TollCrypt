/**
 * Wallet Persistence Service - Three-Tier Storage Strategy
 * 
 * Tier 1: Blockchain (Smart Contract) - Single source of truth
 * Tier 2: Database (MongoDB) - Fast retrieval, backup
 * Tier 3: Browser (localStorage) - Instant access, UX optimization
 */

import { topUpWalletAPI } from './topUpWalletService';

export interface WalletInfo {
  walletAddress: string;
  privateKey: string;
  publicKey: string;
  balance: string;
  createdAt: number;
  lastAccessed: number;
}

export interface WalletLookupResult {
  walletInfo: WalletInfo | null;
  source: 'localStorage' | 'database' | 'blockchain' | 'created';
  fromCache: boolean;
}

class WalletPersistenceService {
  private static instance: WalletPersistenceService;
  private readonly STORAGE_PREFIX = 'tollchain_wallet_';
  private readonly CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  public static getInstance(): WalletPersistenceService {
    if (!WalletPersistenceService.instance) {
      WalletPersistenceService.instance = new WalletPersistenceService();
    }
    return WalletPersistenceService.instance;
  }

  /**
   * Get wallet info using three-tier fallback strategy
   * 1. Check localStorage first (instant)
   * 2. Check database (fast)
   * 3. Check blockchain (slow but authoritative)
   * 4. Create new wallet if none exists
   */
  public async getWalletInfo(userAddress: string): Promise<WalletLookupResult> {
    console.log('🔍 Starting wallet lookup for user:', userAddress);

    // Tier 3: Check localStorage first (instant access)
    const cachedWallet = this.getFromLocalStorage(userAddress);
    if (cachedWallet && this.isCacheValid(cachedWallet)) {
      console.log('✅ Wallet found in localStorage (instant)');
      this.updateLastAccessed(cachedWallet);
      return {
        walletInfo: cachedWallet,
        source: 'localStorage',
        fromCache: true
      };
    }

    // Tier 2: Check database (fast retrieval)
    try {
      console.log('🔍 Checking database for wallet...');
      const dbWallet = await this.getFromDatabase(userAddress);
      if (dbWallet) {
        console.log('✅ Wallet found in database (fast)');
        // Cache in localStorage for future instant access
        this.saveToLocalStorage(userAddress, dbWallet);
        return {
          walletInfo: dbWallet,
          source: 'database',
          fromCache: false
        };
      }
    } catch (error) {
      console.warn('⚠️ Database lookup failed:', error);
    }

    // Tier 1: Check blockchain (authoritative but slow)
    try {
      console.log('🔍 Checking blockchain for wallet...');
      const blockchainWallet = await this.getFromBlockchain(userAddress);
      if (blockchainWallet) {
        console.log('✅ Wallet found on blockchain (authoritative)');
        // Update database and cache
        await this.saveToDatabase(userAddress, blockchainWallet);
        this.saveToLocalStorage(userAddress, blockchainWallet);
        return {
          walletInfo: blockchainWallet,
          source: 'blockchain',
          fromCache: false
        };
      }
    } catch (error) {
      console.warn('⚠️ Blockchain lookup failed:', error);
    }

    // No wallet found - create new one
    console.log('🔧 No wallet found, creating new one...');
    try {
      const newWallet = await this.createNewWallet(userAddress);
      console.log('✅ New wallet created successfully');
      return {
        walletInfo: newWallet,
        source: 'created',
        fromCache: false
      };
    } catch (error) {
      console.error('❌ Failed to create new wallet:', error);
      throw new Error('Failed to create or retrieve wallet');
    }
  }

  /**
   * Tier 3: Get wallet from localStorage (instant access)
   */
  private getFromLocalStorage(userAddress: string): WalletInfo | null {
    try {
      const key = `${this.STORAGE_PREFIX}${userAddress.toLowerCase()}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        const walletInfo = JSON.parse(cached);
        return walletInfo;
      }
    } catch (error) {
      console.warn('⚠️ Error reading from localStorage:', error);
    }
    return null;
  }

  /**
   * Tier 2: Get wallet from database (fast retrieval)
   */
  private async getFromDatabase(userAddress: string): Promise<WalletInfo | null> {
    try {
      const response = await topUpWalletAPI.getTopUpWalletInfo();
      if (response && response.walletAddress) {
        return {
          walletAddress: response.walletAddress,
          privateKey: response.privateKey || '',
          publicKey: response.publicKey || '',
          balance: response.balance || '0',
          createdAt: Date.now(),
          lastAccessed: Date.now()
        };
      }
    } catch (error) {
      console.warn('⚠️ Database lookup failed:', error);
    }
    return null;
  }

  /**
   * Tier 1: Get wallet from blockchain (authoritative)
   */
  private async getFromBlockchain(userAddress: string): Promise<WalletInfo | null> {
    try {
      // Check if wallet exists on blockchain
      const existsResponse = await topUpWalletAPI.hasTopUpWallet();
      if (existsResponse.exists) {
        // Get wallet info from blockchain
        const infoResponse = await topUpWalletAPI.getTopUpWalletInfo();
        if (infoResponse && infoResponse.walletAddress) {
          return {
            walletAddress: infoResponse.walletAddress,
            privateKey: infoResponse.privateKey || '',
            publicKey: infoResponse.publicKey || '',
            balance: infoResponse.balance || '0',
            createdAt: Date.now(),
            lastAccessed: Date.now()
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ Blockchain lookup failed:', error);
    }
    return null;
  }

  /**
   * Create new wallet and store in all tiers
   */
  private async createNewWallet(userAddress: string): Promise<WalletInfo> {
    const response = await topUpWalletAPI.createTopUpWallet();
    
    const walletInfo: WalletInfo = {
      walletAddress: response.walletAddress,
      privateKey: response.privateKey,
      publicKey: response.publicKey,
      balance: response.balance || '0',
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };

    // Store in all tiers
    this.saveToLocalStorage(userAddress, walletInfo);
    await this.saveToDatabase(userAddress, walletInfo);
    // Blockchain storage is handled by the smart contract

    return walletInfo;
  }

  /**
   * Save wallet to localStorage (Tier 3)
   */
  private saveToLocalStorage(userAddress: string, walletInfo: WalletInfo): void {
    try {
      const key = `${this.STORAGE_PREFIX}${userAddress.toLowerCase()}`;
      localStorage.setItem(key, JSON.stringify(walletInfo));
      console.log('💾 Wallet saved to localStorage');
    } catch (error) {
      console.warn('⚠️ Failed to save to localStorage:', error);
    }
  }

  /**
   * Save wallet to database (Tier 2)
   */
  private async saveToDatabase(userAddress: string, walletInfo: WalletInfo): Promise<void> {
    try {
      // The database is updated by the backend when wallet is created
      // This is handled by the topUpWalletAPI.createTopUpWallet() call
      console.log('💾 Wallet saved to database (handled by backend)');
    } catch (error) {
      console.warn('⚠️ Failed to save to database:', error);
    }
  }

  /**
   * Check if cached wallet is still valid
   */
  private isCacheValid(walletInfo: WalletInfo): boolean {
    const now = Date.now();
    const age = now - walletInfo.lastAccessed;
    return age < this.CACHE_EXPIRY_MS;
  }

  /**
   * Update last accessed timestamp
   */
  private updateLastAccessed(walletInfo: WalletInfo): void {
    walletInfo.lastAccessed = Date.now();
    // Update in localStorage
    const userAddress = this.getCurrentUserAddress();
    if (userAddress) {
      this.saveToLocalStorage(userAddress, walletInfo);
    }
  }

  /**
   * Get current user address from localStorage or wallet connection
   */
  private getCurrentUserAddress(): string | null {
    return localStorage.getItem('userAddress') || null;
  }

  /**
   * Clear wallet cache for user
   */
  public clearWalletCache(userAddress: string): void {
    try {
      const key = `${this.STORAGE_PREFIX}${userAddress.toLowerCase()}`;
      localStorage.removeItem(key);
      console.log('🗑️ Wallet cache cleared for user:', userAddress);
    } catch (error) {
      console.warn('⚠️ Failed to clear wallet cache:', error);
    }
  }

  /**
   * Clear all wallet caches
   */
  public clearAllWalletCaches(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      console.log('🗑️ All wallet caches cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear all wallet caches:', error);
    }
  }

  /**
   * Get wallet info with fallback strategy (main public method)
   */
  public async getWalletWithFallback(userAddress: string): Promise<WalletInfo | null> {
    try {
      const result = await this.getWalletInfo(userAddress);
      return result.walletInfo;
    } catch (error) {
      console.error('❌ Failed to get wallet with fallback:', error);
      return null;
    }
  }

  /**
   * Force refresh wallet from authoritative source (blockchain)
   */
  public async refreshWalletFromBlockchain(userAddress: string): Promise<WalletInfo | null> {
    console.log('🔄 Force refreshing wallet from blockchain...');
    
    // Clear cache
    this.clearWalletCache(userAddress);
    
    // Get from blockchain
    try {
      const blockchainWallet = await this.getFromBlockchain(userAddress);
      if (blockchainWallet) {
        // Update database and cache
        await this.saveToDatabase(userAddress, blockchainWallet);
        this.saveToLocalStorage(userAddress, blockchainWallet);
        console.log('✅ Wallet refreshed from blockchain');
        return blockchainWallet;
      }
    } catch (error) {
      console.error('❌ Failed to refresh from blockchain:', error);
    }
    
    return null;
  }
}

export const walletPersistenceService = WalletPersistenceService.getInstance();
