/**
 * Comprehensive error handling utilities for blockchain operations
 */

export interface ErrorContext {
  operation: string;
  contractAddress?: string;
  methodName?: string;
  parameters?: any[];
  walletAddress?: string;
  transactionHash?: string;
  attempt?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export class BlockchainErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
  };

  /**
   * Enhanced error logging with context
   */
  static logError(error: any, context: ErrorContext): void {
    const errorInfo = {
      message: error.message,
      code: error.code,
      reason: error.reason,
      data: error.data,
      context
    };

    console.error('🚨 Blockchain Error:', errorInfo);

    // Log specific error types with helpful messages
    if (error.code === 'BAD_DATA') {
      console.error('💡 This usually means the contract ABI is incorrect or the contract method doesn\'t exist');
    } else if (error.code === 'CALL_EXCEPTION') {
      console.error('💡 This usually means the contract call failed due to insufficient permissions or invalid parameters');
    } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      console.error('💡 This usually means the transaction would fail, check contract state and parameters');
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('💡 This means the wallet doesn\'t have enough funds for the transaction');
    }
  }

  /**
   * Check if an error is retryable
   */
  static isRetryableError(error: any): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'SERVER_ERROR',
      'UNKNOWN_ERROR'
    ];

    const retryableMessages = [
      'network error',
      'timeout',
      'connection',
      'fetch'
    ];

    return retryableCodes.includes(error.code) ||
           retryableMessages.some(msg => 
             error.message?.toLowerCase().includes(msg)
           );
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error;
    let delay = retryConfig.baseDelayMs;

    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempting ${context.operation} (attempt ${attempt}/${retryConfig.maxRetries})`);
        return await operation();
      } catch (error: any) {
        lastError = error;
        this.logError(error, { ...context, attempt });

        if (attempt < retryConfig.maxRetries && this.isRetryableError(error)) {
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelayMs);
        } else {
          break;
        }
      }
    }

    throw lastError!;
  }

  /**
   * Handle contract method calls with fallback
   */
  static async callContractMethod<T>(
    contractCall: () => Promise<T>,
    fallbackValue: T,
    context: ErrorContext
  ): Promise<T> {
    try {
      return await this.retryOperation(contractCall, context);
    } catch (error: any) {
      this.logError(error, context);
      console.warn(`⚠️ Using fallback value for ${context.operation}`);
      return fallbackValue;
    }
  }

  /**
   * Handle vehicle registration with graceful degradation
   */
  static async handleVehicleRegistration(
    vehicleId: string,
    registrationCall: () => Promise<any>,
    context: ErrorContext
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.retryOperation(registrationCall, context);
      return { success: true, ...result };
    } catch (error: any) {
      this.logError(error, context);
      
      // Don't fail the entire flow for registration errors
      console.warn(`⚠️ Vehicle registration failed for ${vehicleId}, continuing with payment`);
      return { 
        success: false, 
        error: `Registration failed: ${error.message}` 
      };
    }
  }

  /**
   * Handle toll payment with comprehensive error handling
   */
  static async handleTollPayment(
    paymentCall: () => Promise<any>,
    context: ErrorContext
  ): Promise<{ success: boolean; error?: string; transactionHash?: string }> {
    try {
      const result = await this.retryOperation(paymentCall, context);
      return { success: true, ...result };
    } catch (error: any) {
      this.logError(error, context);
      
      let errorMessage = error.message || 'Payment failed';
      
      if (error.code === 'CALL_EXCEPTION') {
        if (error.message.includes('missing revert data')) {
          errorMessage = 'Contract call failed. This usually indicates:\n' +
                        '1. The contract method does not exist\n' +
                        '2. The contract is not properly deployed\n' +
                        '3. Insufficient authorization or permissions\n' +
                        '4. Invalid parameters passed to the contract';
        } else if (error.message.includes('execution reverted')) {
          errorMessage = 'Transaction execution reverted. This usually means:\n' +
                        '1. Insufficient funds in the wallet\n' +
                        '2. Contract state prevents the operation\n' +
                        '3. Invalid parameters or authorization\n' +
                        '4. Contract method reverted due to business logic';
        } else {
          errorMessage = 'Contract call failed. This might be due to insufficient authorization or invalid parameters.';
        }
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage = 'Transaction would fail. Please check:\n' +
                      '1. Wallet has sufficient funds\n' +
                      '2. Contract state allows the operation\n' +
                      '3. Parameters are valid\n' +
                      '4. Authorization is correct';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for transaction. Please add ETH to your wallet.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  /**
   * Create a safe contract method wrapper
   */
  static createSafeContractMethod<T>(
    methodName: string,
    contractCall: () => Promise<T>,
    fallbackValue: T,
    context: Partial<ErrorContext> = {}
  ) {
    return async (...args: any[]): Promise<T> => {
      const fullContext: ErrorContext = {
        operation: methodName,
        methodName,
        parameters: args,
        ...context
      };

      return this.callContractMethod(contractCall, fallbackValue, fullContext);
    };
  }
}

/**
 * Error types for better error handling
 */
export enum BlockchainErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Get error type from error object
 */
export function getErrorType(error: any): BlockchainErrorType {
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
    return BlockchainErrorType.NETWORK_ERROR;
  }
  
  if (error.code === 'CALL_EXCEPTION' || error.code === 'BAD_DATA') {
    return BlockchainErrorType.CONTRACT_ERROR;
  }
  
  if (error.code === 'UNPREDICTABLE_GAS_LIMIT' || error.message?.includes('revert')) {
    return BlockchainErrorType.VALIDATION_ERROR;
  }
  
  if (error.message?.includes('user rejected') || error.message?.includes('denied')) {
    return BlockchainErrorType.AUTHENTICATION_ERROR;
  }
  
  return BlockchainErrorType.UNKNOWN_ERROR;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: any): string {
  const errorType = getErrorType(error);
  
  switch (errorType) {
    case BlockchainErrorType.NETWORK_ERROR:
      return 'Network connection failed. Please check your internet connection and try again.';
    
    case BlockchainErrorType.CONTRACT_ERROR:
      return 'Smart contract interaction failed. Please ensure the contract is properly deployed and try again.';
    
    case BlockchainErrorType.AUTHENTICATION_ERROR:
      return 'Transaction was rejected or authentication failed. Please try again.';
    
    case BlockchainErrorType.VALIDATION_ERROR:
      return 'Transaction validation failed. Please check your inputs and try again.';
    
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}
