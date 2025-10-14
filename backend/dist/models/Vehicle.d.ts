import mongoose, { Document } from 'mongoose';
export interface IVehicleDocument {
    type: 'rc' | 'insurance' | 'pollution';
    name: string;
    uploadedAt: Date;
    verified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
}
export interface IVehicle extends Document {
    vehicleId: string;
    vehicleType: string;
    owner: string;
    documents: IVehicleDocument[];
    isActive: boolean;
    isBlacklisted: boolean;
    registrationTime: Date;
    lastTollTime?: Date;
    fastagWalletAddress?: string;
    metadata?: {
        make?: string;
        model?: string;
        year?: number;
        color?: string;
        engineNumber?: string;
        chassisNumber?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const Vehicle: mongoose.Model<IVehicle, {}, {}, {}, mongoose.Document<unknown, {}, IVehicle, {}, {}> & IVehicle & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Vehicle.d.ts.map