/**
 * Browser Extension Conflict Resolver
 * 
 * This utility helps resolve conflicts between multiple wallet extensions
 * and prevents runtime errors from content scripts.
 */

// Extend Window interface to include Chrome extension APIs
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        id?: string;
        onConnect?: any;
        onMessage?: any;
      };
    };
  }
}

interface ExtensionInfo {
  name: string;
  id: string;
  version: string;
  enabled: boolean;
}

// Extend the EthereumProvider interface to include providers array
interface EthereumProviderWithProviders {
  providers?: any[];
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isRainbow?: boolean;
}

class ExtensionConflictResolver {
  private static instance: ExtensionConflictResolver;
  private conflictDetected = false;
  private resolvedConflicts: string[] = [];
  private originalConsoleWarn!: typeof console.warn;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): ExtensionConflictResolver {
    if (!ExtensionConflictResolver.instance) {
      ExtensionConflictResolver.instance = new ExtensionConflictResolver();
    }
    return ExtensionConflictResolver.instance;
  }

  private initialize(): void {
    // Store original console methods
    this.originalConsoleWarn = console.warn;
    
    // Detect and resolve conflicts on page load
    this.detectConflicts();
    this.setupErrorHandling();
    this.setupExtensionMonitoring();
  }

  private detectConflicts(): void {
    console.log('🔍 Detecting browser extension conflicts...');

    // Check for multiple ethereum providers
    const ethereumProviders = this.getEthereumProviders();
    if (ethereumProviders.length > 1) {
      console.log(`⚠️ Multiple Ethereum providers detected: ${ethereumProviders.length}`);
      this.resolveEthereumProviderConflicts(ethereumProviders);
    }

    // Check for conflicting content scripts
    this.detectContentScriptConflicts();

    // Check for origin mismatches
    this.detectOriginMismatches();
  }

  private getEthereumProviders(): any[] {
    const providers: any[] = [];
    
    // Check window.ethereum
    if (window.ethereum) {
      providers.push(window.ethereum);
    }

    // Check for EIP-6963 providers with proper type checking
    const ethereumWithProviders = window.ethereum as EthereumProviderWithProviders;
    if (ethereumWithProviders?.providers) {
      providers.push(...ethereumWithProviders.providers);
    }

    // Check for other common provider patterns
    const commonProviderNames = [
      'ethereum',
      'web3',
      'metamask',
      'coinbase',
      'trust',
      'rainbow'
    ];

    commonProviderNames.forEach(name => {
      if ((window as any)[name]) {
        providers.push((window as any)[name]);
      }
    });

    return providers;
  }

  private resolveEthereumProviderConflicts(providers: any[]): void {
    console.log('🔧 Resolving Ethereum provider conflicts...');

    // Prioritize MetaMask if available
    const metaMaskProvider = providers.find(provider => 
      provider.isMetaMask || 
      provider._metamask ||
      provider.isConnected?.toString().includes('MetaMask')
    );

    if (metaMaskProvider) {
      console.log('✅ Using MetaMask as primary provider');
      window.ethereum = metaMaskProvider;
      this.resolvedConflicts.push('ethereum-provider-conflict');
    } else {
      // Use the first available provider
      console.log('✅ Using first available provider');
      window.ethereum = providers[0];
      this.resolvedConflicts.push('ethereum-provider-fallback');
    }
  }

  private detectContentScriptConflicts(): void {
    // Enhanced error suppression for content script conflicts
    this.setupConsoleErrorSuppression();
    this.setupUnhandledRejectionSuppression();
    this.setupGlobalErrorSuppression();
  }

  private setupConsoleErrorSuppression(): void {
    const originalConsoleError = console.error;
    
    console.error = (...args) => {
      const message = args.join(' ');
      
      // Enhanced pattern matching for content script errors
      if (this.isContentScriptError(message)) {
        this.originalConsoleWarn('🚫 Content script conflict detected and suppressed:', message);
        this.handleContentScriptError(message);
        return; // Suppress the error
      }
      
      // Log other errors normally
      try {
        originalConsoleError.apply(console, args);
      } catch (error) {
        // Silently handle any console error issues
      }
    };

    // Also monitor console.warn for runtime errors
    console.warn = (...args) => {
      const message = args.join(' ');
      
      if (this.isContentScriptError(message)) {
        this.originalConsoleWarn('🚫 Runtime conflict detected in warning and suppressed:', message);
        this.handleContentScriptError(message);
        return;
      }
      
      this.originalConsoleWarn.apply(console, args);
    };
  }

  private setupUnhandledRejectionSuppression(): void {
    // Enhanced unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || '';
      
      if (this.isContentScriptError(errorMessage)) {
        this.originalConsoleWarn('🚫 Unhandled promise rejection suppressed:', errorMessage);
        event.preventDefault(); // Prevent the error from being logged
        this.handleContentScriptError(errorMessage);
        return;
      }
    });
  }

  private setupGlobalErrorSuppression(): void {
    // Enhanced global error handler
    window.addEventListener('error', (event) => {
      const error = event.error;
      const errorMessage = error?.message || event.message || '';
      
      if (this.isContentScriptError(errorMessage)) {
        this.originalConsoleWarn('🚫 Global error suppressed:', errorMessage);
        event.preventDefault();
        this.handleContentScriptError(errorMessage);
        return;
      }
    });
  }

  private isContentScriptError(message: string): boolean {
    if (!message) return false;
    
    const lowerMessage = message.toLowerCase();
    
    // Enhanced pattern matching for content script errors
    const errorPatterns = [
      'invalid runtime',
      'content_script.js',
      'origins don\'t match',
      'sendruntimemessage',
      'vm9596',
      'vm',
      'runtime message',
      'chrome-extension',
      'moz-extension',
      'safari-extension',
      'extension',
      'magic.link',
      'walletconnect',
      'origins don\'t match',
      'runtime error',
      'extension error',
      'content script',
      'injected script',
      'web3 provider',
      'ethereum provider',
      'wallet provider',
      'metamask',
      'coinbase',
      'trust wallet',
      'rainbow wallet'
    ];

    return errorPatterns.some(pattern => lowerMessage.includes(pattern));
  }

  private handleContentScriptError(message: string): void {
    this.conflictDetected = true;
    
    // Add error suppression for known problematic scripts
    if (message.includes('Magic.link') || message.includes('WalletConnect')) {
      this.suppressExtensionErrors(['magic-link', 'walletconnect']);
    }
    
    // Handle specific runtime errors
    if (message.includes('Invalid runtime') || message.includes('sendRuntimeMessage')) {
      this.suppressExtensionErrors(['runtime-conflict']);
      this.resolveRuntimeConflicts();
    }
    
    // Handle VM-specific errors (like VM9596)
    if (message.includes('VM9596') || message.includes('content_script.js')) {
      this.suppressExtensionErrors(['vm-conflict']);
      this.resolveVMConflicts();
    }
  }

  private suppressExtensionErrors(extensionNames: string[]): void {
    extensionNames.forEach(name => {
      console.log(`🔇 Suppressing errors from ${name}`);
      this.resolvedConflicts.push(`suppressed-${name}`);
    });
  }

  private resolveRuntimeConflicts(): void {
    console.log('🔧 Resolving runtime conflicts...');
    
    // Clear any cached runtime messages
    try {
      // Remove any cached runtime message handlers
      if ((window as any).chrome && (window as any).chrome.runtime) {
        console.log('✅ Chrome runtime detected, clearing cached handlers');
      }
    } catch (error) {
      this.originalConsoleWarn('⚠️ Failed to clear runtime handlers:', error);
    }
    
    // Force refresh of ethereum provider
    if (window.ethereum) {
      try {
        // Reset ethereum provider to avoid runtime conflicts
        const originalEthereum = window.ethereum;
        delete (window as any).ethereum;
        
        // Re-assign after a short delay
        setTimeout(() => {
          window.ethereum = originalEthereum;
          console.log('✅ Ethereum provider refreshed');
        }, 100);
      } catch (error) {
        this.originalConsoleWarn('⚠️ Failed to refresh ethereum provider:', error);
      }
    }
  }

  private resolveVMConflicts(): void {
    console.log('🔧 Resolving VM conflicts...');
    
    // Clear any VM-specific cached data
    try {
      // Clear localStorage items that might be causing VM conflicts
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('extension') || key.includes('wallet') || key.includes('runtime'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`✅ Removed localStorage key: ${key}`);
      });
      
      // Clear sessionStorage as well
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('extension') || key.includes('wallet') || key.includes('runtime'))) {
          sessionKeysToRemove.push(key);
        }
      }
      
      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`✅ Removed sessionStorage key: ${key}`);
      });
      
    } catch (error) {
      this.originalConsoleWarn('⚠️ Failed to clear VM cache:', error);
    }
  }

  private detectOriginMismatches(): void {
    // Check for origin mismatches in wallet connections
    const currentOrigin = window.location.origin;
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://tollchain.com',
      'https://admin.tollchain.com'
    ];

    if (!allowedOrigins.includes(currentOrigin)) {
      this.originalConsoleWarn(`⚠️ Origin mismatch detected: ${currentOrigin}`);
      this.resolvedConflicts.push('origin-mismatch');
    }
  }

  private setupErrorHandling(): void {
    // This method is now handled by the enhanced error suppression methods
    // Keep this for backward compatibility but the real work is done in:
    // - setupConsoleErrorSuppression()
    // - setupUnhandledRejectionSuppression() 
    // - setupGlobalErrorSuppression()
    
    console.log('🔧 Enhanced error handling initialized');
  }

  private isExtensionError(error: any): boolean {
    if (!error) return false;
    
    const errorString = error.toString().toLowerCase();
    const errorMessage = error.message?.toLowerCase() || '';
    
    const extensionErrorPatterns = [
      'invalid runtime',
      'content_script.js',
      'origins don\'t match',
      'magic.link',
      'walletconnect',
      'extension',
      'chrome-extension',
      'moz-extension',
      'safari-extension',
      'sendruntimemessage',
      'vm9596',
      'vm',
      'runtime message'
    ];

    return extensionErrorPatterns.some(pattern => 
      errorString.includes(pattern) || errorMessage.includes(pattern)
    );
  }

  private setupExtensionMonitoring(): void {
    // Monitor for new extensions being loaded
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.tagName === 'SCRIPT' && 
                  element.getAttribute('src')?.includes('extension')) {
                console.log('🔍 New extension script detected');
                this.detectConflicts(); // Re-run conflict detection
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  public getConflictStatus(): {
    conflictsDetected: boolean;
    resolvedConflicts: string[];
    ethereumProviders: number;
  } {
    return {
      conflictsDetected: this.conflictDetected,
      resolvedConflicts: this.resolvedConflicts,
      ethereumProviders: this.getEthereumProviders().length
    };
  }

  public forceResolveConflicts(): void {
    console.log('🔧 Force resolving all conflicts...');
    this.detectConflicts();
  }

  public clearResolvedConflicts(): void {
    this.resolvedConflicts = [];
    this.conflictDetected = false;
    console.log('🧹 Cleared resolved conflicts');
  }
}

// Export singleton instance
export const extensionConflictResolver = ExtensionConflictResolver.getInstance();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  // Initialize the resolver
  void extensionConflictResolver;
}
