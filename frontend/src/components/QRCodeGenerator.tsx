import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSession, sessionManager } from '../services/sessionManager';
import { qrService, QRCodeResult } from '../services/qrService';
import { VehicleInfo } from '../services/sessionManager';

interface QRCodeGeneratorProps {
  onQRGenerated?: (qrResult: QRCodeResult) => void;
  selectedVehicleProp?: VehicleInfo;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ 
  onQRGenerated, 
  selectedVehicleProp 
}) => {
  const { address } = useAccount();
  const { getSession } = useSession();
  const [vehicles, setVehicles] = useState<VehicleInfo[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [qrCodeResult, setQrCodeResult] = useState<QRCodeResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');

  // Load vehicles on component mount
  useEffect(() => {
    const sessionVehicles = sessionManager.getVehicles();
    setVehicles(sessionVehicles);
    
    // Set default selected vehicle
    if (sessionVehicles.length > 0) {
      const defaultVehicle = selectedVehicleProp || sessionVehicles[0];
      setSelectedVehicleId(defaultVehicle.vehicleId);
    }
  }, [selectedVehicleProp]);

  const handleGenerateQR = async () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!selectedVehicleId) {
      setError('Please select a vehicle');
      return;
    }

    const session = getSession();
    if (!session || !session.sessionToken) {
      setError('Session not found. Please login again.');
      return;
    }

    const vehicle = vehicles.find(v => v.vehicleId === selectedVehicleId);
    if (!vehicle) {
      setError('Selected vehicle not found');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const result = await qrService.generateTollQRCode(
        address,
        vehicle,
        session.sessionToken,
        0.001 // Default toll rate in ETH
      );

      setQrCodeResult(result);
      onQRGenerated?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefreshQR = () => {
    setQrCodeResult(null);
    handleGenerateQR();
  };

  const copyQRData = () => {
    if (qrCodeResult) {
      navigator.clipboard.writeText(JSON.stringify(qrCodeResult.qrData));
    }
  };

  const selectedVehicle = vehicles.find(v => v.vehicleId === selectedVehicleId);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Generate Toll QR Code
        </h2>
        <p className="text-gray-600">
          Generate a QR code for toll payment at toll plazas
        </p>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="text-lg font-medium">No Vehicles Registered</p>
            <p className="text-sm">Please register a vehicle first to generate QR codes</p>
          </div>
        </div>
      ) : (
        <>
          {/* Vehicle Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Vehicle
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {vehicles.map((vehicle) => (
                <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                  {vehicle.vehicleId} - {vehicle.vehicleType}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Vehicle Info */}
          {selectedVehicle && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-2">Vehicle Details</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">ID:</span> {selectedVehicle.vehicleId}</p>
                <p><span className="font-medium">Type:</span> {selectedVehicle.vehicleType}</p>
                <p><span className="font-medium">Status:</span> 
                  <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                    selectedVehicle.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedVehicle.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <div className="mb-6">
            <button
              onClick={handleGenerateQR}
              disabled={isGenerating || !selectedVehicleId}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating QR Code...
                </div>
              ) : (
                'Generate QR Code'
              )}
            </button>
          </div>

          {/* QR Code Display */}
          {qrCodeResult && (
            <div className="text-center">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  Your Toll Payment QR Code
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Show this QR code at the toll plaza for payment
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block mb-4">
                <img
                  src={qrCodeResult.dataUrl}
                  alt="Toll Payment QR Code"
                  className="w-64 h-64 mx-auto"
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleRefreshQR}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  Generate New QR Code
                </button>
                
                <button
                  onClick={copyQRData}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Copy QR Data
                </button>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This QR code is valid for 5 minutes. 
                  Generate a new one if needed.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
