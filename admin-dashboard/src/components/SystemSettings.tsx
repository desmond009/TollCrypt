import React, { useState, useEffect } from 'react';
import { 
  CogIcon, 
  GlobeAltIcon, 
  BellIcon, 
  ShieldCheckIcon, 
  ServerIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { SystemSettings as SystemSettingsType, UpdateSystemSettingsForm } from '../types/adminManagement';

interface SystemSettingsProps {
  user: any;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ user }) => {
  const [settings, setSettings] = useState<SystemSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');

  // Check if user has permission to manage system settings
  const canManageSettings = user?.permissions?.canManageSystemSettings;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin-management/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updateData: UpdateSystemSettingsForm) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin-management/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const data = await response.json();
      setSettings(data.data);
      setSuccess('Settings updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleMaintenanceMode = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/admin-management/settings/maintenance-mode', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          enabled,
          message: enabled ? 'System is under maintenance. Please try again later.' : '',
          allowedIPs: []
        })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle maintenance mode');
      }

      const data = await response.json();
      setSettings(prev => prev ? { ...prev, maintenanceMode: data.data } : null);
      setSuccess(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle maintenance mode');
    }
  };

  if (!canManageSettings) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Access Denied</h3>
        <p className="text-gray-400">You don't have permission to manage system settings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-400 mt-2">Loading settings...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Settings Not Found</h3>
        <p className="text-gray-400">Unable to load system settings.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'general', name: 'General', icon: GlobeAltIcon },
    { id: 'blockchain', name: 'Blockchain', icon: ServerIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'backup', name: 'Backup & Maintenance', icon: CloudIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-gray-400">Configure system-wide settings and preferences</p>
        </div>
        <div className="flex items-center gap-4">
          {settings.maintenanceMode.enabled && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-900 border border-yellow-700 rounded-lg">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-400 text-sm">Maintenance Mode</span>
            </div>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-gray-800 rounded-lg p-1">
        <nav className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                } flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 rounded-lg p-6">
        {activeTab === 'general' && (
          <GeneralSettings 
            settings={settings} 
            onUpdate={updateSettings}
            saving={saving}
          />
        )}
        {activeTab === 'blockchain' && (
          <BlockchainSettings 
            settings={settings} 
            onUpdate={updateSettings}
            saving={saving}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationSettings 
            settings={settings} 
            onUpdate={updateSettings}
            saving={saving}
          />
        )}
        {activeTab === 'security' && (
          <SecuritySettings 
            settings={settings} 
            onUpdate={updateSettings}
            saving={saving}
          />
        )}
        {activeTab === 'backup' && (
          <BackupSettings 
            settings={settings} 
            onUpdate={updateSettings}
            onToggleMaintenance={toggleMaintenanceMode}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
};

// General Settings Component
const GeneralSettings: React.FC<{
  settings: SystemSettingsType;
  onUpdate: (data: UpdateSystemSettingsForm) => void;
  saving: boolean;
}> = ({ settings, onUpdate, saving }) => {
  const [formData, setFormData] = useState({
    systemName: settings.systemName,
    timezone: settings.timezone,
    dateFormat: settings.dateFormat,
    timeFormat: settings.timeFormat,
    language: settings.language
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-medium text-white mb-4">General Configuration</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            System Name
          </label>
          <input
            type="text"
            value={formData.systemName}
            onChange={(e) => setFormData({ ...formData, systemName: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Timezone
          </label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Asia/Kolkata">India Standard Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Date Format
          </label>
          <select
            value={formData.dateFormat}
            onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="DD-MM-YYYY">DD-MM-YYYY</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Time Format
          </label>
          <select
            value={formData.timeFormat}
            onChange={(e) => setFormData({ ...formData, timeFormat: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">24 Hour</option>
            <option value="12h">12 Hour</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Language
          </label>
          <select
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

// Blockchain Settings Component
const BlockchainSettings: React.FC<{
  settings: SystemSettingsType;
  onUpdate: (data: UpdateSystemSettingsForm) => void;
  saving: boolean;
}> = ({ settings, onUpdate, saving }) => {
  const [formData, setFormData] = useState({
    rpcUrl: settings.rpcUrl,
    contractAddresses: settings.contractAddresses,
    adminWalletAddress: settings.adminWalletAddress,
    gasSettings: settings.gasSettings
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-medium text-white mb-4">Blockchain Configuration</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            RPC URL
          </label>
          <input
            type="url"
            value={formData.rpcUrl}
            onChange={(e) => setFormData({ ...formData, rpcUrl: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://sepolia.base.org"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Contract Addresses
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Toll Collection</label>
              <input
                type="text"
                value={formData.contractAddresses.tollCollection}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  contractAddresses: { 
                    ...formData.contractAddresses, 
                    tollCollection: e.target.value 
                  }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="0x..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Top-Up Wallet Factory</label>
              <input
                type="text"
                value={formData.contractAddresses.topUpWalletFactory}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  contractAddresses: { 
                    ...formData.contractAddresses, 
                    topUpWalletFactory: e.target.value 
                  }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="0x..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Anon Aadhaar Verifier</label>
              <input
                type="text"
                value={formData.contractAddresses.anonAadhaarVerifier}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  contractAddresses: { 
                    ...formData.contractAddresses, 
                    anonAadhaarVerifier: e.target.value 
                  }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="0x..."
              />
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Admin Wallet Address
          </label>
          <input
            type="text"
            value={formData.adminWalletAddress}
            onChange={(e) => setFormData({ ...formData, adminWalletAddress: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="0x..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Gas Settings
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Gas Price (wei)</label>
              <input
                type="number"
                value={formData.gasSettings.gasPrice}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  gasSettings: { 
                    ...formData.gasSettings, 
                    gasPrice: parseInt(e.target.value) 
                  }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Gas Limit</label>
              <input
                type="number"
                value={formData.gasSettings.gasLimit}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  gasSettings: { 
                    ...formData.gasSettings, 
                    gasLimit: parseInt(e.target.value) 
                  }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Gas Price (wei)</label>
              <input
                type="number"
                value={formData.gasSettings.maxGasPrice}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  gasSettings: { 
                    ...formData.gasSettings, 
                    maxGasPrice: parseInt(e.target.value) 
                  }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

// Notification Settings Component
const NotificationSettings: React.FC<{
  settings: SystemSettingsType;
  onUpdate: (data: UpdateSystemSettingsForm) => void;
  saving: boolean;
}> = ({ settings, onUpdate, saving }) => {
  const [formData, setFormData] = useState({
    emailNotifications: settings.emailNotifications,
    smsNotifications: settings.smsNotifications,
    pushNotifications: settings.pushNotifications
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-medium text-white mb-4">Notification Settings</h3>
      
      {/* Email Notifications */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-white">Email Notifications</h4>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.emailNotifications.enabled}
              onChange={(e) => setFormData({
                ...formData,
                emailNotifications: {
                  ...formData.emailNotifications,
                  enabled: e.target.checked
                }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
            />
            <span className="ml-2 text-sm text-gray-300">Enabled</span>
          </label>
        </div>
        
        {formData.emailNotifications.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">SMTP Host</label>
              <input
                type="text"
                value={formData.emailNotifications.smtpHost}
                onChange={(e) => setFormData({
                  ...formData,
                  emailNotifications: {
                    ...formData.emailNotifications,
                    smtpHost: e.target.value
                  }
                })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">SMTP Port</label>
              <input
                type="number"
                value={formData.emailNotifications.smtpPort}
                onChange={(e) => setFormData({
                  ...formData,
                  emailNotifications: {
                    ...formData.emailNotifications,
                    smtpPort: parseInt(e.target.value)
                  }
                })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">SMTP User</label>
              <input
                type="text"
                value={formData.emailNotifications.smtpUser}
                onChange={(e) => setFormData({
                  ...formData,
                  emailNotifications: {
                    ...formData.emailNotifications,
                    smtpUser: e.target.value
                  }
                })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">From Email</label>
              <input
                type="email"
                value={formData.emailNotifications.fromEmail}
                onChange={(e) => setFormData({
                  ...formData,
                  emailNotifications: {
                    ...formData.emailNotifications,
                    fromEmail: e.target.value
                  }
                })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* SMS Notifications */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-white">SMS Notifications</h4>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.smsNotifications.enabled}
              onChange={(e) => setFormData({
                ...formData,
                smsNotifications: {
                  ...formData.smsNotifications,
                  enabled: e.target.checked
                }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
            />
            <span className="ml-2 text-sm text-gray-300">Enabled</span>
          </label>
        </div>
        
        {formData.smsNotifications.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Provider</label>
              <select
                value={formData.smsNotifications.provider}
                onChange={(e) => setFormData({
                  ...formData,
                  smsNotifications: {
                    ...formData.smsNotifications,
                    provider: e.target.value
                  }
                })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="twilio">Twilio</option>
                <option value="aws">AWS SNS</option>
                <option value="firebase">Firebase</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">High Value Threshold (USDC)</label>
              <input
                type="number"
                value={formData.smsNotifications.highValueThreshold}
                onChange={(e) => setFormData({
                  ...formData,
                  smsNotifications: {
                    ...formData.smsNotifications,
                    highValueThreshold: parseInt(e.target.value)
                  }
                })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

// Security Settings Component
const SecuritySettings: React.FC<{
  settings: SystemSettingsType;
  onUpdate: (data: UpdateSystemSettingsForm) => void;
  saving: boolean;
}> = ({ settings, onUpdate, saving }) => {
  const [formData, setFormData] = useState({
    twoFactorAuth: settings.twoFactorAuth,
    sessionSettings: settings.sessionSettings,
    ipWhitelist: settings.ipWhitelist,
    passwordPolicy: settings.passwordPolicy
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-medium text-white mb-4">Security Settings</h3>
      
      {/* Two-Factor Authentication */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-md font-medium text-white mb-4">Two-Factor Authentication</h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.twoFactorAuth.enabled}
              onChange={(e) => setFormData({
                ...formData,
                twoFactorAuth: {
                  ...formData.twoFactorAuth,
                  enabled: e.target.checked
                }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
            />
            <span className="ml-2 text-sm text-gray-300">Enable 2FA</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.twoFactorAuth.requiredForAdmins}
              onChange={(e) => setFormData({
                ...formData,
                twoFactorAuth: {
                  ...formData.twoFactorAuth,
                  requiredForAdmins: e.target.checked
                }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
            />
            <span className="ml-2 text-sm text-gray-300">Required for all admins</span>
          </label>
        </div>
      </div>
      
      {/* Session Settings */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-md font-medium text-white mb-4">Session Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Timeout Duration (minutes)</label>
            <input
              type="number"
              value={formData.sessionSettings.timeoutDuration}
              onChange={(e) => setFormData({
                ...formData,
                sessionSettings: {
                  ...formData.sessionSettings,
                  timeoutDuration: parseInt(e.target.value)
                }
              })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Max Concurrent Sessions</label>
            <input
              type="number"
              value={formData.sessionSettings.maxConcurrentSessions}
              onChange={(e) => setFormData({
                ...formData,
                sessionSettings: {
                  ...formData.sessionSettings,
                  maxConcurrentSessions: parseInt(e.target.value)
                }
              })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.sessionSettings.requireReauthForSensitive}
              onChange={(e) => setFormData({
                ...formData,
                sessionSettings: {
                  ...formData.sessionSettings,
                  requireReauthForSensitive: e.target.checked
                }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
            />
            <span className="ml-2 text-sm text-gray-300">Require re-authentication for sensitive operations</span>
          </label>
        </div>
      </div>
      
      {/* Password Policy */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-md font-medium text-white mb-4">Password Policy</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Minimum Length</label>
            <input
              type="number"
              value={formData.passwordPolicy.minLength}
              onChange={(e) => setFormData({
                ...formData,
                passwordPolicy: {
                  ...formData.passwordPolicy,
                  minLength: parseInt(e.target.value)
                }
              })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Max Age (days)</label>
            <input
              type="number"
              value={formData.passwordPolicy.maxAge}
              onChange={(e) => setFormData({
                ...formData,
                passwordPolicy: {
                  ...formData.passwordPolicy,
                  maxAge: parseInt(e.target.value)
                }
              })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.passwordPolicy.requireUppercase}
              onChange={(e) => setFormData({
                ...formData,
                passwordPolicy: {
                  ...formData.passwordPolicy,
                  requireUppercase: e.target.checked
                }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
            />
            <span className="ml-2 text-sm text-gray-300">Require uppercase letters</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.passwordPolicy.requireNumbers}
              onChange={(e) => setFormData({
                ...formData,
                passwordPolicy: {
                  ...formData.passwordPolicy,
                  requireNumbers: e.target.checked
                }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
            />
            <span className="ml-2 text-sm text-gray-300">Require numbers</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.passwordPolicy.requireSpecialChars}
              onChange={(e) => setFormData({
                ...formData,
                passwordPolicy: {
                  ...formData.passwordPolicy,
                  requireSpecialChars: e.target.checked
                }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
            />
            <span className="ml-2 text-sm text-gray-300">Require special characters</span>
          </label>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

// Backup Settings Component
const BackupSettings: React.FC<{
  settings: SystemSettingsType;
  onUpdate: (data: UpdateSystemSettingsForm) => void;
  onToggleMaintenance: (enabled: boolean) => void;
  saving: boolean;
}> = ({ settings, onUpdate, onToggleMaintenance, saving }) => {
  const [formData, setFormData] = useState({
    backupSettings: settings.backupSettings,
    maintenanceMode: settings.maintenanceMode,
    logRetention: settings.logRetention
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-white mb-4">Backup & Maintenance</h3>
      
      {/* Maintenance Mode */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-white">Maintenance Mode</h4>
          <button
            onClick={() => onToggleMaintenance(!settings.maintenanceMode.enabled)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              settings.maintenanceMode.enabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {settings.maintenanceMode.enabled ? 'Disable' : 'Enable'} Maintenance Mode
          </button>
        </div>
        {settings.maintenanceMode.enabled && (
          <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-3">
            <p className="text-yellow-200 text-sm">
              <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
              System is currently in maintenance mode. Users will see a maintenance message.
            </p>
          </div>
        )}
      </div>
      
      {/* Backup Settings */}
      <form onSubmit={handleSubmit} className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-md font-medium text-white mb-4">Backup Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Backup Frequency</label>
            <select
              value={formData.backupSettings.frequency}
              onChange={(e) => setFormData({
                ...formData,
                backupSettings: {
                  ...formData.backupSettings,
                  frequency: e.target.value as any
                }
              })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Retention Days</label>
            <input
              type="number"
              value={formData.backupSettings.retentionDays}
              onChange={(e) => setFormData({
                ...formData,
                backupSettings: {
                  ...formData.backupSettings,
                  retentionDays: parseInt(e.target.value)
                }
              })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.backupSettings.enabled}
              onChange={(e) => setFormData({
                ...formData,
                backupSettings: {
                  ...formData.backupSettings,
                  enabled: e.target.checked
                }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
            />
            <span className="ml-2 text-sm text-gray-300">Enable automatic backups</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.backupSettings.cloudStorage}
              onChange={(e) => setFormData({
                ...formData,
                backupSettings: {
                  ...formData.backupSettings,
                  cloudStorage: e.target.checked
                }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
            />
            <span className="ml-2 text-sm text-gray-300">Store backups in cloud</span>
          </label>
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
      
      {/* Log Retention */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-md font-medium text-white mb-4">Log Retention</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Audit Logs (days)</label>
            <input
              type="number"
              value={formData.logRetention.auditLogs}
              onChange={(e) => setFormData({
                ...formData,
                logRetention: {
                  ...formData.logRetention,
                  auditLogs: parseInt(e.target.value)
                }
              })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">System Logs (days)</label>
            <input
              type="number"
              value={formData.logRetention.systemLogs}
              onChange={(e) => setFormData({
                ...formData,
                logRetention: {
                  ...formData.logRetention,
                  systemLogs: parseInt(e.target.value)
                }
              })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Transaction Logs (days)</label>
            <input
              type="number"
              value={formData.logRetention.transactionLogs}
              onChange={(e) => setFormData({
                ...formData,
                logRetention: {
                  ...formData.logRetention,
                  transactionLogs: parseInt(e.target.value)
                }
              })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

