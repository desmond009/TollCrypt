import mongoose, { Document } from 'mongoose';
export interface IVehicle extends Document {
    vehicleId: string;
    owner: string;
    isActive: boolean;
    isBlacklisted: boolean;
    registrationTime: Date;
    lastTollTime?: Date;
    metadata?: {
        make?: string;
        model?: string;
        year?: number;
        color?: string;
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