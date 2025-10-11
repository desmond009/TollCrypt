import React from 'react';
import { useConnect } from 'wagmi';

export const WalletConnect: React.FC = () => {
  const { connect, connectors, isPending } = useConnect();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Connect Your Wallet
      </h3>
      <div className="space-y-2">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Connecting...' : `Connect ${connector.name}`}
          </button>
        ))}
      </div>
    </div>
  );
};
