import mongoose, { Document } from 'mongoose';
export interface IAdminUser extends Document {
    email: string;
    password: string;
    name: string;
    role: 'super_admin' | 'admin' | 'operator' | 'viewer';
    isActive: boolean;
    lastLogin?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    permissions: {
        canManageVehicles: boolean;
        canProcessTolls: boolean;
        canViewAnalytics: boolean;
        canManageUsers: boolean;
        canHandleDisputes: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    toJSON(): any;
}
export declare const AdminUser: mongoose.Model<IAdminUser, {}, {}, {}, mongoose.Document<unknown, {}, IAdminUser, {}, {}> & IAdminUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=AdminUser.d.ts.map