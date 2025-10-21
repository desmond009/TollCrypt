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
  
  // Legacy fields for backward compatibility
  vehicleId?: string;         // Legacy field, use vehicleNumber instead
  plazaId?: string;
  nonce?: string;
}

// Force TypeScript to recognize the updated interface
export type QRCodeDataType = QRCodeData;
