# 🚗 TollCrypt Frontend

The user-facing React application for the TollCrypt blockchain-based toll collection system. This frontend provides an intuitive interface for vehicle registration, toll payments, and transaction management.

## 🌟 Features

### 🚙 Vehicle Management
- **Vehicle Registration**: Register vehicles with license plate and Aadhaar verification
- **QR Code Generation**: Generate unique QR codes for each vehicle
- **Vehicle History**: View complete transaction history
- **Status Management**: Track vehicle status and blacklist management

### 💰 Payment System
- **Wallet Integration**: Connect MetaMask and other Web3 wallets
- **Top-Up Wallets**: Pre-fund accounts for seamless payments
- **Transaction History**: Complete payment and transaction logs
- **Receipt Generation**: Digital receipts for all transactions

### 🔐 Privacy & Security
- **Aadhaar Verification**: Privacy-preserving identity verification
- **Zero-Knowledge Proofs**: Anonymous authentication
- **Secure Transactions**: End-to-end encrypted communications
- **Session Management**: Secure login and logout

### 📱 User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Live transaction status updates
- **Intuitive Interface**: Easy-to-use design for all users
- **Accessibility**: WCAG 2.1 compliant design

## 🛠️ Technology Stack

### Core Technologies
- **React 19** - Modern UI framework with latest features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing

### Blockchain Integration
- **Wagmi** - React hooks for Ethereum
- **Web3Modal** - Wallet connection UI
- **Ethers.js** - Ethereum library
- **Viem** - TypeScript interface for Ethereum

### State Management
- **React Query** - Server state management
- **Zustand** - Client state management
- **React Hook Form** - Form state management

### UI Components
- **Headless UI** - Unstyled accessible components
- **Heroicons** - Beautiful SVG icons
- **React Hot Toast** - Toast notifications
- **React Modal** - Modal dialogs

### QR Code & Scanning
- **QRCode** - QR code generation
- **React QR Scanner** - QR code scanning
- **HTML5 QR Code** - Advanced QR scanning

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MetaMask or compatible wallet
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/tollcrypt.git
   cd tollcrypt/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm start
   # or
   yarn start
   ```

The application will open at `http://localhost:3000`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=ws://localhost:3001

# Blockchain Configuration
REACT_APP_BLOCKCHAIN_NETWORK=sepolia
REACT_APP_CONTRACT_ADDRESS=0x...
REACT_APP_USDC_ADDRESS=0x...

# WalletConnect Configuration
REACT_APP_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# External Services
REACT_APP_ETHERSCAN_URL=https://sepolia.etherscan.io
REACT_APP_POLYGONSCAN_URL=https://mumbai.polygonscan.com

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_REAL_TIME_UPDATES=true
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_DEBUG_MODE=false
```

## 📁 Project Structure

```
frontend/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── favicon.ico
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Common components
│   │   ├── forms/          # Form components
│   │   ├── layout/         # Layout components
│   │   └── ui/             # UI components
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   ├── services/           # API services
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   ├── config/             # Configuration files
│   ├── styles/             # Global styles
│   ├── App.tsx             # Main App component
│   └── index.tsx           # Entry point
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 🎨 UI Components

### Core Components
- **Header**: Navigation and user menu
- **Footer**: Links and information
- **Sidebar**: Navigation menu
- **Modal**: Reusable modal dialogs
- **Toast**: Notification system
- **Loading**: Loading states and spinners

### Form Components
- **Input**: Text input fields
- **Select**: Dropdown selections
- **Checkbox**: Checkbox inputs
- **Button**: Action buttons
- **Form**: Form wrapper with validation

### Blockchain Components
- **WalletConnect**: Wallet connection modal
- **TransactionStatus**: Transaction progress
- **QRCode**: QR code display
- **QRScanner**: QR code scanner

## 🔧 Development

### Available Scripts

