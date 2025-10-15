import React from 'react';
import {
  HomeIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CogIcon,
  QrCodeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigation = [
  { name: 'Dashboard', tab: 'dashboard', icon: HomeIcon },
  { name: 'QR Scanner', tab: 'scanner', icon: QrCodeIcon },
  { name: 'Vehicles', tab: 'vehicles', icon: TruckIcon },
  { name: 'Transactions', tab: 'transactions', icon: CurrencyDollarIcon },
  { name: 'Plazas', tab: 'plazas', icon: MapPinIcon },
  { name: 'Analytics', tab: 'analytics', icon: ChartBarIcon },
  { name: 'Settings', tab: 'settings', icon: CogIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="w-64 bg-white shadow-lg">
      <nav className="mt-5 px-2">
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => onTabChange(item.tab)}
                className={`${
                  activeTab === item.tab
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left`}
              >
                <Icon
                  className={`${
                    activeTab === item.tab ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                  } mr-3 h-6 w-6`}
                />
                {item.name}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
