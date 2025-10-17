import mongoose, { Document, Types } from 'mongoose';
export interface ITollTransaction extends Document {
    transactionId: string;
    vehicleId: Types.ObjectId;
    payer: string;
    amount: number;
    currency: string;
    zkProofHash: string;
    tollLocation: string;
    useGaslessTransaction: boolean;
    status: 'pending' | 'confirmed' | 'failed' | 'disputed';
    blockchainTxHash?: string;
    blockNumber?: number;
    gasUsed?: number;
    gasPrice?: number;
    timestamp: Date;
    processedAt?: Date;
    metadata?: {
        tollBoothId?: string;
        location?: {
            latitude: number;
            longitude: number;
        };
        vehicleType?: string;
        discountApplied?: number;
        rfidDetected?: boolean;
        processedAt?: Date;
        gaslessTransaction?: boolean;
        paymasterAddress?: string;
        accountAbstractionWallet?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const TollTransaction: mongoose.Model<ITollTransaction, {}, {}, {}, mongoose.Document<unknown, {}, ITollTransaction, {}, {}> & ITollTransaction & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=TollTransaction.d.ts.map