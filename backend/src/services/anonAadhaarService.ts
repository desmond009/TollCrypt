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
      // For now, we'll use mock verification for all cases
      // In production, this would integrate with the real anon-aadhaar verification
      console.log('⚠️  Using mock anon-Aadhaar verification');
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
   * Generate a hash of the aadhaar data for privacy
   */
  private generateAadhaarHash(publicInputs: number[]): string {
    const inputString = publicInputs.join(',');
    return crypto.createHash('sha256').update(inputString).digest('hex');
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
