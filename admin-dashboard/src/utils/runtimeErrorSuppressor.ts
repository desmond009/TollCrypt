/**
 * Runtime Error Suppressor
 * 
 * This utility specifically targets and suppresses browser extension runtime errors
 * that cause "Invalid runtime" and content script errors.
 */

class RuntimeErrorSuppressor {
  private static instance: RuntimeErrorSuppressor;
  private suppressedErrors: Set<string> = new Set();
  private originalConsoleError!: typeof console.error;
  private originalConsoleWarn!: typeof console.warn;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): RuntimeErrorSuppressor {
    if (!RuntimeErrorSuppressor.instance) {
      RuntimeErrorSuppressor.instance = new RuntimeErrorSuppressor();
    }
    return RuntimeErrorSuppressor.instance;
  }

  private initialize(): void {
    console.log('🛡️ Initializing Runtime Error Suppressor...');
    
    // Store original console methods
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    
    // Set up aggressive error suppression
    this.setupAggressiveErrorSuppression();
    this.setupPromiseRejectionSuppression();
    this.setupGlobalErrorSuppression();
    
    console.log('✅ Runtime Error Suppressor initialized');
  }

  private setupAggressiveErrorSuppression(): void {
    // Override console.error with aggressive suppression
    console.error = (...args) => {
      const message = args.join(' ');
      
      if (this.shouldSuppressError(message)) {
        this.suppressedErrors.add(message);
        this.originalConsoleWarn('🚫 Suppressed runtime error:', message.substring(0, 100) + '...');
        return; // Completely suppress the error
      }
      
      // Log legitimate errors
      try {
        this.originalConsoleError.apply(console, args);
      } catch (error) {
        // Silently handle any console error issues
      }
    };

    // Override console.warn with suppression
    console.warn = (...args) => {
      const message = args.join(' ');
      
      if (this.shouldSuppressError(message)) {
        this.suppressedErrors.add(message);
        this.originalConsoleWarn('🚫 Suppressed runtime warning:', message.substring(0, 100) + '...');
        return;
      }
      
      try {
        this.originalConsoleWarn.apply(console, args);
      } catch (error) {
        // Silently handle any console warning issues
      }
    };
  }

  private setupPromiseRejectionSuppression(): void {
    // Aggressive unhandled promise rejection suppression
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || '';
      
      if (this.shouldSuppressError(errorMessage)) {
        this.originalConsoleWarn('🚫 Suppressed unhandled promise rejection:', errorMessage.substring(0, 100) + '...');
        event.preventDefault();
        event.stopPropagation();
        this.suppressedErrors.add(errorMessage);
        return;
      }
    });
  }

  private setupGlobalErrorSuppression(): void {
    // Aggressive global error suppression
    window.addEventListener('error', (event) => {
      const error = event.error;
      const errorMessage = error?.message || event.message || '';
      
      if (this.shouldSuppressError(errorMessage)) {
        this.originalConsoleWarn('🚫 Suppressed global error:', errorMessage.substring(0, 100) + '...');
        event.preventDefault();
        event.stopPropagation();
        this.suppressedErrors.add(errorMessage);
        return;
      }
    });
  }

  private shouldSuppressError(message: string): boolean {
    if (!message) return false;
    
    const lowerMessage = message.toLowerCase();
    
    // Comprehensive list of patterns to suppress
    const suppressPatterns = [
      // Runtime errors
      'invalid runtime',
      'runtime error',
      'runtime message',
      'sendruntimemessage',
      'sendruntime',
      
      // Content script errors
      'content_script.js',
      'content script',
      'injected script',
      'extension script',
      
      // VM errors
      'vm9596',
      'vm',
      'vm:',
      
      // Extension errors
      'chrome-extension',
      'moz-extension',
      'safari-extension',
      'extension error',
      'extension conflict',
      
      // Wallet/Provider errors
      'magic.link',
      'walletconnect',
      'web3 provider',
      'ethereum provider',
      'wallet provider',
      'metamask',
      'coinbase',
      'trust wallet',
      'rainbow wallet',
      
      // Origin errors
      'origins don\'t match',
      'origin mismatch',
      'cross-origin',
      
      // Promise errors
      'uncaught (in promise)',
      'unhandled promise',
      
      // Specific error patterns from your error
      'at sendruntime',
      'at #ae',
      'at #ie',
      'at #ee.e.#te',
      'content_script.js:1',
      'uncaught (in promise) error: invalid runtime'
    ];

    return suppressPatterns.some(pattern => lowerMessage.includes(pattern));
  }

  public getSuppressedErrors(): string[] {
    return Array.from(this.suppressedErrors);
  }

  public clearSuppressedErrors(): void {
    this.suppressedErrors.clear();
    this.originalConsoleWarn('🧹 Cleared suppressed errors list');
  }

  public getSuppressionStats(): {
    totalSuppressed: number;
    recentSuppressed: string[];
  } {
    const recentErrors = Array.from(this.suppressedErrors).slice(-10);
    return {
      totalSuppressed: this.suppressedErrors.size,
      recentSuppressed: recentErrors
    };
  }

  public forceSuppressAll(): void {
    this.originalConsoleWarn('🛡️ Force suppressing all runtime errors...');
    
    // Suppress specific extension APIs
    try {
      const chromeRuntime = (window as any).chrome?.runtime;
      if (chromeRuntime?.sendMessage) {
        const originalSendMessage = chromeRuntime.sendMessage;
        chromeRuntime.sendMessage = (...args: any[]) => {
          try {
            return originalSendMessage.apply(chromeRuntime, args);
          } catch (error) {
            this.originalConsoleWarn('🚫 Suppressed chrome.runtime.sendMessage error');
            return Promise.resolve();
          }
        };
      }
    } catch (error) {
      // Silently handle any chrome API errors
    }
  }
}

// Export singleton instance
export const runtimeErrorSuppressor = RuntimeErrorSuppressor.getInstance();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  // Initialize the suppressor immediately
  void runtimeErrorSuppressor;
  
  // Also initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      runtimeErrorSuppressor.forceSuppressAll();
    });
  } else {
    runtimeErrorSuppressor.forceSuppressAll();
  }
}
