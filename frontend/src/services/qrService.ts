import QRCode from 'qrcode';
import { VehicleInfo } from './sessionManager';
import { ethers } from 'ethers';

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
  return ethers.utils.sha256(ethers.utils.toUtf8Bytes(aadhaarNullifier)).slice(2); // Remove 0x prefix
}

// Generate ECDSA signature for QR data
async function generateSignature(data: any, privateKey: string): Promise<string> {
  const message = JSON.stringify(data);
  const messageHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(message));
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));
  return signature;
}

class QRService {
  /**
   * Generate QR code for toll payment (simplified version for current implementation)
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
    
    // Create QR data with mock signature for now
    const qrData: QRCodeData = {
      walletAddress,
      vehicleNumber: vehicle.vehicleId,
      vehicleType: vehicleTypeCode,
      userId,
      timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
      signature: '0x' + '0'.repeat(130), // Mock signature - will be replaced with real implementation
      version: 'v1',
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
      const messageHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(message));
      
      try {
        const recoveredAddress = ethers.utils.verifyMessage(
          ethers.utils.arrayify(messageHash),
          qrData.signature
        );
        
        if (recoveredAddress.toLowerCase() !== qrData.walletAddress.toLowerCase()) {
          return {
            isValid: false,
            error: 'Invalid signature - wallet address mismatch'
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
