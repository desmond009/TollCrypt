import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface MetaMaskAccount {
  address: string;
  balance: string;
  chainId: number;
}

export const useMetaMask = () => {
  const [account, setAccount] = useState<MetaMaskAccount | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const address = accounts[0].address;
          
          // Validate address before using it
          if (ethers.isAddress(address)) {
            const balance = await provider.getBalance(address);
            const network = await provider.getNetwork();
            
            setAccount({
              address,
              balance: ethers.formatEther(balance),
              chainId: Number(network.chainId),
            });
            setIsConnected(true);
          } else {
            console.error('Invalid address from MetaMask:', address);
            setError('Invalid wallet address');
          }
        }
      } catch (err) {
        console.error('Error checking MetaMask connection:', err);
      }
    }
  }, []);

  useEffect(() => {
    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          setAccount(null);
          setIsConnected(false);
        } else {
          checkConnection();
        }
      });

      window.ethereum.on('chainChanged', () => {
        checkConnection();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [checkConnection]);

  const connect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask is not installed');
      return false;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        await checkConnection();
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || 'Failed to connect to MetaMask');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [checkConnection]);

  const signMessage = useCallback(async (message: string) => {
    if (!window.ethereum || !account) {
      throw new Error('MetaMask not connected');
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);
      return signature;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to sign message');
    }
  }, [account]);

  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Ethereum Sepolia testnet
      });
    } catch (err: any) {
      if (err.code === 4902) {
        // Chain not added, add it
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia',
            rpcUrls: ['https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18,
            },
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        });
      } else {
        throw err;
      }
    }
  }, []);

  return {
    account,
    isConnected,
    isConnecting,
    error,
    connect,
    signMessage,
    switchToSepolia,
  };
};
