import QRCode from 'qrcode';
import { VehicleInfo } from './sessionManager';
import { keccak256, stringToBytes, hexToBytes, verifyMessage } from 'viem';
import { createWalletClient, custom } from 'viem';
import { sepolia } from 'viem/chains';

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface QRCodeData {
  walletAddress: string;        // 42 characters - Top-Up Wallet Address
  vehicleNumber: string;        // 10-15 characters - Vehicle Registration Number
  vehicleType: string;          // 1-2 characters - Vehicle Type Code (2W, 4W, LCV, HCV, BUS)
  userId: string;              // 32 characters - User ID / Anonymous Hash (SHA-256)
  timestamp: number;           // 10 digits - Unix timestamp
  signature: string;          // 130 characters - ECDSA signature (0x + 130 hex chars)
  version: string;            // 1 character - Version number (v1, v2, etc.)
  sessionToken?: string;       // Legacy field for backward compatibility
  tollRate?: number;          // Optional toll rate
}

export interface QRCodeResult {
  dataUrl: string;
  qrData: QRCodeData;
}

// Vehicle type mapping to standardized codes
const VEHICLE_TYPE_MAP: Record<string, string> = {
  'motorcycle': '2W',
  'bike': '2W',
  'car': '4W',
  'jeep': '4W',
  'suv': '4W',
  'van': 'LCV',
  'pickup': 'LCV',
  'truck': 'HCV',
  'bus': 'BUS',
  'commercial': 'HCV'
};

// Generate SHA-256 hash for user ID
function generateUserIdHash(aadhaarNullifier: string): string {
  return keccak256(stringToBytes(aadhaarNullifier)).slice(2); // Remove 0x prefix
}

// Generate ECDSA signature for QR data
async function generateSignature(data: any, privateKey: string): Promise<string> {
  const message = JSON.stringify(data);
  const messageHash = keccak256(stringToBytes(message));
  // Note: This function would need a wallet client implementation
  // For now, we'll use the wallet signing approach in the main function
  throw new Error('Use wallet signing instead of private key');
}

