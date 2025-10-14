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

    // Check if user already has a wallet in mock mode
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_BLOCKCHAIN === 'true') {
      if (hasGlobalMockWallet(userAddress)) {
        return res.status(400).json({ error: 'User already has a top-up wallet' });
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

    res.json({
      success: true,
      walletAddress: result.walletAddress,
      privateKey: result.privateKey,
      publicKey: result.publicKey
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

    const walletInfo = await service.getTopUpWalletInfo(userAddress);
    
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

    // Use global mock wallet storage for mock mode
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_BLOCKCHAIN === 'true') {
      const exists = hasGlobalMockWallet(userAddress);
      console.log(`Checking wallet existence for ${userAddress}: ${exists}`);
      console.log('Global mock wallets:', Array.from(getGlobalMockWallets().entries()));
      res.json({ exists });
      return;
    }

    const exists = await service.hasTopUpWallet(userAddress);
    
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

export default router;
