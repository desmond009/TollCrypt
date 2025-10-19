import { Router, Request, Response } from 'express';
import { TopUpWalletService, getGlobalMockWallets, setGlobalMockWallet, hasGlobalMockWallet } from '../services/topUpWalletService';
import { authenticateToken, authenticateSession } from '../middleware/auth';

const router = Router();

// Function to get the service instance
function getService(): TopUpWalletService | null {
  try {
    console.log('Getting service instance...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('MOCK_BLOCKCHAIN:', process.env.MOCK_BLOCKCHAIN);
    
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
    const factoryAddress = process.env.TOPUP_WALLET_FACTORY_ADDRESS;
    const tollCollectionAddress = process.env.TOPUP_TOLL_COLLECTION_CONTRACT_ADDRESS;
    const factoryPrivateKey = process.env.FACTORY_PRIVATE_KEY;
    const tollCollectionPrivateKey = process.env.TOLL_COLLECTION_PRIVATE_KEY;

    // Check if running in mock mode
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_BLOCKCHAIN === 'true') {
      console.log('⚠️  TopUp Wallet Service running in mock mode');
      return TopUpWalletService.getInstance(
        rpcUrl,
        '0x0000000000000000000000000000000000000000', // Mock factory address
        '0x0000000000000000000000000000000000000000', // Mock toll collection address
        '0x0000000000000000000000000000000000000000000000000000000000000000', // Mock private key
        '0x0000000000000000000000000000000000000000000000000000000000000000'  // Mock private key
      );
    } else {
      // Validate required environment variables for production
      if (!factoryAddress || !tollCollectionAddress || !factoryPrivateKey || !tollCollectionPrivateKey) {
        console.warn('⚠️  TopUp Wallet Service not initialized - missing required environment variables');
        return null;
      }
      return TopUpWalletService.getInstance(
        rpcUrl,
        factoryAddress,
        tollCollectionAddress,
        factoryPrivateKey,
        tollCollectionPrivateKey
      );
    }
  } catch (error) {
    console.error('❌ Failed to initialize TopUp Wallet Service:', error);
    return null;
  }
}

// Helper function to check if service is available
const checkServiceAvailable = (res: Response): TopUpWalletService | null => {
  const service = getService();
  
  if (!service) {
    res.status(503).json({ 
      error: 'TopUp Wallet Service is not available. Please check configuration.' 
    });
    return null;
  }
  return service;
};

/**
 * @route POST /api/topup-wallet/create
 * @desc Create a new top-up wallet for the authenticated user
 * @access Private
 */