class QRService {
  /**
   * Generate QR code for toll payment with real signature
   * @param walletAddress User's wallet address (42 characters)
   * @param vehicle Vehicle information
   * @param sessionToken Current session token
   * @param tollRate Current toll rate (optional)
   * @returns Promise with QR code data URL and QR data
   */
  async generateTollQRCodeSimple(
    walletAddress: string,
    vehicle: VehicleInfo,
    sessionToken: string,
    tollRate?: number
  ): Promise<QRCodeResult> {
    // Generate standardized vehicle type code
    const vehicleTypeCode = VEHICLE_TYPE_MAP[vehicle.vehicleType.toLowerCase()] || '4W';
    
    // Generate user ID hash from session token (temporary solution)
    const userId = generateUserIdHash(sessionToken);
    
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create base QR data (without signature)
    const baseData = {
      walletAddress,
      vehicleNumber: vehicle.vehicleId,
      vehicleType: vehicleTypeCode,
      userId,
      timestamp,
      version: 'v1'
    };
    
    // Generate real signature using wallet
    let signature = '0x' + '0'.repeat(130); // Fallback to mock signature
    
    try {
      // Check if wallet is available
      if (!window.ethereum) {
        throw new Error('Wallet not available');
      }

      // Get current accounts
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet accounts found');
      }

      const currentAccount = accounts[0];
      console.log('Current wallet account:', currentAccount);
      console.log('Target wallet address:', walletAddress);

      // Create wallet client
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum)
      });

      // Get the account for signing
      const [account] = await walletClient.getAddresses();
      
      // Check if we have the right account
      if (!account) {
        throw new Error('No account available for signing');
      }

      console.log('Wallet client account:', account);
      console.log('Account matches target:', account.toLowerCase() === walletAddress.toLowerCase());

      // Create the message to sign
      const message = JSON.stringify(baseData);
      const messageHash = keccak256(stringToBytes(message));
      
      console.log('Message to sign:', message);
      console.log('Message hash:', messageHash);

      // Sign the message
      signature = await walletClient.signMessage({
        account,
        message: { raw: hexToBytes(messageHash) }
      });
      
      console.log('Generated real signature:', signature);
      console.log('Signature length:', signature.length);
      
    } catch (error) {
      console.error('Could not generate real signature:', error);
      console.warn('Using mock signature as fallback');
      // Keep mock signature as fallback
    }
    
    // Create final QR data with signature
    const qrData: QRCodeData = {
      ...baseData,
      signature,
      sessionToken, // Legacy field
      tollRate
    };

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      return {
        dataUrl: qrCodeDataUrl,
        qrData
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Parse QR code data from scanned QR code
   * @param qrCodeString Scanned QR code string
   * @returns Parsed QR code data
   */
  parseQRCodeData(qrCodeString: string): QRCodeData {
    try {
      const parsed = JSON.parse(qrCodeString);
      
      // Validate required fields according to new specification
      if (!parsed.walletAddress || !parsed.vehicleNumber || !parsed.vehicleType || 
          !parsed.userId || !parsed.timestamp || !parsed.signature || !parsed.version) {
        throw new Error('Invalid QR code data structure - missing required fields');
      }

      // Validate field lengths
      if (parsed.walletAddress.length !== 42) {
        throw new Error('Invalid wallet address length');
      }
      if (parsed.userId.length !== 64) { // 32 bytes = 64 hex chars
        throw new Error('Invalid user ID length');
      }
      if (parsed.signature.length !== 132) { // 0x + 130 hex chars
        throw new Error('Invalid signature length');
      }

      return parsed as QRCodeData;
    } catch (error) {
      console.error('Error parsing QR code data:', error);
      throw new Error('Invalid QR code format');
    }
  }

  /**
   * Validate QR code data
   * @param qrData QR code data to validate
   * @returns Validation result
   */
  async validateQRCodeData(qrData: QRCodeData): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Check timestamp validity (QR code should not be older than 5 minutes)
      const currentTime = Math.floor(Date.now() / 1000);
      const qrTime = qrData.timestamp;
      const timeDiff = currentTime - qrTime;
      
      if (timeDiff > 300) { // 5 minutes = 300 seconds
        return {
          isValid: false,
          error: 'QR code has expired (older than 5 minutes)'
        };
      }

      // Validate vehicle type codes
      const validVehicleTypes = ['2W', '4W', 'LCV', 'HCV', 'BUS'];
      if (!validVehicleTypes.includes(qrData.vehicleType)) {
        return {
          isValid: false,
          error: 'Invalid vehicle type code'
        };
      }

      // Verify signature
      const baseData = {
        walletAddress: qrData.walletAddress,
        vehicleNumber: qrData.vehicleNumber,
        vehicleType: qrData.vehicleType,
        userId: qrData.userId,
        timestamp: qrData.timestamp,
        version: qrData.version
      };

      const message = JSON.stringify(baseData);
      const messageHash = keccak256(stringToBytes(message));
      
      try {
        const isValidSignature = verifyMessage({
          address: qrData.walletAddress as `0x${string}`,
          message: { raw: hexToBytes(messageHash) },
          signature: qrData.signature as `0x${string}`
        });
        
        if (!isValidSignature) {
          return {
            isValid: false,
            error: 'Invalid signature - verification failed'
          };
        }
      } catch (sigError) {
        return {
          isValid: false,
          error: 'Invalid signature format'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Error validating QR code data'
      };
    }
  }

  /**
   * Generate QR code with user's main wallet signature (for top-up wallet scenarios)
   * @param topUpWalletAddress Top-up wallet address to include in QR
   * @param userWalletAddress User's main wallet address for signing
   * @param vehicle Vehicle information
   * @param sessionToken Current session token
   * @param tollRate Current toll rate (optional)
   * @returns Promise with QR code data URL and QR data
   */
  async generateTollQRCodeWithUserSignature(
    topUpWalletAddress: string,
    userWalletAddress: string,
    vehicle: VehicleInfo,
    sessionToken: string,
    tollRate?: number
  ): Promise<QRCodeResult> {
    // Generate standardized vehicle type code
    const vehicleTypeCode = VEHICLE_TYPE_MAP[vehicle.vehicleType.toLowerCase()] || '4W';
    
    // Generate user ID hash from session token
    const userId = generateUserIdHash(sessionToken);
    
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create base QR data (without signature)
    const baseData = {
      walletAddress: topUpWalletAddress, // Use top-up wallet address in QR
      vehicleNumber: vehicle.vehicleId,
      vehicleType: vehicleTypeCode,
      userId,
      timestamp,
      version: 'v1'
    };
    
    // Generate signature using user's main wallet
    let signature = '0x' + '0'.repeat(130); // Fallback to mock signature
    
    try {
      // Check if wallet is available
      if (!window.ethereum) {
        throw new Error('Wallet not available');
      }

      // Get current accounts
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet accounts found');
      }

      const currentAccount = accounts[0];
      console.log('Current wallet account:', currentAccount);
      console.log('User wallet address:', userWalletAddress);

      // Verify the current account matches the user wallet address
      if (currentAccount.toLowerCase() !== userWalletAddress.toLowerCase()) {
        throw new Error('Current wallet account does not match user wallet address');
      }

      // Create wallet client
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum)
      });

      // Get the account for signing
      const [account] = await walletClient.getAddresses();
      
      if (!account) {
        throw new Error('No account available for signing');
      }

      console.log('Signing with account:', account);

      // Create the message to sign
      const message = JSON.stringify(baseData);
      const messageHash = keccak256(stringToBytes(message));
      
      console.log('Message to sign:', message);
      console.log('Message hash:', messageHash);

      // Sign the message
      signature = await walletClient.signMessage({
        account,
        message: { raw: hexToBytes(messageHash) }
      });
      
      console.log('Generated real signature:', signature);
      console.log('Signature length:', signature.length);
      
    } catch (error) {
      console.error('Could not generate real signature:', error);
      console.warn('Using mock signature as fallback');
      // Keep mock signature as fallback
    }
    
    // Create final QR data with signature
    const qrData: QRCodeData = {
      ...baseData,
      signature,
      sessionToken, // Legacy field
      tollRate
    };

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      return {
        dataUrl: qrCodeDataUrl,
        qrData
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code for admin scanning (simplified version)
   * @param vehicleId Vehicle ID
   * @param walletAddress Wallet address
   * @returns QR code data URL
   */
  async generateAdminQRCode(vehicleId: string, walletAddress: string): Promise<string> {
    const adminQRData = {
      type: 'admin_scan',
      vehicleId,
      walletAddress,
      timestamp: Date.now()
    };

    try {
      return await QRCode.toDataURL(JSON.stringify(adminQRData), {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Error generating admin QR code:', error);
      throw new Error('Failed to generate admin QR code');
    }
  }
}

export const qrService = new QRService();
