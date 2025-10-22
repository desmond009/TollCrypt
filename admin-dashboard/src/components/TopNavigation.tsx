import React from 'react';
import {
  HomeIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CogIcon,
  QrCodeIcon,
  MapPinIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

interface TopNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigation = [
  { name: 'Dashboard', tab: 'dashboard', icon: HomeIcon },
  { name: 'QR Scanner', tab: 'scanner', icon: QrCodeIcon },
  { name: 'Vehicles', tab: 'vehicles', icon: TruckIcon },
  { name: 'Transactions', tab: 'transactions', icon: CurrencyDollarIcon },
  { name: 'Revenue', tab: 'revenue', icon: BanknotesIcon },
  { name: 'Plazas', tab: 'plazas', icon: MapPinIcon },
  { name: 'Analytics', tab: 'analytics', icon: ChartBarIcon },
  { name: 'Settings', tab: 'settings', icon: CogIcon },
];

export const TopNavigation: React.FC<TopNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="bg-black border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex space-x-1 py-2 overflow-x-auto nav-scroll">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.name}
                onClick={() => onTabChange(item.tab)}
                className={`${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-500 ring-opacity-50'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                } group flex items-center px-2 sm:px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0`}
              >
                <Icon
                  className={`${
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                  } mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0`}
                />
                <span className="text-xs sm:text-sm font-medium">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
