import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XMarkIcon,
  BellIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useRealtime } from '../hooks/useRealtime';

interface Notification {
  _id: string;
  type: 'transaction' | 'vehicle' | 'system' | 'alert' | 'dispute';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  createdAt: string;
}

interface RealtimeNotificationsProps {
  adminId?: string;
  role?: string;
}

export const RealtimeNotifications: React.FC<RealtimeNotificationsProps> = ({
  adminId,
  role
}) => {
  const { data: realtimeData, isConnected } = useRealtime(adminId, role);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Update notifications when real-time data changes
    if (realtimeData.notifications.length > 0) {
      setNotifications(prev => {
        const newNotifications = realtimeData.notifications.filter(
          (notif: any) => !prev.some(p => p._id === notif._id)
        );
        return [...newNotifications, ...prev].slice(0, 20); // Keep last 20
      });
    }
  }, [realtimeData.notifications]);

  useEffect(() => {
    // Update unread count
    const unread = notifications.filter(n => !n.isRead).length;
    setUnreadCount(unread);
  }, [notifications]);

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'critical') {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
    } else if (priority === 'high') {
      return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
    } else if (type === 'transaction') {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    } else if (type === 'vehicle') {
      return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    } else {
      return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationBgColor = (priority: string, isRead: boolean) => {
    if (isRead) {
      return 'bg-gray-50 border-gray-200';
    }
    
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

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif._id === notificationId ? { ...notif, isRead: true } : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
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
            <BellIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">
              Admin Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
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
                key={notification._id}
                className={`p-4 border-b border-gray-100 last:border-b-0 ${getNotificationBgColor(notification.priority, notification.isRead)}`}
              >
                <div className="flex items-start space-x-3">
                  {getNotificationIcon(notification.type, notification.priority)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${notification.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification._id)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Mark as read"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${notification.isRead ? 'text-gray-500' : 'text-gray-600'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeNotification(notification._id)}
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
