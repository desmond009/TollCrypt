/**
 * Browser Extension Helper
 * 
 * This utility provides comprehensive browser extension conflict resolution
 * and helps users identify and fix common wallet extension issues.
 */

interface ExtensionInfo {
  name: string;
  id: string;
  version: string;
  enabled: boolean;
  problematic: boolean;
}

interface ConflictReport {
  detectedConflicts: string[];
  recommendations: string[];
  extensionsToDisable: string[];
  extensionsToKeep: string[];
}

class BrowserExtensionHelper {
  private static instance: BrowserExtensionHelper;
  private knownProblematicExtensions: string[] = [
    'Magic.link',
    'WalletConnect Extension',
    'Rainbow Wallet',
    'Trust Wallet (if multiple wallets installed)',
    'Coinbase Wallet (if MetaMask also installed)'
  ];

  private constructor() {
    this.initialize();
  }

  public static getInstance(): BrowserExtensionHelper {
    if (!BrowserExtensionHelper.instance) {
      BrowserExtensionHelper.instance = new BrowserExtensionHelper();
    }
    return BrowserExtensionHelper.instance;
  }

  private initialize(): void {
    console.log('🔧 Browser Extension Helper initialized');
    this.detectAndReportConflicts();
  }

  public detectAndReportConflicts(): ConflictReport {
    const conflicts: string[] = [];
    const recommendations: string[] = [];
    const extensionsToDisable: string[] = [];
    const extensionsToKeep: string[] = [];

    // Check for multiple ethereum providers
    const ethereumProviders = this.getEthereumProviders();
    if (ethereumProviders.length > 1) {
      conflicts.push(`Multiple Ethereum providers detected: ${ethereumProviders.length}`);
      recommendations.push('Disable unused wallet extensions to prevent conflicts');
      
      // Identify which extensions to keep/disable
      const metaMaskProvider = ethereumProviders.find(provider => 
        provider.isMetaMask || provider._metamask
      );
      
      if (metaMaskProvider) {
        extensionsToKeep.push('MetaMask');
        extensionsToDisable.push('Coinbase Wallet', 'Trust Wallet', 'Rainbow Wallet');
      } else {
        extensionsToKeep.push('Primary Wallet Extension');
        extensionsToDisable.push('All other wallet extensions');
      }
    }

    // Check for runtime errors
    if (this.hasRuntimeErrors()) {
      conflicts.push('Runtime errors detected from browser extensions');
      recommendations.push('Clear browser cache and disable problematic extensions');
      recommendations.push('Try using incognito mode to test without extensions');
    }

    // Check for origin mismatches
    if (this.hasOriginMismatches()) {
      conflicts.push('Origin mismatches detected');
      recommendations.push('Clear browser cookies and localStorage');
      recommendations.push('Ensure you\'re accessing the correct domain');
    }

    const report: ConflictReport = {
      detectedConflicts: conflicts,
      recommendations,
      extensionsToDisable,
      extensionsToKeep
    };

    this.logConflictReport(report);
    return report;
  }

  private getEthereumProviders(): any[] {
    const providers: any[] = [];
    
    if (window.ethereum) {
      providers.push(window.ethereum);
    }

    const ethereumWithProviders = window.ethereum as any;
    if (ethereumWithProviders?.providers) {
      providers.push(...ethereumWithProviders.providers);
    }

    return providers;
  }

  private hasRuntimeErrors(): boolean {
    // Check if we've seen runtime errors recently
    const errorLog = localStorage.getItem('extension-error-log');
    if (errorLog) {
      const errors = JSON.parse(errorLog);
      const recentErrors = errors.filter((error: any) => {
        const errorTime = new Date(error.timestamp);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return errorTime > fiveMinutesAgo;
      });
      
      return recentErrors.some((error: any) => 
        error.message.includes('Invalid runtime') ||
        error.message.includes('content_script.js') ||
        error.message.includes('sendRuntimeMessage')
      );
    }
    
    return false;
  }

  private hasOriginMismatches(): boolean {
    const currentOrigin = window.location.origin;
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://tollchain.com',
      'https://admin.tollchain.com'
    ];

