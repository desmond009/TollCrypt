import { QRCodeData } from './qrService';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '') + '/api';

export interface QRVerificationResponse {
  success: boolean;
  message: string;
  data?: {
    vehicleNumber: string;
    vehicleType: string;
    owner: string;
    tollRate: number;
    isValid: boolean;
  };
}

export interface QRPaymentResponse {
  success: boolean;
  message: string;
  data?: {
    transactionId: string;
    vehicleNumber: string;
    amount: number;
    transactionHash: string;
    timestamp: Date;
  };
}

export interface QRStatsResponse {
  success: boolean;
  data?: {
    overall: {
      totalTransactions: number;
      totalAmount: number;
      averageAmount: number;
    };
    byVehicleType: Array<{
      _id: string;
      count: number;
      totalAmount: number;
    }>;
  };
}

class QRAPIService {
  /**
   * Verify QR code data
   */
  async verifyQRCode(qrData: QRCodeData, sessionToken: string): Promise<QRVerificationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/qr/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrData,
          sessionToken
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('QR verification error:', error);
      return {
        success: false,
        message: 'Failed to verify QR code'
      };
    }
  }

  /**
   * Process toll payment via QR code
   */
  async processQRPayment(
    qrData: QRCodeData, 
    transactionHash: string, 
    adminId: string
  ): Promise<QRPaymentResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/qr/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrData,
          transactionHash,
          adminId
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('QR payment processing error:', error);
      return {
        success: false,
        message: 'Failed to process QR payment'
      };
    }
  }

  /**
   * Validate QR code for admin scanning
   */
  async validateQRCode(qrData: QRCodeData): Promise<QRVerificationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/qr/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrData
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('QR validation error:', error);
      return {
        success: false,
        message: 'Failed to validate QR code'
      };
    }
  }

  /**
   * Get QR payment statistics
   */
  async getQRStats(startDate?: string, endDate?: string): Promise<QRStatsResponse> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`${API_BASE_URL}/qr/stats?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('QR stats error:', error);
      return {
        success: false,
        data: {
          overall: { totalTransactions: 0, totalAmount: 0, averageAmount: 0 },
          byVehicleType: []
        }
      };
    }
  }

  /**
   * Get recent QR payments
   */
  async getRecentQRPayments(limit: number = 10): Promise<{
    success: boolean;
    data?: Array<{
      _id: string;
      vehicleNumber: string;
      vehicleType: string;
      owner: string;
      amount: number;
      transactionHash: string;
      processedAt: Date;
      status: string;
    }>;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/qr/recent?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Recent QR payments error:', error);
      return {
        success: false,
        data: []
      };
    }
  }

  /**
   * Check if backend is available
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
}

export const qrAPIService = new QRAPIService();
