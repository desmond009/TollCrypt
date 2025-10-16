import SocketService from './socketService';

let socketServiceInstance: SocketService | null = null;

export const setSocketService = (service: SocketService) => {
  socketServiceInstance = service;
};

export const getSocketService = (): SocketService => {
  if (!socketServiceInstance) {
    throw new Error('Socket service not initialized');
  }
  return socketServiceInstance;
};

export default getSocketService;
