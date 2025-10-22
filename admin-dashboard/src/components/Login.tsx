import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { useAccount } from 'wagmi';
import { LoginCredentials } from '../types/auth';
import { EyeIcon, EyeSlashIcon, WalletIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { WalletConnector } from './WalletConnector';

interface LoginProps {
  onLogin: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { login } = useAuth();
  const { isConnected, address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>();

  const handleLogin = async (data: LoginCredentials) => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting login with:', { email: data.email, walletAddress: address });
      const response = await login({
        ...data,
        walletAddress: address,
      });
      console.log('Login response:', response);
      
      // Call the onLogin callback to notify parent component
      onLogin(response.user);
      
      console.log('Login completed, should redirect to dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header with Wallet Connector */}
      <div className="flex justify-between items-center p-4 lg:p-6">
        <div className="flex items-center">
          <div className="w-6 h-6 lg:w-8 lg:h-8 bg-yellow-400 rounded-lg mr-2 lg:mr-3 flex items-center justify-center">
            <WalletIcon className="h-4 w-4 lg:h-5 lg:w-5 text-black" />
          </div>
          <h1 className="text-lg lg:text-xl font-bold text-white">TollCrypt Admin</h1>
        </div>
        <WalletConnector />
      </div>

      {/* Login Form */}
      <div className="flex items-center justify-center py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 lg:space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-yellow-400 rounded-lg flex items-center justify-center">
              <WalletIcon className="h-8 w-8 text-black" />
            </div>
            <h2 className="mt-4 lg:mt-6 text-2xl lg:text-3xl font-extrabold text-white">
              Admin Portal
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Toll Collection System Management
            </p>
          </div>

          {/* Wallet Connection Status */}
          <div className="card">
            <div className="flex items-center">
              {isConnected ? (
                <>
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Wallet Connected</p>
                    <p className="text-xs text-green-600">{address}</p>
                  </div>
                </>
              ) : (
                <>
                  <WalletIcon className="h-5 w-5 text-yellow-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Wallet Not Connected</p>
                    <p className="text-xs text-yellow-600">Please connect your wallet to continue</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Login Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(handleLogin)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
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
                  className="input-field mt-1"
                  placeholder="admin@tollchain.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
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
                    className="input-field"
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
                  <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-900/20 border border-red-800 p-4">
                <div className="text-sm text-red-400">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading || !isConnected}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => {
                  console.log('Login button clicked');
                  console.log('Wallet connected:', isConnected);
                  console.log('Wallet address:', address);
                }}
              >
                {isLoading ? 'Signing in...' : 'Sign in with Email & Wallet'}
              </button>
            </div>
          </form>

          <div className="text-center">
            <p className="text-xs text-gray-400">
              Secure access to the blockchain-based toll collection system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};