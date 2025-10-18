export interface QRCodeData {
  walletAddress: string;
  vehicleId: string;
  vehicleType: string;
  timestamp: number;
  sessionToken: string;
  tollRate?: number;
  signature?: string;
  plazaId?: string;
  nonce?: string;
}
