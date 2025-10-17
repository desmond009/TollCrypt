import crypto from 'crypto';
import { User, IUser } from '../models/User';

export interface AnonAadhaarProof {
  proof: string;
  publicInputs: number[];
  timestamp: number;
}

export interface VerificationResult {
  isValid: boolean;
  userAddress: string;
  aadhaarHash: string;
  error?: string;
}

export class AnonAadhaarService {
  private static instance: AnonAadhaarService;

  private constructor() {
    // Initialize service
  }

  public static getInstance(): AnonAadhaarService {
    if (!AnonAadhaarService.instance) {
      AnonAadhaarService.instance = new AnonAadhaarService();
    }
    return AnonAadhaarService.instance;
  }

  /**
   * Verify an anon-aadhaar proof
   */
  public async verifyProof(proof: string, publicInputs: number[], userAddress: string): Promise<VerificationResult> {
    try {
      // In production, this would integrate with the real anon-aadhaar verification
      // For now, we'll use enhanced mock verification
      console.log('🔐 Verifying anon-Aadhaar proof...');
      
      // First, validate the proof format
      if (!this.validateProofFormat(proof, publicInputs, userAddress)) {
        return {
          isValid: false,
          userAddress,
          aadhaarHash: '',
          error: 'Invalid proof format'
        };
      }

      // Simulate blockchain verification
      const blockchainVerification = await this.verifyProofOnBlockchain(proof, publicInputs, userAddress);
      
      if (!blockchainVerification) {
        return {
          isValid: false,
          userAddress,
          aadhaarHash: '',
          error: 'Blockchain verification failed'
        };
      }

      return this.mockVerification(proof, publicInputs, userAddress);

    } catch (error) {
      console.error('Error verifying anon-aadhaar proof:', error);
      return {
        isValid: false,
        userAddress,
        aadhaarHash: '',
        error: error instanceof Error ? error.message : 'Unknown verification error'
      };
    }
  }

  /**
   * Mock verification for development/testing
   */
  private mockVerification(proof: string, publicInputs: number[], userAddress: string): VerificationResult {
    // Basic validation
    if (!proof.startsWith('0x') || proof.length < 10) {
      return {
        isValid: false,
        userAddress,
        aadhaarHash: '',
        error: 'Invalid proof format'
      };
    }

    if (!publicInputs || publicInputs.length < 2) {
      return {
        isValid: false,
        userAddress,
        aadhaarHash: '',
        error: 'Invalid public inputs'
      };
    }

    if (!userAddress || !userAddress.startsWith('0x')) {
      return {
        isValid: false,
        userAddress,
        aadhaarHash: '',
        error: 'Invalid user address'
      };
    }

    // Generate a mock aadhaar hash
    const aadhaarHash = this.generateAadhaarHash(publicInputs);

    return {
      isValid: true,
      userAddress,
      aadhaarHash
    };
  }

  /**
   * Validate proof format and inputs
   */
  private validateProofFormat(proof: string, publicInputs: number[], userAddress: string): boolean {
    // Basic validation
    if (!proof.startsWith('0x') || proof.length < 10) {
      return false;
    }

    if (!publicInputs || publicInputs.length < 2) {
      return false;
    }

    if (!userAddress || !userAddress.startsWith('0x')) {
      return false;
    }

    // Check proof length (should be reasonable for a ZK proof)
    if (proof.length < 100 || proof.length > 10000) {
      return false;
    }

    // Check public inputs are within reasonable ranges
    for (const input of publicInputs) {
      if (input === 0 || input > Number.MAX_SAFE_INTEGER) {
        return false;
      }
    }

    return true;
  }

  /**
   * Simulate blockchain verification
   */
  private async verifyProofOnBlockchain(proof: string, publicInputs: number[], userAddress: string): Promise<boolean> {
    try {
      // In production, this would call the actual smart contract
      // For now, we'll simulate the verification process
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Basic validation that would be done by the smart contract
      const proofHash = crypto.createHash('sha256')
        .update(proof + publicInputs.join(',') + userAddress)
        .digest('hex');
      
      // Simulate successful verification
      return proofHash !== '0000000000000000000000000000000000000000000000000000000000000000';
      
    } catch (error) {
      console.error('Error in blockchain verification simulation:', error);
      return false;
    }
  }

  /**
   * Create or update user record after successful verification
   */
  public async createOrUpdateUser(
    userAddress: string, 
    aadhaarHash: string, 
    sessionToken: string
  ): Promise<IUser> {
    try {
      // Check if user already exists
      let user = await User.findOne({ walletAddress: userAddress.toLowerCase() });

      if (user) {
        // Update existing user
        user.lastLogin = new Date();
        user.sessionTokens.push(sessionToken);
        // Keep only last 5 session tokens
        if (user.sessionTokens.length > 5) {
          user.sessionTokens = user.sessionTokens.slice(-5);
        }
        await user.save();
      } else {
        // Create new user
        user = new User({
          walletAddress: userAddress.toLowerCase(),
          aadhaarHash,
          isVerified: true,
          verificationDate: new Date(),
          lastLogin: new Date(),
          sessionTokens: [sessionToken],
          isActive: true
        });
        await user.save();
      }

      return user;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  /**
   * Verify session token
   */
  public async verifySessionToken(sessionToken: string, userAddress: string): Promise<boolean> {
    try {
      const user = await User.findOne({ 
        walletAddress: userAddress.toLowerCase(),
        sessionTokens: sessionToken,
        isActive: true
      });

      return !!user;
    } catch (error) {
      console.error('Error verifying session token:', error);
      return false;
    }
  }

  /**
   * Get user by wallet address
   */
  public async getUserByAddress(userAddress: string): Promise<IUser | null> {
    try {
      return await User.findOne({ 
        walletAddress: userAddress.toLowerCase(),
        isActive: true
      });
    } catch (error) {
      console.error('Error getting user by address:', error);
      return null;
    }
  }

  /**
   * Revoke session token
   */
  public async revokeSessionToken(sessionToken: string, userAddress: string): Promise<boolean> {
    try {
      const user = await User.findOne({ 
        walletAddress: userAddress.toLowerCase(),
        sessionTokens: sessionToken
      });

      if (user) {
        user.sessionTokens = user.sessionTokens.filter(token => token !== sessionToken);
        await user.save();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error revoking session token:', error);
      return false;
    }
  }
}

export const anonAadhaarService = AnonAadhaarService.getInstance();
