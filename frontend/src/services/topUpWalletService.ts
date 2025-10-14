import { encodePacked, parseEther, hexToBytes, verifyMessage, keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export interface TopUpWalletInfo {
  walletAddress: string;
  privateKey: string;
  publicKey: string;
  balance: string;
  isInitialized: boolean;
}

export interface WalletStats {
  totalTopUps: string;
  totalTollPayments: string;
  totalWithdrawals: string;
  currentBalance: string;
}

export interface TopUpResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export class TopUpWalletAPIService {
  private baseURL: string;

  constructor(baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:3001') {
    this.baseURL = baseURL;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}/api/topup-wallet${endpoint}`;
    
    // Get session token and user address from localStorage
    const sessionToken = localStorage.getItem('sessionToken');
    const userAddress = localStorage.getItem('userAddress');
    
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken && { 'X-Session-Token': sessionToken }),
        ...(userAddress && { 'X-User-Address': userAddress }),
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create a new top-up wallet for the current user
   */
  async createTopUpWallet(): Promise<TopUpWalletInfo> {
    return this.makeRequest<TopUpWalletInfo>('/create', {
      method: 'POST',
    });
  }

  /**
   * Get top-up wallet information for the current user
   */
  async getTopUpWalletInfo(): Promise<TopUpWalletInfo> {
    return this.makeRequest<TopUpWalletInfo>('/info');
  }

  /**
   * Get top-up wallet balance for the current user
   */
  async getTopUpWalletBalance(): Promise<{ balance: string }> {
    return this.makeRequest<{ balance: string }>('/balance');
  }

  /**
   * Check if user has a top-up wallet
   */
  async hasTopUpWallet(): Promise<{ exists: boolean }> {
    return this.makeRequest<{ exists: boolean }>('/exists');
  }

  /**
   * Process top-up transaction
   */
  async processTopUp(amount: string, signature: string): Promise<TopUpResult> {
    return this.makeRequest<TopUpResult>('/topup', {
      method: 'POST',
      body: JSON.stringify({ amount, signature }),
    });
  }

  /**
   * Process toll payment from top-up wallet
   */
  async processTollPayment(
    vehicleId: string,
    amount: string,
    zkProofHash: string
  ): Promise<TopUpResult> {
    return this.makeRequest<TopUpResult>('/payment', {
      method: 'POST',
      body: JSON.stringify({ vehicleId, amount, zkProofHash }),
    });
  }

  /**
   * Withdraw funds from top-up wallet
   */
  async withdrawFromTopUpWallet(amount: string, signature: string): Promise<TopUpResult> {
    return this.makeRequest<TopUpResult>('/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, signature }),
    });
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(): Promise<WalletStats> {
    return this.makeRequest<WalletStats>('/stats');
  }

  /**
   * Create signature for top-up authorization
   */
  async createTopUpSignature(
    amount: string,
    nonce: number,
    privateKey: string
  ): Promise<{ signature: string }> {
    return this.makeRequest<{ signature: string }>('/signature/topup', {
      method: 'POST',
      body: JSON.stringify({ amount, nonce, privateKey }),
    });
  }

  /**
   * Create signature for withdrawal authorization
   */
  async createWithdrawalSignature(
    amount: string,
    nonce: number,
    privateKey: string
  ): Promise<{ signature: string }> {
    return this.makeRequest<{ signature: string }>('/signature/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, nonce, privateKey }),
    });
  }
}

// Utility functions for signature creation
export class SignatureUtils {
  /**
   * Create signature for top-up authorization
   */
  static async createTopUpSignature(
    userAddress: string,
    amount: string,
    nonce: number,
    privateKey: string
  ): Promise<string> {
    const packed = encodePacked(
      ['address', 'uint256', 'uint256'],
      [userAddress as `0x${string}`, parseEther(amount), BigInt(nonce)]
    );
    const message = keccak256(packed);
    
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const signature = await account.signMessage({ message: { raw: hexToBytes(message) } });
    return signature;
  }

  /**
   * Create signature for withdrawal authorization
   */
  static async createWithdrawalSignature(
    userAddress: string,
    amount: string,
    nonce: number,
    privateKey: string
  ): Promise<string> {
    const packed = encodePacked(
      ['address', 'uint256', 'uint256'],
      [userAddress as `0x${string}`, parseEther(amount), BigInt(nonce)]
    );
    const message = keccak256(packed);
    
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const signature = await account.signMessage({ message: { raw: hexToBytes(message) } });
    return signature;
  }

  /**
   * Generate a random nonce for replay protection
   */
  static generateNonce(): number {
    return Math.floor(Math.random() * 1000000) + Date.now();
  }

  /**
   * Verify signature (for testing purposes)
   */
  static async verifySignature(
    message: string,
    signature: string,
    expectedAddress: string
  ): Promise<boolean> {
    try {
      const isValid = await verifyMessage({
        address: expectedAddress as `0x${string}`,
        message: { raw: hexToBytes(message as `0x${string}`) },
        signature: signature as `0x${string}`
      });
      return isValid;
    } catch {
      return false;
    }
  }
}

// Default instance
export const topUpWalletAPI = new TopUpWalletAPIService();
