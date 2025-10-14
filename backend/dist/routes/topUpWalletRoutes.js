"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const topUpWalletService_1 = require("../services/topUpWalletService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Initialize the service with proper validation
let topUpWalletService = null;
try {
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
    const factoryAddress = process.env.TOPUP_WALLET_FACTORY_ADDRESS;
    const tollCollectionAddress = process.env.TOPUP_TOLL_COLLECTION_CONTRACT_ADDRESS;
    const factoryPrivateKey = process.env.FACTORY_PRIVATE_KEY;
    const tollCollectionPrivateKey = process.env.TOLL_COLLECTION_PRIVATE_KEY;
    console.log('🔧 Environment variables:');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  MOCK_BLOCKCHAIN:', process.env.MOCK_BLOCKCHAIN);
    console.log('  RPC_URL:', rpcUrl);
    console.log('  FACTORY_ADDRESS:', factoryAddress);
    console.log('  TOLL_COLLECTION_ADDRESS:', tollCollectionAddress);
    // Check if running in mock mode
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_BLOCKCHAIN === 'true') {
        console.log('⚠️  TopUp Wallet Service running in mock mode');
        // Create a mock service that doesn't require blockchain contracts
        topUpWalletService = new topUpWalletService_1.TopUpWalletService(rpcUrl, '0x0000000000000000000000000000000000000000', // Mock factory address
        '0x0000000000000000000000000000000000000000', // Mock toll collection address
        '0x0000000000000000000000000000000000000000000000000000000000000000', // Mock private key
        '0x0000000000000000000000000000000000000000000000000000000000000000' // Mock private key
        );
        console.log('✅ TopUp Wallet Service initialized in mock mode');
    }
    else {
        console.log('🔧 Running in production mode');
        // Validate required environment variables for production
        if (!factoryAddress || !tollCollectionAddress || !factoryPrivateKey || !tollCollectionPrivateKey) {
            console.warn('⚠️  TopUp Wallet Service not initialized - missing required environment variables:');
            if (!factoryAddress)
                console.warn('  - TOPUP_WALLET_FACTORY_ADDRESS');
            if (!tollCollectionAddress)
                console.warn('  - TOPUP_TOLL_COLLECTION_CONTRACT_ADDRESS');
            if (!factoryPrivateKey)
                console.warn('  - FACTORY_PRIVATE_KEY');
            if (!tollCollectionPrivateKey)
                console.warn('  - TOLL_COLLECTION_PRIVATE_KEY');
            console.warn('  TopUp Wallet routes will be disabled.');
        }
        else {
            console.log('🔧 Creating production service...');
            topUpWalletService = new topUpWalletService_1.TopUpWalletService(rpcUrl, factoryAddress, tollCollectionAddress, factoryPrivateKey, tollCollectionPrivateKey);
            console.log('✅ TopUp Wallet Service initialized successfully');
        }
    }
}
catch (error) {
    console.error('❌ Failed to initialize TopUp Wallet Service:', error);
    console.error('❌ Error details:', error);
    console.warn('  TopUp Wallet routes will be disabled.');
}
// Helper function to check if service is available
const checkServiceAvailable = (res) => {
    if (!topUpWalletService) {
        res.status(503).json({
            error: 'TopUp Wallet Service is not available. Please check configuration.'
        });
        return false;
    }
    return true;
};
/**
 * @route POST /api/topup-wallet/create
 * @desc Create a new top-up wallet for the authenticated user
 * @access Private
 */
