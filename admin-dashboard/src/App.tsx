import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Dashboard } from './components/Dashboard';
import { VehicleManagement } from './components/VehicleManagement';
import { TransactionMonitoring } from './components/TransactionMonitoring';
import { Analytics } from './components/Analytics';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Check for existing authentication
    const token = localStorage.getItem('authToken');
    if (token) {
      // Verify token with backend
      fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setUser(data.data.user);
        } else {
          localStorage.removeItem('authToken');
        }
      })
      .catch(error => {
        console.error('Token verification failed:', error);
        localStorage.removeItem('authToken');
      });
    }

    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      forceNew: true
    });
    setSocket(newSocket);

    // Handle real-time updates
    newSocket.on('toll_payment_update', (data) => {
      setNotifications(prev => [...prev, {
        type: 'toll_payment',
        message: `New toll payment: ${data.amount} USDC`,
        timestamp: new Date()
      }]);
    });

    newSocket.on('vehicle_detected', (data) => {
      setNotifications(prev => [...prev, {
        type: 'vehicle_detected',
        message: `Vehicle detected: ${data.vehicleId}`,
        timestamp: new Date()
      }]);
    });

    newSocket.on('system_alert', (data) => {
      setNotifications(prev => [...prev, {
        type: 'alert',
        message: data.message,
        severity: data.severity,
        timestamp: new Date()
      }]);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    if (socket) {
      socket.emit('authenticate', {
        userId: userData.id,
        userRole: userData.role
      });
    }
  };

  const handleLogout = () => {
    // Call logout endpoint
    const token = localStorage.getItem('authToken');
    if (token) {
      fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).catch(error => console.error('Logout error:', error));
    }
    
    // Clear local state and token
    localStorage.removeItem('authToken');
    setUser(null);
    if (socket) {
      socket.emit('disconnect');
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard socket={socket} notifications={notifications} />;
      case 'vehicles':
        return <VehicleManagement socket={socket} />;
      case 'transactions':
        return <TransactionMonitoring socket={socket} />;
      case 'analytics':
        return <Analytics socket={socket} />;
      default:
        return <Dashboard socket={socket} notifications={notifications} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={user} onLogout={handleLogout} notifications={notifications} />
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;