    return !allowedOrigins.includes(currentOrigin);
  }

  private logConflictReport(report: ConflictReport): void {
    console.group('🔍 Browser Extension Conflict Report');
    
    if (report.detectedConflicts.length > 0) {
      console.warn('⚠️ Detected Conflicts:');
      report.detectedConflicts.forEach(conflict => {
        console.warn(`  - ${conflict}`);
      });
    } else {
      console.log('✅ No conflicts detected');
    }

    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }

    if (report.extensionsToDisable.length > 0) {
      console.warn('🚫 Extensions to disable:');
      report.extensionsToDisable.forEach(ext => {
        console.warn(`  - ${ext}`);
      });
    }

    if (report.extensionsToKeep.length > 0) {
      console.log('✅ Extensions to keep:');
      report.extensionsToKeep.forEach(ext => {
        console.log(`  - ${ext}`);
      });
    }

    console.groupEnd();
  }

  public generateUserInstructions(): string[] {
    const instructions = [
      '🔧 Browser Extension Conflict Resolution Instructions:',
      '',
      '1. **Identify Problematic Extensions:**',
      '   - Open Chrome DevTools (F12)',
      '   - Check Console tab for error messages',
      '   - Look for "Invalid runtime", "content_script.js", or "VM9596" errors',
      '',
      '2. **Disable Conflicting Extensions:**',
      '   - Go to chrome://extensions/',
      '   - Disable unused wallet extensions one by one',
      '   - Keep only MetaMask (or your primary wallet)',
      '',
      '3. **Clear Browser Data:**',
      '   - Clear cache and cookies for this site',
      '   - Clear localStorage and sessionStorage',
      '   - Restart the browser',
      '',
      '4. **Test in Incognito Mode:**',
      '   - Open incognito window',
      '   - Install only essential wallet extension',
      '   - Test wallet connection',
      '',
      '5. **If Issues Persist:**',
      '   - Try a different browser',
      '   - Create a new browser profile',
      '   - Use mobile wallet with WalletConnect',
      '',
      '**Recommended Extension Setup:**',
      '- Primary: MetaMask only',
      '- Disabled: All other wallet extensions',
      '- This prevents runtime conflicts and improves stability'
    ];

    return instructions;
  }

  public logError(error: any): void {
    const errorLog = JSON.parse(localStorage.getItem('extension-error-log') || '[]');
    
    errorLog.push({
      message: error.message || error.toString(),
      timestamp: new Date().toISOString(),
      stack: error.stack,
      type: 'extension-conflict'
    });

    // Keep only last 50 errors
    if (errorLog.length > 50) {
      errorLog.splice(0, errorLog.length - 50);
    }

    localStorage.setItem('extension-error-log', JSON.stringify(errorLog));
  }

  public clearErrorLog(): void {
    localStorage.removeItem('extension-error-log');
    console.log('🧹 Extension error log cleared');
  }

  public getErrorLog(): any[] {
    return JSON.parse(localStorage.getItem('extension-error-log') || '[]');
  }

  public showConflictResolutionModal(): void {
    const report = this.detectAndReportConflicts();
    const instructions = this.generateUserInstructions();
    
    // Create a modal to show conflict resolution instructions
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: #1a1a1a;
      color: white;
      padding: 2rem;
      border-radius: 12px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      border: 1px solid #333;
    `;

    const title = document.createElement('h2');
    title.textContent = '🔧 Browser Extension Conflict Resolution';
    title.style.cssText = `
      margin: 0 0 1rem 0;
      color: #fbbf24;
      font-size: 1.5rem;
    `;

    const content = document.createElement('div');
    content.innerHTML = instructions.join('<br>').replace(/\n/g, '<br>');
    content.style.cssText = `
      line-height: 1.6;
      margin-bottom: 1rem;
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
      background: #dc2626;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
    `;
    closeButton.onclick = () => {
      document.body.removeChild(modal);
    };

    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }
}

// Export singleton instance
export const browserExtensionHelper = BrowserExtensionHelper.getInstance();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  void browserExtensionHelper;
}
