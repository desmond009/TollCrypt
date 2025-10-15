export interface TopUpWalletInfo {
    walletAddress: string;
    privateKey: string;
    publicKey: string;
    balance: string;
    isInitialized: boolean;
}
export interface WalletCreationResult {
    success: boolean;
    walletAddress?: string;
    privateKey?: string;
    publicKey?: string;
    error?: string;
}
export declare function getGlobalMockWallets(): Map<string, string>;
export declare function setGlobalMockWallet(userAddress: string, walletAddress: string): void;
export declare function hasGlobalMockWallet(userAddress: string): boolean;
export declare class TopUpWalletService {
    private provider;
    private factoryContract;
    private tollCollectionContract;
    private factoryWallet;
    private tollCollectionWallet;
    private isMockMode;
    constructor(rpcUrl: string, factoryAddress: string, tollCollectionAddress: string, factoryPrivateKey: string, tollCollectionPrivateKey: string);
    /**
     * Get singleton instance of TopUpWalletService
     */
    static getInstance(rpcUrl?: string, factoryAddress?: string, tollCollectionAddress?: string, factoryPrivateKey?: string, tollCollectionPrivateKey?: string): TopUpWalletService;
    /**
     * Create a mock contract for development/testing
     */
    private createMockContract;
    /**
     * Create a new top-up wallet for a user
     * @param userAddress User's wallet address
     * @returns Wallet creation result
     */
    createTopUpWallet(userAddress: string): Promise<WalletCreationResult>;
    /**
     * Get top-up wallet information for a user
     * @param userAddress User's wallet address
     * @returns Top-up wallet information
     */
    getTopUpWalletInfo(userAddress: string): Promise<TopUpWalletInfo | null>;
    /**
     * Check if user has a top-up wallet
     * @param userAddress User's wallet address
     * @returns True if user has a wallet
     */
    hasTopUpWallet(userAddress: string): Promise<boolean>;
    /**
     * Get top-up wallet balance
     * @param userAddress User's wallet address
     * @returns Balance in ETH
     */
    getTopUpWalletBalance(userAddress: string): Promise<string>;
    /**
     * Process top-up transaction
     * @param userAddress User's wallet address
     * @param amount Amount to top-up in ETH
     * @param signature User's signature for authorization
     * @returns Transaction hash
     */
    processTopUp(userAddress: string, amount: string, signature: string): Promise<string>;
    /**
     * Process toll payment from top-up wallet
     * @param userAddress User's wallet address
     * @param vehicleId Vehicle ID
     * @param amount Amount to pay
     * @param zkProofHash ZK proof hash
     * @returns Transaction hash
     */
    processTollPayment(userAddress: string, vehicleId: string, amount: string, zkProofHash: string): Promise<string>;
    /**
     * Withdraw funds from top-up wallet
     * @param userAddress User's wallet address
     * @param amount Amount to withdraw in ETH
     * @param signature User's signature for authorization
     * @returns Transaction hash
     */
    withdrawFromTopUpWallet(userAddress: string, amount: string, signature: string): Promise<string>;
    /**
     * Authorize a top-up wallet in the toll collection contract
     * @param walletAddress Top-up wallet address
     */
    private authorizeTopUpWallet;
    /**
     * Get wallet statistics
     * @param userAddress User's wallet address
     * @returns Wallet statistics
     */
    getWalletStats(userAddress: string): Promise<{
        totalTopUps: string;
        totalTollPayments: string;
        totalWithdrawals: string;
        currentBalance: string;
    } | null>;
    /**
     * Create signature for top-up authorization
     * @param userAddress User's wallet address
     * @param amount Amount to top-up
     * @param nonce Nonce for replay protection
     * @param privateKey User's private key
     * @returns Signature
     */
    createTopUpSignature(userAddress: string, amount: string, nonce: number, privateKey: string): Promise<string>;
    /**
     * Create signature for withdrawal authorization
     * @param userAddress User's wallet address
     * @param amount Amount to withdraw
     * @param nonce Nonce for replay protection
     * @param privateKey User's private key
     * @returns Signature
     */
    createWithdrawalSignature(userAddress: string, amount: string, nonce: number, privateKey: string): Promise<string>;
}
//# sourceMappingURL=topUpWalletService.d.ts.map