router.post('/create', auth_1.authenticateSession, async (req, res) => {
    try {
        if (!checkServiceAvailable(res))
            return;
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
    }
    catch (error) {
        console.error('Error creating top-up wallet:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @route GET /api/topup-wallet/info
 * @desc Get top-up wallet information for the authenticated user
 * @access Private
 */
router.get('/info', auth_1.authenticateSession, async (req, res) => {
    try {
        if (!checkServiceAvailable(res))
            return;
        const userAddress = req.user?.address;
        if (!userAddress) {
            return res.status(400).json({ error: 'User address not found' });
        }
        const walletInfo = await topUpWalletService.getTopUpWalletInfo(userAddress);
        if (!walletInfo) {
            return res.status(404).json({ error: 'Top-up wallet not found' });
        }
        res.json(walletInfo);
    }
    catch (error) {
        console.error('Error getting top-up wallet info:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @route GET /api/topup-wallet/balance
 * @desc Get top-up wallet balance for the authenticated user
 * @access Private
 */
router.get('/balance', auth_1.authenticateSession, async (req, res) => {
    try {
        if (!checkServiceAvailable(res))
            return;
        const userAddress = req.user?.address;
        if (!userAddress) {
            return res.status(400).json({ error: 'User address not found' });
        }
        const balance = await topUpWalletService.getTopUpWalletBalance(userAddress);
        res.json({ balance });
    }
    catch (error) {
        console.error('Error getting top-up wallet balance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @route POST /api/topup-wallet/topup
 * @desc Process top-up transaction
 * @access Private
 */
router.post('/topup', auth_1.authenticateSession, async (req, res) => {
    try {
        if (!checkServiceAvailable(res))
            return;
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
    }
    catch (error) {
        console.error('Error processing top-up:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
});
/**
 * @route POST /api/topup-wallet/payment
 * @desc Process toll payment from top-up wallet
 * @access Private
 */
router.post('/payment', auth_1.authenticateSession, async (req, res) => {
    try {
        if (!checkServiceAvailable(res))
            return;
        const userAddress = req.user?.address;
        const { vehicleId, amount, zkProofHash } = req.body;
        if (!userAddress) {
            return res.status(400).json({ error: 'User address not found' });
        }
        if (!vehicleId || !amount || !zkProofHash) {
            return res.status(400).json({ error: 'Vehicle ID, amount, and ZK proof hash are required' });
        }
        const txHash = await topUpWalletService.processTollPayment(userAddress, vehicleId, amount, zkProofHash);
        res.json({ success: true, transactionHash: txHash });
    }
    catch (error) {
        console.error('Error processing toll payment:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
});
/**
 * @route POST /api/topup-wallet/withdraw
 * @desc Withdraw funds from top-up wallet
 * @access Private
 */
router.post('/withdraw', auth_1.authenticateSession, async (req, res) => {
    try {
        if (!checkServiceAvailable(res))
            return;
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
    }
    catch (error) {
        console.error('Error withdrawing from top-up wallet:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
});
/**
 * @route GET /api/topup-wallet/stats
 * @desc Get wallet statistics for the authenticated user
 * @access Private
 */
router.get('/stats', auth_1.authenticateSession, async (req, res) => {
    try {
        if (!checkServiceAvailable(res))
            return;
        const userAddress = req.user?.address;
        if (!userAddress) {
            return res.status(400).json({ error: 'User address not found' });
        }
        const stats = await topUpWalletService.getWalletStats(userAddress);
        if (!stats) {
            return res.status(404).json({ error: 'Top-up wallet not found' });
        }
        res.json(stats);
    }
    catch (error) {
        console.error('Error getting wallet stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @route GET /api/topup-wallet/exists
 * @desc Check if user has a top-up wallet
 * @access Private
 */
router.get('/exists', auth_1.authenticateSession, async (req, res) => {
    try {
        if (!checkServiceAvailable(res))
            return;
        const userAddress = req.user?.address;
        if (!userAddress) {
            return res.status(400).json({ error: 'User address not found' });
        }
        const exists = await topUpWalletService.hasTopUpWallet(userAddress);
        res.json({ exists });
    }
    catch (error) {
        console.error('Error checking top-up wallet existence:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @route POST /api/topup-wallet/signature/topup
 * @desc Create signature for top-up authorization
 * @access Private
 */
router.post('/signature/topup', auth_1.authenticateSession, async (req, res) => {
    try {
        if (!checkServiceAvailable(res))
            return;
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
    }
    catch (error) {
        console.error('Error creating top-up signature:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @route POST /api/topup-wallet/signature/withdraw
 * @desc Create signature for withdrawal authorization
 * @access Private
 */
router.post('/signature/withdraw', auth_1.authenticateSession, async (req, res) => {
    try {
        if (!checkServiceAvailable(res))
            return;
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
    }
    catch (error) {
        console.error('Error creating withdrawal signature:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=topUpWalletRoutes.js.map