import React from 'react';
import { Socket } from 'socket.io-client';
import { LiveDashboard } from './LiveDashboard';

interface DashboardProps {
  socket: Socket | null;
  notifications: any[];
}

export const Dashboard: React.FC<DashboardProps> = ({ socket, notifications }) => {
  return <LiveDashboard socket={socket} notifications={notifications} />;
};