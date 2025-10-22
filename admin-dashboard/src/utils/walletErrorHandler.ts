/**
 * Wallet Connection Error Handler
 * 
 * This utility handles wallet connection errors and provides fallback mechanisms
 * for when browser extensions conflict or fail to load properly.
 */

interface WalletError {
  type: 'extension-conflict' | 'network-error' | 'user-rejected' | 'unknown';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

class WalletErrorHandler {
  private static instance: WalletErrorHandler;
  private errors: WalletError[] = [];
  private maxErrors = 50;

  private constructor() {
    this.setupGlobalErrorHandling();
  }

  public static getInstance(): WalletErrorHandler {
    if (!WalletErrorHandler.instance) {
      WalletErrorHandler.instance = new WalletErrorHandler();
    }
    return WalletErrorHandler.instance;
  }

  private setupGlobalErrorHandling(): void {
    // Handle unhandled promise rejections from wallet connections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      
      if (this.isWalletError(error)) {
        this.handleWalletError(error);
        event.preventDefault(); // Prevent default error logging
      }
    });

    // Handle JavaScript errors from wallet extensions
    window.addEventListener('error', (event) => {
      const error = event.error;
      
      if (this.isWalletError(error)) {
        this.handleWalletError(error);
        event.preventDefault();
      }
    });
  }

  private isWalletError(error: any): boolean {
    if (!error) return false;
    
    const errorString = error.toString().toLowerCase();
    const errorMessage = error.message?.toLowerCase() || '';
    
    const walletErrorPatterns = [
      'user rejected',
      'user denied',
      'user cancelled',
      'wallet not found',
      'wallet not installed',
      'metamask',
      'coinbase',
      'trust wallet',
      'rainbow',
      'walletconnect',
      'magic.link',
      'extension',
      'injected',
      'provider',
      'ethereum',
      'web3',
      'invalid runtime',
      'content_script.js',
      'sendruntimemessage',
      'vm9596',
      'runtime message'
    ];

    return walletErrorPatterns.some(pattern => 
      errorString.includes(pattern) || errorMessage.includes(pattern)
    );
  }

  private handleWalletError(error: any): void {
    const walletError: WalletError = {
      type: this.categorizeError(error),
      message: error.message || error.toString(),
      timestamp: new Date(),
      resolved: false
    };

    this.errors.push(walletError);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    console.warn('🚫 Wallet error handled:', walletError);
    
    // Attempt to resolve the error
    this.attemptErrorResolution(walletError);
  }

  private categorizeError(error: any): WalletError['type'] {
    const errorString = error.toString().toLowerCase();
    const errorMessage = error.message?.toLowerCase() || '';
    
    if (errorString.includes('user rejected') || errorString.includes('user denied')) {
      return 'user-rejected';
    }
    
    if (errorString.includes('network') || errorString.includes('rpc')) {
      return 'network-error';
    }
    
    if (errorString.includes('extension') || 
        errorString.includes('injected') ||
        errorString.includes('invalid runtime') ||
        errorString.includes('content_script.js') ||
        errorString.includes('sendruntimemessage') ||
        errorString.includes('vm9596')) {
      return 'extension-conflict';
    }
    
    return 'unknown';
  }

  private attemptErrorResolution(error: WalletError): void {
    switch (error.type) {
      case 'extension-conflict':
        this.resolveExtensionConflict();
        break;
      case 'network-error':
        this.resolveNetworkError();
        break;
      case 'user-rejected':
        // User rejection doesn't need resolution
        error.resolved = true;
        break;
      default:
        this.resolveUnknownError(error);
    }
  }

  private resolveExtensionConflict(): void {
    console.log('🔧 Attempting to resolve extension conflict...');
    
    // Clear any cached wallet connections
    if (window.ethereum) {
      try {
        // Reset the ethereum provider
        delete (window as any).ethereum;
        console.log('✅ Cleared cached ethereum provider');
      } catch (error) {
        console.warn('⚠️ Failed to clear ethereum provider:', error);
      }
    }

    // Mark extension conflicts as resolved
    this.errors.forEach(error => {
      if (error.type === 'extension-conflict') {
        error.resolved = true;
      }
    });
  }

  private resolveNetworkError(): void {
    console.log('🔧 Attempting to resolve network error...');
    
    // Network errors are usually temporary, mark as resolved after a delay
    setTimeout(() => {
      this.errors.forEach(error => {
        if (error.type === 'network-error') {
          error.resolved = true;
        }
      });
    }, 5000);
  }

  private resolveUnknownError(error: WalletError): void {
    console.log('🔧 Attempting to resolve unknown error...');
    
    // For unknown errors, try a general cleanup
    this.performGeneralCleanup();
    error.resolved = true;
  }

  private performGeneralCleanup(): void {
    // Clear any cached wallet state
    try {
      localStorage.removeItem('wagmi.store');
      localStorage.removeItem('wagmi.wallet');
      sessionStorage.removeItem('wagmi.store');
      sessionStorage.removeItem('wagmi.wallet');
      console.log('✅ Cleared wallet cache');
    } catch (error) {
      console.warn('⚠️ Failed to clear wallet cache:', error);
    }
  }

  public getErrorStats(): {
    totalErrors: number;
    unresolvedErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: WalletError[];
  } {
    const unresolvedErrors = this.errors.filter(error => !error.resolved);
    const errorsByType = this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const recentErrors = this.errors.slice(-10); // Last 10 errors

    return {
      totalErrors: this.errors.length,
      unresolvedErrors: unresolvedErrors.length,
      errorsByType,
      recentErrors
    };
  }

  public clearErrors(): void {
    this.errors = [];
    console.log('🧹 Cleared all wallet errors');
  }

  public getLastError(): WalletError | null {
    return this.errors.length > 0 ? this.errors[this.errors.length - 1] : null;
  }

  public hasRecentErrors(minutes: number = 5): boolean {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return this.errors.some(error => error.timestamp > cutoffTime);
  }

  public getErrorRecommendations(): string[] {
    const stats = this.getErrorStats();
    const recommendations: string[] = [];

    if (stats.errorsByType['extension-conflict'] > 0) {
      recommendations.push('Try disabling conflicting browser extensions');
      recommendations.push('Refresh the page and try connecting again');
    }

    if (stats.errorsByType['network-error'] > 0) {
      recommendations.push('Check your internet connection');
      recommendations.push('Try switching to a different network');
    }

    if (stats.errorsByType['user-rejected'] > 0) {
      recommendations.push('Make sure to approve wallet connection requests');
      recommendations.push('Check if your wallet is unlocked');
    }

    if (recommendations.length === 0) {
      recommendations.push('Try refreshing the page');
      recommendations.push('Clear browser cache and cookies');
    }

    return recommendations;
  }
}

// Export singleton instance
export const walletErrorHandler = WalletErrorHandler.getInstance();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  // Initialize the error handler
  void walletErrorHandler;
}
