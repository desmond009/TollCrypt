import { Server as HTTPServer } from 'http';
export declare class SocketService {
    private io;
    private adminRooms;
    constructor(server: HTTPServer);
    private setupSocketHandlers;
    emitToAdmins(event: string, data: any): void;
    emitToAdmin(adminId: string, event: string, data: any): void;
    emitToUser(userId: string, event: string, data: any): void;
    emitToRole(role: string, event: string, data: any): void;
    broadcastNewTransaction(transaction: any): Promise<void>;
    broadcastTransactionStatusUpdate(transactionId: string, newStatus: string, oldStatus: string): Promise<void>;
    broadcastVehicleRegistration(vehicle: any): Promise<void>;
    broadcastVehicleBlacklist(vehicle: any, isBlacklisted: boolean): Promise<void>;
    broadcastSystemAlert(title: string, message: string, priority?: 'low' | 'medium' | 'high' | 'critical'): Promise<void>;
    getConnectedAdminCount(): number;
    getConnectedAdmins(): string[];
}
export default SocketService;
//# sourceMappingURL=socketService.d.ts.map