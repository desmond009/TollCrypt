import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { useMetaMask } from '../hooks/useMetaMask';
import { LoginCredentials } from '../types/auth';
import { EyeIcon, EyeSlashIcon, WalletIcon } from '@heroicons/react/24/outline';

interface LoginProps {
  onLogin: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { login } = useAuth();
  const { connect, signMessage, isConnected, account, switchToSepolia } = useMetaMask();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'metamask'>('password');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>();

  const handlePasswordLogin = async (data: LoginCredentials) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await login(data);
      onLogin(response.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMetaMaskLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (!isConnected) {
        await connect();
        return;
      }

      // Switch to Sepolia if needed
      await switchToSepolia();

      // Sign a message for authentication
      const message = `TollChain Admin Login\nTimestamp: ${Date.now()}`;
      const signature = await signMessage(message);

      const response = await login({
        email: account?.address || '',
        password: '',
        walletAddress: account?.address,
        signature,
      });

      onLogin(response.user);
    } catch (err: any) {
      setError(err.message || 'MetaMask login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-lg flex items-center justify-center">
            <WalletIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Admin Portal
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Toll Collection System Management
          </p>
        </div>

        {/* Login Method Toggle */}
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setLoginMethod('password')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              loginMethod === 'password'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Email & Password
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod('metamask')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              loginMethod === 'metamask'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            MetaMask
          </button>
        </div>

        {loginMethod === 'password' ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(handlePasswordLogin)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  type="email"
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="admin@tollchain.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters',
                      },
                    })}
                    type={showPassword ? 'text' : 'password'}
                    className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign in with Email'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-8 space-y-6">
            {isConnected && account ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <WalletIcon className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      MetaMask Connected
                    </h3>
                    <div className="mt-1 text-sm text-green-700">
                      <p>Address: {account.address}</p>
                      <p>Balance: {parseFloat(account.balance).toFixed(4)} ETH</p>
                      <p>Network: Sepolia</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <WalletIcon className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      MetaMask Not Connected
                    </h3>
                    <div className="mt-1 text-sm text-yellow-700">
                      <p>Click the button below to connect your MetaMask wallet</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <button
              onClick={handleMetaMaskLogin}
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connecting...' : isConnected ? 'Sign in with MetaMask' : 'Connect MetaMask'}
            </button>
          </div>
        )}

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Secure access to the blockchain-based toll collection system
          </p>
        </div>
      </div>
    </div>
  );
};