import React, { useState } from 'react';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { WalletConnector } from './WalletConnector';
import { TopNavigation } from './TopNavigation';

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface Notification {
  type: string;
  message: string;
  timestamp: Date;
  severity?: string;
}

interface HeaderProps {
  user: User;
  onLogout: () => void;
  notifications: Notification[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, notifications, activeTab, onTabChange }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => 
    new Date().getTime() - n.timestamp.getTime() < 300000 // Last 5 minutes
  ).length;

  return (
    <div className="sticky top-0 z-50">
      <header className="admin-header shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            {/* Left side - Brand */}
            <div className="flex items-center space-x-3">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                TollChain Admin
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-medium text-gray-300 bg-gray-800 rounded-full">
                {user.role.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            
            {/* Right side - Actions */}
            <div className="flex items-center space-x-1 sm:space-x-3">
              {/* Wallet Connector */}
              <div className="hidden sm:block">
                <WalletConnector />
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-400 hover:text-white relative transition-colors rounded-lg hover:bg-gray-800"
                >
                  <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-gray-900 rounded-lg shadow-xl z-50 border border-gray-700">
                    <div className="p-4 border-b border-gray-700">
                      <h3 className="text-lg font-medium text-white">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-gray-400 text-center">
                          No notifications
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notification, index) => (
                          <div
                            key={index}
                            className={`p-4 border-b border-gray-700 last:border-b-0 ${
                              notification.severity === 'error' ? 'bg-red-900/20' :
                              notification.severity === 'warning' ? 'bg-yellow-900/20' :
                              'bg-gray-800/20'
                            }`}
                          >
                            <p className="text-sm text-white">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {notification.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="flex items-center space-x-2">
                <UserCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                <div className="hidden sm:block text-sm">
                  <p className="font-medium text-white">{user.name}</p>
                  <p className="text-gray-400 text-xs">{user.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="text-sm text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-800"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Top Navigation Bar */}
      <TopNavigation activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
};
