import React, { useState } from 'react';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { WalletConnector } from './WalletConnector';

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
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, notifications }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => 
    new Date().getTime() - n.timestamp.getTime() < 300000 // Last 5 minutes
  ).length;

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              TollChain Admin
            </h1>
            <span className="ml-2 text-sm text-gray-500">
              {user.role.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Wallet Connector */}
            <WalletConnector />

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-400 hover:text-gray-500 relative"
              >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50">
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-gray-500 text-center">
                        No notifications
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((notification, index) => (
                        <div
                          key={index}
                          className={`p-4 border-b last:border-b-0 ${
                            notification.severity === 'error' ? 'bg-red-50' :
                            notification.severity === 'warning' ? 'bg-yellow-50' :
                            'bg-white'
                          }`}
                        >
                          <p className="text-sm text-gray-900">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
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
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-gray-500">{user.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="ml-4 text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