router.post('/create', authenticateSession, async (req: Request, res: Response) => {
  try {
    const service = checkServiceAvailable(res);
    if (!service) return;
    
    const userAddress = req.user?.address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    // First check if user already has a wallet in the database
    const existingWallet = await service.getExistingTopUpWallet(userAddress);
    if (existingWallet) {
      console.log(`User ${userAddress} already has a top-up wallet: ${existingWallet.walletAddress}`);
      return res.json({
        success: true,
        walletAddress: existingWallet.walletAddress,
        privateKey: existingWallet.privateKey,
        publicKey: existingWallet.publicKey,
        message: 'Existing wallet retrieved'
      });
    }

    // Check if user already has a wallet in mock mode
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_BLOCKCHAIN === 'true') {
      if (hasGlobalMockWallet(userAddress)) {
        const mockWalletAddress = getGlobalMockWallets().get(userAddress);
        return res.json({
          success: true,
          walletAddress: mockWalletAddress,
          privateKey: '0x' + 'mock_private_key_' + userAddress.slice(2, 10),
          publicKey: '0x' + 'mock_public_key_' + userAddress.slice(2, 10),
          message: 'Existing mock wallet retrieved'
        });
      }
    }

    const result = await service.createTopUpWallet(userAddress);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Store the wallet in global storage for mock mode
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_BLOCKCHAIN === 'true' && result.walletAddress) {
      setGlobalMockWallet(userAddress, result.walletAddress);
    }

    // Update the user record in database with the new wallet address
    try {
      const { User } = await import('../models/User');
      await User.findOneAndUpdate(
        { walletAddress: userAddress.toLowerCase() },
        { topUpWalletAddress: result.walletAddress?.toLowerCase() },
        { new: true }
      );
      console.log(`Updated user ${userAddress} with top-up wallet address: ${result.walletAddress}`);
    } catch (dbError) {
      console.error('Error updating user with top-up wallet address:', dbError);
      // Don't fail the request, just log the error
    }

    res.json({
      success: true,
      walletAddress: result.walletAddress,
      privateKey: result.privateKey,
      publicKey: result.publicKey,
      message: 'New wallet created'
    });

  } catch (error) {
    console.error('Error creating top-up wallet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/topup-wallet/info
 * @desc Get top-up wallet information for the authenticated user
 * @access Private
 */
router.get('/info', authenticateSession, async (req: Request, res: Response) => {
  try {
    const service = checkServiceAvailable(res);
    if (!service) return;
    
    const userAddress = req.user?.address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    // First try to get existing wallet from database
    let walletInfo = await service.getExistingTopUpWallet(userAddress);
    
    // If not found in database, try blockchain
    if (!walletInfo) {
      walletInfo = await service.getTopUpWalletInfo(userAddress);
    }
    
    if (!walletInfo) {
      return res.status(404).json({ error: 'Top-up wallet not found' });
    }

    res.json(walletInfo);

  } catch (error) {
    console.error('Error getting top-up wallet info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/topup-wallet/balance
 * @desc Get top-up wallet balance for the authenticated user
 * @access Private
 */
router.get('/balance', authenticateSession, async (req: Request, res: Response) => {
  try {
    const service = checkServiceAvailable(res);
    if (!service) return;
    
    const userAddress = req.user?.address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    const balance = await service.getTopUpWalletBalance(userAddress);
    
    res.json({ balance });

  } catch (error) {
    console.error('Error getting top-up wallet balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/topup-wallet/topup
 * @desc Process top-up transaction
 * @access Private
 */
router.post('/topup', authenticateSession, async (req: Request, res: Response) => {
  try {
    const service = checkServiceAvailable(res);
    if (!service) return;
    
    const userAddress = req.user?.address;
    const { amount, signature } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    if (!amount || !signature) {
      return res.status(400).json({ error: 'Amount and signature are required' });
    }

    const txHash = await service.processTopUp(userAddress, amount, signature);
    
    res.json({ success: true, transactionHash: txHash });

  } catch (error) {
    console.error('Error processing top-up:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

/**
 * @route POST /api/topup-wallet/payment
 * @desc Process toll payment from top-up wallet
 * @access Private
 */
router.post('/payment', authenticateSession, async (req: Request, res: Response) => {
  try {
    const service = checkServiceAvailable(res);
    if (!service) return;
    
    const userAddress = req.user?.address;
    const { vehicleId, amount, zkProofHash } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    if (!vehicleId || !amount || !zkProofHash) {
      return res.status(400).json({ error: 'Vehicle ID, amount, and ZK proof hash are required' });
    }

    const txHash = await service.processTollPayment(
      userAddress,
      vehicleId,
      amount,
      zkProofHash
    );
    
    res.json({ success: true, transactionHash: txHash });

  } catch (error) {
    console.error('Error processing toll payment:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

/**
 * @route POST /api/topup-wallet/withdraw
 * @desc Withdraw funds from top-up wallet
 * @access Private
 */
router.post('/withdraw', authenticateSession, async (req: Request, res: Response) => {
  try {
    const service = checkServiceAvailable(res);
    if (!service) return;
    
    const userAddress = req.user?.address;
    const { amount, signature } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    if (!amount || !signature) {
      return res.status(400).json({ error: 'Amount and signature are required' });
    }

    const txHash = await service.withdrawFromTopUpWallet(userAddress, amount, signature);
    
    res.json({ success: true, transactionHash: txHash });

  } catch (error) {
    console.error('Error withdrawing from top-up wallet:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

/**
 * @route GET /api/topup-wallet/stats
 * @desc Get wallet statistics for the authenticated user
 * @access Private
 */
router.get('/stats', authenticateSession, async (req: Request, res: Response) => {
  try {
    const service = checkServiceAvailable(res);
    if (!service) return;
    
    const userAddress = req.user?.address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    const stats = await service.getWalletStats(userAddress);
    
    if (!stats) {
      return res.status(404).json({ error: 'Top-up wallet not found' });
    }

    res.json(stats);

  } catch (error) {
    console.error('Error getting wallet stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/topup-wallet/exists
 * @desc Check if user has a top-up wallet
 * @access Private
 */
router.get('/exists', authenticateSession, async (req: Request, res: Response) => {
  try {
    const service = checkServiceAvailable(res);
    if (!service) return;
    
    const userAddress = req.user?.address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    console.log(`Checking wallet existence for user: ${userAddress}`);

    // First check if user has a wallet in the database
    const hasExistingWallet = await service.hasExistingTopUpWallet(userAddress);
    console.log(`Database check result: ${hasExistingWallet}`);
    
    if (hasExistingWallet) {
      console.log(`User ${userAddress} has existing wallet in database`);
      res.json({ exists: true });
      return;
    }

    // Use global mock wallet storage for mock mode
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_BLOCKCHAIN === 'true') {
      const exists = hasGlobalMockWallet(userAddress);
      console.log(`Mock mode check result: ${exists}`);
      console.log('Global mock wallets:', Array.from(getGlobalMockWallets().entries()));
      res.json({ exists });
      return;
    }

    // Check blockchain as fallback
    console.log('Checking blockchain for wallet existence...');
    const exists = await service.hasTopUpWallet(userAddress);
    console.log(`Blockchain check result: ${exists}`);
    
    // If wallet exists on blockchain but not in database, update database
    if (exists) {
      console.log('Wallet exists on blockchain but not in database. Updating database...');
      try {
        const walletInfo = await service.getTopUpWalletInfo(userAddress);
        if (walletInfo && walletInfo.walletAddress) {
          const { User } = await import('../models/User');
          await User.findOneAndUpdate(
            { walletAddress: userAddress.toLowerCase() },
            { topUpWalletAddress: walletInfo.walletAddress.toLowerCase() },
            { new: true, upsert: false }
          );
          console.log(`Updated database with wallet address: ${walletInfo.walletAddress}`);
        }
      } catch (dbError) {
        console.error('Error updating database with wallet address:', dbError);
        // Don't fail the request, just log the error
      }
    }
    
    res.json({ exists });

  } catch (error) {
    console.error('Error checking top-up wallet existence:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/topup-wallet/signature/topup
 * @desc Create signature for top-up authorization
 * @access Private
 */
router.post('/signature/topup', authenticateSession, async (req: Request, res: Response) => {
  try {
    const service = checkServiceAvailable(res);
    if (!service) return;
    
    const userAddress = req.user?.address;
    const { amount, nonce, privateKey } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    if (!amount || !nonce || !privateKey) {
      return res.status(400).json({ error: 'Amount, nonce, and private key are required' });
    }

    const signature = service.createTopUpSignature(userAddress, amount, nonce, privateKey);
    
    res.json({ signature });

  } catch (error) {
    console.error('Error creating top-up signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/topup-wallet/signature/withdraw
 * @desc Create signature for withdrawal authorization
 * @access Private
 */
router.post('/signature/withdraw', authenticateSession, async (req: Request, res: Response) => {
  try {
    const service = checkServiceAvailable(res);
    if (!service) return;
    
    const userAddress = req.user?.address;
    const { amount, nonce, privateKey } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    if (!amount || !nonce || !privateKey) {
      return res.status(400).json({ error: 'Amount, nonce, and private key are required' });
    }

    const signature = service.createWithdrawalSignature(userAddress, amount, nonce, privateKey);
    
    res.json({ signature });

  } catch (error) {
    console.error('Error creating withdrawal signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/topup-wallet/debug
 * @desc Debug endpoint to check user and wallet status
 * @access Private
 */
router.get('/debug', authenticateSession, async (req: Request, res: Response) => {
  try {
    const service = checkServiceAvailable(res);
    if (!service) return;
    
    const userAddress = req.user?.address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    console.log(`Debug request for user: ${userAddress}`);

    // Check database
    const { User } = await import('../models/User');
    const user = await User.findOne({ walletAddress: userAddress.toLowerCase() });
    
    // Check blockchain
    let blockchainWallet = null;
    let blockchainExists = false;
    try {
      blockchainExists = await service.hasTopUpWallet(userAddress);
      if (blockchainExists) {
        blockchainWallet = await service.getTopUpWalletInfo(userAddress);
      }
    } catch (error) {
      console.error('Error checking blockchain:', error);
    }

    // Check mock wallets
    const mockExists = hasGlobalMockWallet(userAddress);
    const mockWalletAddress = getGlobalMockWallets().get(userAddress);

    res.json({
      userAddress,
      database: {
        userFound: !!user,
        topUpWalletAddress: user?.topUpWalletAddress || null,
        userData: user ? {
          walletAddress: user.walletAddress,
          topUpWalletAddress: user.topUpWalletAddress,
          isVerified: user.isVerified,
          createdAt: user.createdAt
        } : null
      },
      blockchain: {
        exists: blockchainExists,
        walletInfo: blockchainWallet
      },
      mock: {
        exists: mockExists,
        walletAddress: mockWalletAddress
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        mockBlockchain: process.env.MOCK_BLOCKCHAIN
      }
    });

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
