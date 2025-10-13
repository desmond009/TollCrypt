import { Router, Request, Response } from 'express';
import { TopUpWalletService } from '../services/topUpWalletService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Initialize the service (you'll need to configure these values)
const topUpWalletService = new TopUpWalletService(
  process.env.RPC_URL || 'http://localhost:8545',
  process.env.TOPUP_WALLET_FACTORY_ADDRESS || '',
  process.env.TOPUP_TOLL_COLLECTION_CONTRACT_ADDRESS || '',
  process.env.FACTORY_PRIVATE_KEY || '',
  process.env.TOLL_COLLECTION_PRIVATE_KEY || ''
);

/**
 * @route POST /api/topup-wallet/create
 * @desc Create a new top-up wallet for the authenticated user
 * @access Private
 */
router.post('/create', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userAddress = req.user?.address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    const result = await topUpWalletService.createTopUpWallet(userAddress);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
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
router.get('/info', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userAddress = req.user?.address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    const walletInfo = await topUpWalletService.getTopUpWalletInfo(userAddress);
    
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
router.get('/balance', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userAddress = req.user?.address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    const balance = await topUpWalletService.getTopUpWalletBalance(userAddress);
    
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
router.post('/topup', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userAddress = req.user?.address;
    const { amount, signature } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    if (!amount || !signature) {
      return res.status(400).json({ error: 'Amount and signature are required' });
    }

    const txHash = await topUpWalletService.processTopUp(userAddress, amount, signature);
    
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
router.post('/payment', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userAddress = req.user?.address;
    const { vehicleId, amount, zkProofHash } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    if (!vehicleId || !amount || !zkProofHash) {
      return res.status(400).json({ error: 'Vehicle ID, amount, and ZK proof hash are required' });
    }

    const txHash = await topUpWalletService.processTollPayment(
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
router.post('/withdraw', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userAddress = req.user?.address;
    const { amount, signature } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    if (!amount || !signature) {
      return res.status(400).json({ error: 'Amount and signature are required' });
    }

    const txHash = await topUpWalletService.withdrawFromTopUpWallet(userAddress, amount, signature);
    
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
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userAddress = req.user?.address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    const stats = await topUpWalletService.getWalletStats(userAddress);
    
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
router.get('/exists', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userAddress = req.user?.address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    const exists = await topUpWalletService.hasTopUpWallet(userAddress);
    
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
router.post('/signature/topup', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userAddress = req.user?.address;
    const { amount, nonce, privateKey } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    if (!amount || !nonce || !privateKey) {
      return res.status(400).json({ error: 'Amount, nonce, and private key are required' });
    }

    const signature = topUpWalletService.createTopUpSignature(userAddress, amount, nonce, privateKey);
    
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
router.post('/signature/withdraw', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userAddress = req.user?.address;
    const { amount, nonce, privateKey } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address not found' });
    }

    if (!amount || !nonce || !privateKey) {
      return res.status(400).json({ error: 'Amount, nonce, and private key are required' });
    }

    const signature = topUpWalletService.createWithdrawalSignature(userAddress, amount, nonce, privateKey);
    
    res.json({ signature });

  } catch (error) {
    console.error('Error creating withdrawal signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
