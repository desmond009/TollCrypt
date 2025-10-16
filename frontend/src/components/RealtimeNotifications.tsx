import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRealtime } from '../hooks/useRealtime';

interface Notification {
  id: string;
  type: 'transaction' | 'vehicle' | 'system' | 'alert';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

interface RealtimeNotificationsProps {
  userId?: string;
  isAdmin?: boolean;
  adminId?: string;
  role?: string;
}

export const RealtimeNotifications: React.FC<RealtimeNotificationsProps> = ({
  userId,
  isAdmin = false,
  adminId,
  role
}) => {
  const { data: realtimeData, isConnected } = useRealtime(userId, isAdmin, adminId, role);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Update notifications when real-time data changes
    if (realtimeData.notifications.length > 0) {
      setNotifications(prev => {
        const newNotifications = realtimeData.notifications.filter(
          (notif: any) => !prev.some(p => p.id === notif._id)
        );
        return [...newNotifications, ...prev].slice(0, 10); // Keep last 10
      });
    }
  }, [realtimeData.notifications]);

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'critical') {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
    } else if (priority === 'high') {
      return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
    } else if (type === 'transaction') {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    } else {
      return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getNotificationBgColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <h3 className="text-sm font-medium text-gray-900">
              Real-time Updates
            </h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {notifications.length}
            </span>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Notifications List */}
        {isOpen && (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-gray-100 last:border-b-0 ${getNotificationBgColor(notification.priority)}`}
              >
                <div className="flex items-start space-x-3">
                  {getNotificationIcon(notification.type, notification.priority)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {notifications.length > 0 && (
              <div className="p-2 border-t border-gray-200">
                <button
                  onClick={clearAllNotifications}
                  className="w-full text-xs text-gray-500 hover:text-gray-700 text-center"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeNotifications;
