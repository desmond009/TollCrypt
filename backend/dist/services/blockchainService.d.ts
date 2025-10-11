import { Contract, JsonRpcProvider } from 'ethers';
export declare function connectToBlockchain(): Promise<void>;
export declare function verifyAnonAadhaarProof(proof: string, publicInputs: number[], userAddress: string): Promise<boolean>;
export declare function getContractBalance(): Promise<string>;
export declare function getProvider(): JsonRpcProvider;
export declare function getTollCollectionContract(): Contract;
export declare function getAnonAadhaarVerifierContract(): Contract;
//# sourceMappingURL=blockchainService.d.ts.map