import React, { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useSession, VehicleInfo } from '../services/sessionManager';
import { VehicleRegistration } from './VehicleRegistration';
import { topUpWalletAPI, TopUpWalletInfo } from '../services/topUpWalletService';

type AppStep = 'wallet' | 'auth' | 'register' | 'topup' | 'payment' | 'dashboard' | 'profile';

interface UserProfileProps {
  onNavigate?: (step: AppStep) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onNavigate }) => {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { 
    getSession, 
    removeVehicle, 
    updateVehicle, 
    clearSession,
    getSessionStatus,
    addVehicle
  } = useSession();
  
  const [session, setSession] = useState(getSession());
  const [sessionStatus, setSessionStatus] = useState(getSessionStatus());
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [newVehicleType, setNewVehicleType] = useState('');
  const [topUpWalletInfo, setTopUpWalletInfo] = useState<TopUpWalletInfo | null>(null);
  const [hasTopUpWallet, setHasTopUpWallet] = useState<boolean>(false);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(true);

  useEffect(() => {
    setSession(getSession());
    setSessionStatus(getSessionStatus());
  }, []);

  // Load top-up wallet information
  useEffect(() => {
    const loadTopUpWallet = async () => {
      if (!address || !sessionStatus.isAuthenticated) {
        setIsLoadingWallet(false);
        return;
      }

      try {
        setIsLoadingWallet(true);
        
        // Try to get wallet info - this will work for both existing and new wallets
        try {
          const walletInfo = await topUpWalletAPI.getTopUpWalletInfo();
          setTopUpWalletInfo(walletInfo);
          setHasTopUpWallet(true);
          console.log('Top-up wallet loaded successfully:', walletInfo.walletAddress);
        } catch (error) {
          // If wallet doesn't exist, that's okay - user can create one later
          console.log('No top-up wallet found for user');
          setTopUpWalletInfo(null);
          setHasTopUpWallet(false);
        }
      } catch (error) {
        console.error('Error loading top-up wallet:', error);
        setTopUpWalletInfo(null);
        setHasTopUpWallet(false);
      } finally {
        setIsLoadingWallet(false);
      }
    };

    loadTopUpWallet();
  }, [address, sessionStatus.isAuthenticated]);

  const handleRemoveVehicle = async (vehicleId: string) => {
    if (window.confirm(`Are you sure you want to remove vehicle ${vehicleId}?`)) {
      const success = removeVehicle(vehicleId);
      if (success) {
        setSession(getSession());
        setSessionStatus(getSessionStatus());
      }
    }
  };

  const handleUpdateVehicleType = async (vehicleId: string) => {
    if (!newVehicleType.trim()) return;
    
    const success = updateVehicle(vehicleId, { vehicleType: newVehicleType });
    if (success) {
      setSession(getSession());
      setSessionStatus(getSessionStatus());
      setEditingVehicle(null);
      setNewVehicleType('');
    }
  };

  const handleDisconnect = () => {
    clearSession();
    disconnect();
    // Force a page reload to reset the entire app state
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!session) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-4">User Profile</h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-yellow-400 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-black font-bold text-xl">TC</span>
          </div>
          <p className="text-gray-400 mb-4">No active session found</p>
          <p className="text-sm text-gray-500 mb-6">Please authenticate with Aadhaar to access your profile and manage your vehicles.</p>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                // Navigate to auth step
                onNavigate?.('auth');
              }}
              className="btn-primary w-full"
            >
              🔐 Start Aadhaar Authentication
            </button>
            
            <button
              onClick={handleDisconnect}
              className="btn-secondary w-full"
            >
              🔌 Disconnect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="card">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">User Profile</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span>Wallet Connected</span>
              </div>
              {sessionStatus.isAuthenticated && (
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                  <span>Authenticated</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear your session data? This will require you to authenticate again.')) {
                  clearSession();
                  setSession(getSession());
                  setSessionStatus(getSessionStatus());
                }
              }}
              className="btn-secondary"
            >
              Clear Session
            </button>
            <button
              onClick={handleDisconnect}
              className="btn-secondary"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Wallet Info */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Wallet Information</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Address:</span>
              <span className="text-white font-mono text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Session Status:</span>
              <span className={`text-sm ${sessionStatus.sessionValid ? 'text-green-400' : 'text-red-400'}`}>
                {sessionStatus.sessionValid ? 'Active' : 'Expired'}
              </span>
            </div>
            {session.authTimestamp && (
              <div className="flex justify-between">
                <span className="text-gray-400">Last Auth:</span>
                <span className="text-white text-sm">
                  {formatDate(new Date(session.authTimestamp).toISOString())}
                </span>
              </div>
            )}
            
            {/* Top-up Wallet Information */}
            {isLoadingWallet ? (
              <div className="flex justify-between">
                <span className="text-gray-400">Top-up Wallet:</span>
                <span className="text-gray-500 text-sm">Loading...</span>
              </div>
            ) : hasTopUpWallet && topUpWalletInfo ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Top-up Wallet:</span>
                  <span className="text-white font-mono text-sm">
                    {topUpWalletInfo.walletAddress.slice(0, 6)}...{topUpWalletInfo.walletAddress.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance:</span>
                  <span className="text-green-400 text-sm font-semibold">
                    {parseFloat(topUpWalletInfo.balance).toFixed(4)} ETH
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400 text-sm">
                    {topUpWalletInfo.isInitialized ? 'Active' : 'Initializing'}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span className="text-gray-400">Top-up Wallet:</span>
                <span className="text-yellow-400 text-sm">Not Created</span>
              </div>
            )}
          </div>
          
          {/* Top-up Button */}
          <div className="border-t border-gray-700 pt-4">
            <button
              onClick={() => onNavigate?.('topup')}
              disabled={!sessionStatus.hasVehicles || isLoadingWallet}
              className={`w-full flex items-center justify-center space-x-2 ${
                sessionStatus.hasVehicles && !isLoadingWallet
                  ? 'btn-primary' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
              }`}
              title={
                !sessionStatus.hasVehicles 
                  ? 'Please register a vehicle first to enable wallet top-up' 
                  : isLoadingWallet 
                    ? 'Loading wallet information...' 
                    : ''
              }
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>
                {isLoadingWallet ? 'Loading...' : hasTopUpWallet ? 'Top-up Wallet' : 'Create & Top-up Wallet'}
              </span>
            </button>
            {!sessionStatus.hasVehicles && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Register a vehicle to enable wallet top-up functionality
              </p>
            )}
            {isLoadingWallet && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Loading wallet information...
              </p>
            )}
          </div>
        </div>

        {/* Authentication Status */}
        {sessionStatus.needsAuth && (
          <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <div>
                <p className="text-yellow-300 font-semibold">Authentication Required</p>
                <p className="text-yellow-400 text-sm">
                  Your authentication has expired. Please re-authenticate to access secure features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Anon-Aadhaar Authentication Section */}
        {sessionStatus.needsAuth && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">🔐 Anon-Aadhaar Authentication</h3>
            <p className="text-gray-400 text-sm mb-4">
              Complete Aadhaar verification to access vehicle registration and other secure features.
            </p>
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                </svg>
              </div>
              <h4 className="text-lg font-medium text-white mb-2">Anonymous Aadhaar Authentication</h4>
              <p className="text-gray-400 text-sm mb-6">
                Verify your identity using zero-knowledge proofs without revealing personal data
              </p>
              <button
                onClick={() => onNavigate?.('auth')}
                className="btn-primary px-6 py-3 text-lg"
              >
                🔐 Start Aadhaar Authentication
              </button>
            </div>
          </div>
        )}

        {/* Vehicle Registration Section - Only show if authenticated but no vehicles */}
        {sessionStatus.isAuthenticated && !sessionStatus.hasVehicles && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">🚗 Register Your Vehicle</h3>
            <p className="text-gray-400 text-sm mb-4">
              Register your vehicle to start using FASTag services and enable wallet top-up functionality.
            </p>
            <VehicleRegistration
              onRegistrationSuccess={(vehicleData) => {
                // Update session with new vehicle
                const vehicleInfo: VehicleInfo = {
                  vehicleId: vehicleData.vehicleId,
                  vehicleType: vehicleData.vehicleType,
                  registrationDate: vehicleData.registrationDate,
                  documents: vehicleData.documents,
                  isActive: vehicleData.isActive
                };
                addVehicle(vehicleInfo);
                setSession(getSession());
                setSessionStatus(getSessionStatus());
              }}
            />
          </div>
        )}
      </div>

      {/* Vehicle Management */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">Registered Vehicles</h3>
          <span className="text-sm text-gray-400">
            {session.vehicles.length} vehicle(s) registered
          </span>
        </div>

        {session.vehicles.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <p className="text-gray-400 mb-2">No vehicles registered</p>
            {sessionStatus.needsAuth ? (
              <p className="text-sm text-gray-500">Complete Aadhaar authentication above to register your first vehicle.</p>
            ) : (
              <p className="text-sm text-gray-500">Register a vehicle to start using FASTag services.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {session.vehicles.map((vehicle) => (
              <div key={vehicle.vehicleId} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h4 className="text-lg font-semibold text-white mr-3">
                        {vehicle.vehicleId}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        vehicle.isActive 
                          ? 'bg-green-900 text-green-300' 
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {vehicle.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Type:</span>
                        {editingVehicle === vehicle.vehicleId ? (
                          <div className="flex items-center space-x-2 mt-1">
                            <select
                              value={newVehicleType}
                              onChange={(e) => setNewVehicleType(e.target.value)}
                              className="input-field text-sm"
                            >
                              <option value="">Select Type</option>
                              <option value="car">Car</option>
                              <option value="truck">Truck</option>
                              <option value="bus">Bus</option>
                              <option value="motorcycle">Motorcycle</option>
                              <option value="commercial">Commercial Vehicle</option>
                            </select>
                            <button
                              onClick={() => handleUpdateVehicleType(vehicle.vehicleId)}
                              className="btn-primary text-xs px-2 py-1"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingVehicle(null);
                                setNewVehicleType('');
                              }}
                              className="btn-secondary text-xs px-2 py-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-white ml-2 capitalize">{vehicle.vehicleType}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-400">Registered:</span>
                        <span className="text-white ml-2">{formatDate(vehicle.registrationDate)}</span>
                      </div>
                    </div>

                    {vehicle.documents.length > 0 && (
                      <div className="mt-3">
                        <span className="text-gray-400 text-sm">Documents:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {vehicle.documents.map((doc, index) => (
                            <span key={index} className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                              {doc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingVehicle(vehicle.vehicleId);
                        setNewVehicleType(vehicle.vehicleType);
                      }}
                      className="btn-secondary text-xs px-3 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveVehicle(vehicle.vehicleId)}
                      className="btn-secondary text-xs px-3 py-1 text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Session Management</h3>
        <div className="space-y-3">
          <button
            onClick={() => {
              clearSession();
              setSession(null);
              setSessionStatus(getSessionStatus());
            }}
            className="btn-secondary w-full"
          >
            Clear Session Data
          </button>
          <p className="text-sm text-gray-400">
            This will remove all stored session data and require re-authentication.
          </p>
        </div>
      </div>
    </div>
  );
};
