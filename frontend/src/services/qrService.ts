import QRCode from 'qrcode';
import { VehicleInfo } from './sessionManager';

export interface QRCodeData {
  walletAddress: string;
  vehicleId: string;
  vehicleType: string;
  timestamp: number;
  sessionToken: string;
  tollRate?: number;
}

export interface QRCodeResult {
  dataUrl: string;
  qrData: QRCodeData;
}

class QRService {
  /**
   * Generate QR code for toll payment
   * @param walletAddress User's wallet address
   * @param vehicle Vehicle information
   * @param sessionToken Current session token
   * @param tollRate Current toll rate (optional)
   * @returns Promise with QR code data URL and QR data
   */
  async generateTollQRCode(
    walletAddress: string,
    vehicle: VehicleInfo,
    sessionToken: string,
    tollRate?: number
  ): Promise<QRCodeResult> {
    const qrData: QRCodeData = {
      walletAddress,
      vehicleId: vehicle.vehicleId,
      vehicleType: vehicle.vehicleType,
      timestamp: Date.now(),
      sessionToken,
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
      
      // Validate required fields
      if (!parsed.walletAddress || !parsed.vehicleId || !parsed.vehicleType || !parsed.sessionToken) {
        throw new Error('Invalid QR code data structure');
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
  validateQRCodeData(qrData: QRCodeData): { isValid: boolean; error?: string } {
    try {
      // Check if QR code is not too old (5 minutes)
      const now = Date.now();
      const qrAge = now - qrData.timestamp;
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (qrAge > maxAge) {
        return {
          isValid: false,
          error: 'QR code has expired. Please generate a new one.'
        };
      }

      // Validate required fields
      if (!qrData.walletAddress || !qrData.vehicleId || !qrData.vehicleType || !qrData.sessionToken) {
        return {
          isValid: false,
          error: 'Invalid QR code data'
        };
      }

      // Validate wallet address format (basic check)
      if (!qrData.walletAddress.startsWith('0x') || qrData.walletAddress.length !== 42) {
        return {
          isValid: false,
          error: 'Invalid wallet address format'
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
