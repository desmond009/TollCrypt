import { QRCodeData } from '../types/qr';

export interface ReceiptData {
  transactionId: string;
  vehicleNumber: string;
  vehicleType: string;
  tollAmount: string;
  timestamp: number;
  transactionHash: string;
  adminWallet: string;
  plazaId?: string;
  gasUsed?: string;
}

export class ReceiptService {
  static generateReceipt(data: ReceiptData): string {
    const receipt = `
╔══════════════════════════════════════════════════════════════╗
║                    TOLLCHAIN RECEIPT                        ║
╠══════════════════════════════════════════════════════════════╣
║ Transaction ID: ${data.transactionId.padEnd(40)} ║
║ Vehicle Number: ${data.vehicleNumber.padEnd(38)} ║
║ Vehicle Type: ${data.vehicleType.toUpperCase().padEnd(40)} ║
║ Toll Amount: ₹${data.tollAmount.padEnd(44)} ║
║ Timestamp: ${new Date(data.timestamp).toLocaleString().padEnd(35)} ║
║ Transaction Hash: ${data.transactionHash.substring(0, 20)}... ║
║ Admin Wallet: ${data.adminWallet.substring(0, 20)}... ║
║ Gas Used: ${data.gasUsed || 'N/A'} ║
╠══════════════════════════════════════════════════════════════╣
║ Status: ✅ CONFIRMED                                        ║
║ Payment Method: Blockchain (TopUpWallet)                     ║
║ Barrier Status: 🚧 OPENED                                   ║
╚══════════════════════════════════════════════════════════════╝
    `;
    
    return receipt.trim();
  }

  static generateDigitalReceipt(data: ReceiptData): {
    receiptId: string;
    qrCode: string;
    downloadUrl: string;
  } {
    const receiptId = `TC-${Date.now()}-${data.transactionId}`;
    
    // Generate QR code data for receipt verification
    const qrData = {
      receiptId,
      transactionHash: data.transactionHash,
      vehicleNumber: data.vehicleNumber,
      amount: data.tollAmount,
      timestamp: data.timestamp,
    };
    
    const qrCode = JSON.stringify(qrData);
    
    // Create downloadable receipt
    const receipt = this.generateReceipt(data);
    const blob = new Blob([receipt], { type: 'text/plain' });
    const downloadUrl = URL.createObjectURL(blob);
    
    return {
      receiptId,
      qrCode,
      downloadUrl,
    };
  }

  static downloadReceipt(data: ReceiptData): void {
    const receipt = this.generateReceipt(data);
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `toll-receipt-${data.vehicleNumber}-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  static printReceipt(data: ReceiptData): void {
    const receipt = this.generateReceipt(data);
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Toll Receipt - ${data.vehicleNumber}</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                margin: 20px;
                background: white;
              }
              pre { 
                white-space: pre-wrap; 
                word-wrap: break-word; 
              }
            </style>
          </head>
          <body>
            <pre>${receipt}</pre>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }
}
