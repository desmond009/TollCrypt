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
      const result = await qrService.generateTollQRCodeSimple(
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
    <div className="bg-gray-900 rounded-lg shadow-lg p-6 max-w-md mx-auto border border-gray-800">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          Generate Toll QR Code
        </h2>
        <p className="text-gray-400">
          Generate a QR code for toll payment at toll plazas
        </p>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="text-lg font-medium text-white">No Vehicles Registered</p>
            <p className="text-sm text-gray-400">Please register a vehicle first to generate QR codes</p>
          </div>
        </div>
      ) : (
        <>
          {/* Vehicle Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-2">
              Select Vehicle
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
            >
              <option value="" disabled className="bg-gray-800 text-white">
                Choose a vehicle...
              </option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.vehicleId} value={vehicle.vehicleId} className="bg-gray-800 text-white">
                  {vehicle.vehicleId} - {vehicle.vehicleType}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Vehicle Info */}
          {selectedVehicle && (
            <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="font-medium text-white mb-2">Vehicle Details</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p><span className="font-medium">ID:</span> {selectedVehicle.vehicleId}</p>
                <p><span className="font-medium">Type:</span> {selectedVehicle.vehicleType}</p>
                <p><span className="font-medium">Status:</span> 
                  <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                    selectedVehicle.isActive 
                      ? 'bg-green-900 text-green-300 border border-green-700' 
                      : 'bg-red-900 text-red-300 border border-red-700'
                  }`}>
                    {selectedVehicle.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-300 rounded">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <div className="mb-6">
            <button
              onClick={handleGenerateQR}
              disabled={isGenerating || !selectedVehicleId}
              className="w-full btn-primary disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                <h3 className="text-lg font-medium text-white mb-2">
                  Your Toll Payment QR Code
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Show this QR code at the toll plaza for payment
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border-2 border-gray-700 inline-block mb-4">
                <img
                  src={qrCodeResult.dataUrl}
                  alt="Toll Payment QR Code"
                  className="w-64 h-64 mx-auto"
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleRefreshQR}
                  className="w-full btn-primary"
                >
                  Generate New QR Code
                </button>
                
                <button
                  onClick={copyQRData}
                  className="w-full btn-secondary"
                >
                  Copy QR Data
                </button>
              </div>

              <div className="mt-4 p-3 bg-blue-900 border border-blue-700 rounded-lg">
                <p className="text-sm text-blue-300">
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
