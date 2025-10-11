import { Server } from 'socket.io';
export declare function setupSocketHandlers(io: Server): void;
export declare function emitTollPaymentUpdate(io: Server, transaction: any): void;
export declare function emitVehicleRegistrationUpdate(io: Server, vehicle: any): void;
export declare function emitVehicleBlacklistUpdate(io: Server, vehicleId: string, isBlacklisted: boolean): void;
export declare function emitSystemAlert(io: Server, alert: {
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
}): void;
//# sourceMappingURL=socketService.d.ts.map