```bash
# Development
npm start              # Start development server
npm run dev            # Start with hot reload

# Building
npm run build          # Build for production
npm run build:analyze  # Build with bundle analysis

# Testing
npm test               # Run tests
npm run test:coverage  # Run tests with coverage
npm run test:watch     # Run tests in watch mode

# Linting
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues
npm run type-check     # Run TypeScript checks

# Code Quality
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting
```

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Install pre-commit hooks
npm run prepare

# Format code
npm run format

# Check formatting
npm run format:check
```

## 🧪 Testing

### Test Structure
```
src/
├── __tests__/          # Test files
├── components/         # Component tests
├── hooks/             # Hook tests
├── utils/             # Utility tests
└── setupTests.ts      # Test setup
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test
npm test -- --testNamePattern="VehicleRegistration"

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Examples
```typescript
// Component test
import { render, screen } from '@testing-library/react';
import { VehicleRegistration } from './VehicleRegistration';

test('renders vehicle registration form', () => {
  render(<VehicleRegistration />);
  expect(screen.getByText('Register Vehicle')).toBeInTheDocument();
});

// Hook test
import { renderHook } from '@testing-library/react';
import { useWallet } from './useWallet';

test('should connect wallet', () => {
  const { result } = renderHook(() => useWallet());
  expect(result.current.isConnected).toBe(false);
});
```

## 🚀 Deployment

### Production Build
```bash
# Build for production
npm run build

# Build with environment variables
REACT_APP_API_URL=https://api.tollcrypt.com npm run build
```

### Docker Deployment
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment-Specific Builds
```bash
# Development
npm run build:dev

# Staging
npm run build:staging

# Production
npm run build:prod
```

## 📱 Mobile Support

### Responsive Design
- **Mobile First**: Designed for mobile devices
- **Breakpoints**: Tailwind CSS responsive breakpoints
- **Touch Friendly**: Optimized for touch interactions
- **Performance**: Optimized for mobile performance

### PWA Features
- **Service Worker**: Offline functionality
- **App Manifest**: Installable web app
- **Push Notifications**: Real-time updates
- **Background Sync**: Offline data sync

## 🔐 Security

### Security Measures
- **Content Security Policy**: XSS protection
- **HTTPS Only**: Secure connections
- **Input Validation**: Client-side validation
- **Secure Headers**: Security headers

### Privacy Features
- **No Tracking**: No analytics or tracking
- **Local Storage**: Minimal data storage
- **Secure Communication**: Encrypted API calls
- **Data Minimization**: Only necessary data collection

## 🐛 Troubleshooting

### Common Issues

1. **Wallet Connection Issues**
   ```bash
   # Clear browser cache
   # Reset MetaMask
   # Check network configuration
   ```

2. **Build Errors**
   ```bash
   # Clear node_modules
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **TypeScript Errors**
   ```bash
   # Check TypeScript configuration
   npm run type-check
   ```

### Debug Mode
```bash
# Enable debug mode
REACT_APP_DEBUG_MODE=true npm start
```

## 📊 Performance

### Optimization Features
- **Code Splitting**: Lazy loading of components
- **Bundle Analysis**: Webpack bundle analyzer
- **Image Optimization**: Optimized images
- **Caching**: Efficient caching strategies

### Performance Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Review Process
- All code must be reviewed
- Tests must pass
- Code must be formatted
- Documentation must be updated

## 📚 Documentation

- **API Documentation**: [API Docs](https://docs.tollcrypt.com/api)
- **Component Library**: [Storybook](https://storybook.tollcrypt.com)
- **Design System**: [Figma](https://figma.com/tollcrypt)
- **User Guide**: [User Manual](https://docs.tollcrypt.com/user-guide)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/tollcrypt/issues)
- **Discord**: [Community](https://discord.gg/tollcrypt)
- **Email**: frontend@tollcrypt.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**TollCrypt Frontend** - Modern, secure, and user-friendly toll collection interface.

Made with ❤️ by the TollCrypt Team