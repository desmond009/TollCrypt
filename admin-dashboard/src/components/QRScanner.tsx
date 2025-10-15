import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { QrCodeIcon, CameraIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { QRCodeData } from '../types/qr';
import { ethers } from 'ethers';

interface QRScannerProps {
  onQRScanned: (data: QRCodeData) => void;
  onError?: (error: string) => void;
  isScanning: boolean;
  onClose?: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onQRScanned,
  onError,
  isScanning,
  onClose,
}) => {
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);

  const initializeScanner = () => {
    if (scannerRef.current && !isInitialized) {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      html5QrcodeScanner.render(
        (decodedText: string, decodedResult: any) => {
          handleQRCodeSuccess(decodedText);
        },
        (error: any) => {
          // Silent error handling - don't show every scan attempt error
        }
      );

      setScanner(html5QrcodeScanner);
      setIsInitialized(true);
    }
  };

  const handleQRCodeSuccess = (decodedText: string) => {
    try {
      const qrData = JSON.parse(decodedText);
      
      // Validate QR code structure
      if (qrData.walletAddress && qrData.vehicleId && qrData.vehicleType) {
        // Validate wallet address format
        if (!ethers.isAddress(qrData.walletAddress)) {
          throw new Error('Invalid wallet address in QR code');
        }
        
        setScanResult(decodedText);
        
        // Play success sound
        playSuccessSound();
        
        // Vibrate if supported
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        
        // Stop scanning and process the QR code
        stopScanner();
        onQRScanned(qrData);
      } else {
        throw new Error('Invalid QR code format');
      }
    } catch (error) {
      onError?.('Invalid QR code format. Please try again.');
    }
  };

  const playSuccessSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiE0fPTgjMGHm7A7+OZURE=');
      audio.play().catch(() => {
        // Ignore audio play errors
      });
    } catch (error) {
      // Ignore audio errors
    }
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.clear().catch(() => {
        // Ignore clear errors
      });
    }
  };

  const startScanner = () => {
    if (!isInitialized) {
      initializeScanner();
    }
  };

  const handleManualEntry = () => {
    try {
      const qrData = JSON.parse(manualEntry);
      if (qrData.walletAddress && qrData.vehicleId && qrData.vehicleType) {
        // Validate wallet address format
        if (!ethers.isAddress(qrData.walletAddress)) {
          onError?.('Invalid wallet address in QR code data');
          return;
        }
        
        onQRScanned(qrData);
        setManualEntry('');
        setShowManualEntry(false);
      } else {
        onError?.('Invalid QR code data format');
      }
    } catch (error) {
      onError?.('Invalid JSON format');
    }
  };

  useEffect(() => {
    if (isScanning && !isInitialized) {
      startScanner();
    } else if (!isScanning && scanner) {
      stopScanner();
    }

    return () => {
      if (scanner) {
        stopScanner();
      }
    };
  }, [isScanning, isInitialized]);

  useEffect(() => {
    return () => {
      if (scanner) {
        stopScanner();
      }
    };
  }, []);

  if (!isScanning) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
        <QrCodeIcon className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">QR Scanner Ready</h3>
        <p className="text-sm text-gray-500 text-center mb-4">
          Click "Start Scanning" to begin QR code detection
        </p>
        <button
          onClick={startScanner}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Start Scanning
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Scanner Container */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <div id="qr-reader" ref={scannerRef} className="w-full"></div>
        
        {/* Overlay with scanning indicator */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
              Scanning...
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* Scanning area indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-green-400 rounded-lg relative">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Entry Fallback */}
      <div className="mt-4">
        <button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          <CameraIcon className="h-4 w-4 mr-1" />
          {showManualEntry ? 'Hide' : 'Show'} Manual Entry
        </button>
        
        {showManualEntry && (
          <div className="mt-2 space-y-2">
            <textarea
              value={manualEntry}
              onChange={(e) => setManualEntry(e.target.value)}
              placeholder="Paste QR code data here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows={3}
            />
            <button
              onClick={handleManualEntry}
              disabled={!manualEntry.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Process Manual Entry
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Scanning Instructions:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Position the QR code within the scanning area</li>
          <li>• Ensure good lighting and steady hands</li>
          <li>• The scanner will automatically detect and process valid QR codes</li>
          <li>• Use manual entry if scanning fails</li>
        </ul>
      </div>
    </div>
  );
};
