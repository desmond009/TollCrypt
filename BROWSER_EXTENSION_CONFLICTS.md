# Browser Extension Conflict Resolution Guide

This guide helps resolve browser extension conflicts that cause wallet connection issues in the TollChain Admin Dashboard.

## Common Error Messages

### 1. "Invalid runtime" Errors
```
Uncaught (in promise) Error: Invalid runtime.
    at sendRuntimeMessage (content_script.js:1:397408)
```

**Cause**: Multiple wallet extensions trying to inject content scripts simultaneously.

**Solution**: 
- Disable unused wallet extensions
- Keep only one primary wallet extension active
- Refresh the page after disabling extensions

### 2. Origin Mismatch Errors
```
origins don't match https://auth.magic.link https://secure.walletconnect.org
```

**Cause**: Different wallet services trying to communicate across different origins.

**Solution**:
- Clear browser cache and cookies
- Disable Magic.link extension if not needed
- Use only WalletConnect or only Magic.link, not both

### 3. Content Script Conflicts
```
contentScript.js:2 origins don't match
```

**Cause**: Conflicting content scripts from different extensions.

**Solution**:
- Disable problematic extensions temporarily
- Use incognito mode to test without extensions
- Clear extension data in browser settings

## Step-by-Step Resolution

### Step 1: Identify Problematic Extensions

1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for error messages mentioning:
   - `content_script.js`
   - `injected.js`
   - `Invalid runtime`
   - `origins don't match`

### Step 2: Disable Conflicting Extensions

1. Go to `chrome://extensions/` (Chrome) or `about:addons` (Firefox)
2. Disable extensions one by one:
   - MetaMask
   - Coinbase Wallet
   - Trust Wallet
   - Rainbow Wallet
   - Magic.link
   - Any other wallet extensions

3. Test the application after each disable
4. Re-enable only the extensions you need

### Step 3: Clear Browser Data

1. Clear cache and cookies for the site
2. Clear localStorage and sessionStorage
3. Restart the browser

### Step 4: Use Incognito Mode

1. Open incognito/private browsing window
2. Install only the essential wallet extension
3. Test wallet connection

## Recommended Extension Setup

### For Development
- **Primary**: MetaMask only
- **Secondary**: None (to avoid conflicts)
- **Disabled**: All other wallet extensions

### For Production
- **Primary**: MetaMask
- **Secondary**: Coinbase Wallet (if needed)
- **Disabled**: Trust Wallet, Rainbow Wallet, Magic.link

## Browser-Specific Solutions

### Chrome
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" to test extensions individually
4. Use Chrome's extension isolation features

### Firefox
1. Go to `about:addons`
2. Use "Debug Add-ons" for testing
3. Enable "Multi-process" for better isolation

### Safari
1. Go to Safari > Preferences > Extensions
2. Disable unused extensions
3. Use "Develop" menu for debugging

## Advanced Troubleshooting

### 1. Extension Isolation
```javascript
// Check for multiple ethereum providers
console.log('Ethereum providers:', window.ethereum?.providers?.length || 1);
```

### 2. Clear Extension Data
```javascript
// Clear wallet connection cache
localStorage.removeItem('wagmi.store');
sessionStorage.removeItem('wagmi.store');
```

### 3. Force Extension Refresh
1. Disable extension
2. Wait 5 seconds
3. Re-enable extension
4. Refresh the page

## Prevention Tips

1. **Use Only One Wallet Extension**: Keep only your primary wallet extension active
2. **Regular Cleanup**: Periodically disable unused extensions
3. **Incognito Testing**: Test wallet connections in incognito mode
4. **Extension Updates**: Keep extensions updated to latest versions
5. **Browser Updates**: Keep browser updated for better extension compatibility

## Emergency Solutions

If all else fails:

1. **Fresh Browser Profile**: Create a new browser profile
2. **Different Browser**: Try a different browser entirely
3. **Hardware Wallet**: Use a hardware wallet with Web3Modal
4. **Mobile Wallet**: Use mobile wallet with WalletConnect

## Support

If you continue to experience issues:

1. Check browser console for specific error messages
2. Note which extensions are installed
3. Try the resolution steps above
4. Contact support with specific error details

## Extension Compatibility Matrix

| Extension | MetaMask | Coinbase | Trust | Rainbow | Magic.link |
|-----------|----------|----------|-------|---------|------------|
| MetaMask  | ✅       | ⚠️       | ⚠️     | ⚠️       | ❌         |
| Coinbase  | ⚠️       | ✅       | ⚠️     | ⚠️       | ❌         |
| Trust     | ⚠️       | ⚠️       | ✅     | ⚠️       | ❌         |
| Rainbow   | ⚠️       | ⚠️       | ⚠️     | ✅       | ❌         |
| Magic.link| ❌       | ❌       | ❌     | ❌       | ✅         |

**Legend**:
- ✅ Compatible
- ⚠️ May cause conflicts
- ❌ Known conflicts
