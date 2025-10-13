import React, { useState, useRef } from 'react';
import { qrService, QRCodeData } from '../services/qrService';
import { qrAPIService } from '../services/qrAPIService';

interface QRCodeScannerProps {
  onQRScanned: (qrData: QRCodeData) => void;
  onError?: (error: string) => void;
  isScanning?: boolean;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ 
  onQRScanned, 
  onError,
  isScanning = true 
}) => {
  const [isActive, setIsActive] = useState(isScanning);
  const [lastScannedData, setLastScannedData] = useState<string>('');
  const [scanCount, setScanCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsActive(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      onError?.('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  };

  const captureAndScan = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for QR code scanning
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Simple QR code detection simulation
    // In a real implementation, you would use a QR code detection library
    // like jsQR or quagga2
    scanQRCode(imageData);
  };

  const scanQRCode = (imageData: ImageData) => {
    // This is a simplified simulation of QR code scanning
    // In a real implementation, you would use a proper QR code detection library
    
    // For demo purposes, we'll simulate scanning with a manual input
    // In production, this would be replaced with actual QR code detection
    console.log('Scanning QR code from image data...');
    
    // Simulate QR code detection delay
    setTimeout(() => {
      // For demo, we'll use a mock QR code data
      const mockQRData = {
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        vehicleId: 'MH12AB1234',
        vehicleType: 'car',
        timestamp: Date.now(),
        sessionToken: 'session_' + Date.now(),
        tollRate: 0.001
      };

      try {
        const qrData = qrService.parseQRCodeData(JSON.stringify(mockQRData));
        const validation = qrService.validateQRCodeData(qrData);
        
        if (validation.isValid) {
          setLastScannedData(JSON.stringify(qrData));
          setScanCount(prev => prev + 1);
          onQRScanned(qrData);
        } else {
          onError?.(validation.error || 'Invalid QR code');
        }
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'Failed to parse QR code');
      }
    }, 1000);
  };

  const handleManualInput = async (input: string) => {
    try {
      const qrData = qrService.parseQRCodeData(input);
      
      // Validate QR code with backend
      const validation = await qrAPIService.validateQRCode(qrData);
      
      if (validation.success && validation.data?.isValid) {
        setLastScannedData(input);
        setScanCount(prev => prev + 1);
        onQRScanned(qrData);
      } else {
        onError?.(validation.message || 'Invalid QR code');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to parse QR code');
    }
  };

  React.useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          QR Code Scanner
        </h2>
        <p className="text-gray-600">
          Scan QR code from user's mobile app for toll payment
        </p>
      </div>

      {/* Camera Controls */}
      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={() => setIsActive(!isActive)}
          className={`px-4 py-2 rounded-md transition-colors ${
            isActive 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isActive ? 'Stop Camera' : 'Start Camera'}
        </button>
        
        <button
          onClick={captureAndScan}
          disabled={!isActive}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Scan QR Code
        </button>
      </div>

      {/* Camera Feed */}
      <div className="mb-6">
        <div className="relative bg-gray-100 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-64 object-cover"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-lg font-medium">Camera Off</p>
                <p className="text-sm">Click "Start Camera" to begin scanning</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Manual QR Code Input (for testing)
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Paste QR code data here..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const input = e.currentTarget.value.trim();
                if (input) {
                  handleManualInput(input);
                  e.currentTarget.value = '';
                }
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.querySelector('input[type="text"]') as HTMLInputElement;
              if (input?.value.trim()) {
                handleManualInput(input.value.trim());
                input.value = '';
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Process
          </button>
        </div>
      </div>

      {/* Scan Statistics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{scanCount}</div>
          <div className="text-sm text-gray-600">QR Codes Scanned</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">
            {isActive ? 'ON' : 'OFF'}
          </div>
          <div className="text-sm text-gray-600">Scanner Status</div>
        </div>
      </div>

      {/* Last Scanned Data */}
      {lastScannedData && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">Last Scanned QR Code:</h3>
          <pre className="text-xs text-blue-700 bg-white p-2 rounded border overflow-x-auto">
            {JSON.stringify(JSON.parse(lastScannedData), null, 2)}
          </pre>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-medium text-yellow-800 mb-2">Instructions:</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Position the QR code within the camera view</li>
          <li>• Click "Scan QR Code" to capture and process</li>
          <li>• Ensure good lighting for better scanning</li>
          <li>• QR codes expire after 5 minutes</li>
        </ul>
      </div>
    </div>
  );
};
