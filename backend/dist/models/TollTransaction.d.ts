import mongoose, { Document } from 'mongoose';
export interface ITollTransaction extends Document {
    transactionId: string;
    vehicleId: string;
    payer: string;
    amount: number;
    currency: string;
    zkProofHash: string;
    status: 'pending' | 'confirmed' | 'failed' | 'disputed';
    blockchainTxHash?: string;
    blockNumber?: number;
    gasUsed?: number;
    timestamp: Date;
    metadata?: {
        tollBoothId?: string;
        location?: {
            latitude: number;
            longitude: number;
        };
        vehicleType?: string;
        discountApplied?: number;
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