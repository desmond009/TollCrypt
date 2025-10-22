import React from 'react';
import {
  HomeIcon,
  TruckIcon,
  CurrencyDollarIcon,
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
  { name: 'Settings', tab: 'settings', icon: CogIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="w-full lg:w-64 admin-sidebar shadow-lg">
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
                    ? 'bg-yellow-400 text-black'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left transition-colors`}
              >
                <Icon
                  className={`${
                    activeTab === item.tab ? 'text-black' : 'text-gray-400 group-hover:text-white'
                  } mr-3 h-6 w-6 flex-shrink-0`}
                />
                <span className="truncate">{item.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
