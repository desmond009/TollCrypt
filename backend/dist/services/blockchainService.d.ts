import { Contract, JsonRpcProvider } from 'ethers';
export declare function connectToBlockchain(): Promise<void>;
export declare function verifyAnonAadhaarProof(proof: string, publicInputs: number[], userAddress: string): Promise<boolean>;
export declare function getContractBalance(): Promise<string>;
export declare function getProvider(): JsonRpcProvider;
export declare function getTollCollectionContract(): Contract;
export declare function getAnonAadhaarVerifierContract(): Contract;
export declare function cleanupBlockchainConnection(): void;
declare const blockchainService: {
    connectToBlockchain: typeof connectToBlockchain;
    verifyAnonAadhaarProof: typeof verifyAnonAadhaarProof;
    getContractBalance: typeof getContractBalance;
    getProvider: typeof getProvider;
    getTollCollectionContract: typeof getTollCollectionContract;
    getAnonAadhaarVerifierContract: typeof getAnonAadhaarVerifierContract;
    cleanupBlockchainConnection: typeof cleanupBlockchainConnection;
};
export default blockchainService;
//# sourceMappingURL=blockchainService.d.ts.map