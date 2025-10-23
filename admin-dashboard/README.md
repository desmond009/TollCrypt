# 🛡️ TollCrypt Admin Dashboard

The administrative control panel for the TollCrypt blockchain-based toll collection system. This React-based dashboard provides comprehensive management tools for system administrators, plaza operators, and auditors.

## 🌟 Features

### 👥 User Management
- **Admin User Management**: Create, update, and manage admin users
- **Role-Based Access Control**: Granular permissions system
- **User Activity Monitoring**: Track user actions and login history
- **Session Management**: Monitor active sessions and security

### 💰 Financial Management
- **Transaction Monitoring**: Real-time transaction tracking
- **Revenue Analytics**: Comprehensive financial reporting
- **Payment Processing**: Monitor and manage payments
- **Refund Management**: Handle refund requests and processing

### 🛣️ Plaza Management
- **Plaza Configuration**: Set up and manage toll plazas
- **Rate Management**: Configure toll rates and pricing
- **Traffic Monitoring**: Real-time traffic and usage analytics
- **Equipment Status**: Monitor hardware and system health

### 🔐 Security & Compliance
- **Audit Logs**: Complete system activity tracking
- **Security Monitoring**: Threat detection and prevention
- **Compliance Reporting**: Regulatory compliance tools
- **Data Export**: Secure data export and backup

### 📊 Analytics & Reporting
- **Real-time Dashboard**: Live system monitoring
- **Performance Metrics**: System health and performance
- **Custom Reports**: Configurable reporting system
- **Data Visualization**: Interactive charts and graphs

## 🛠️ Technology Stack

### Core Technologies
- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing

### State Management
- **React Query** - Server state management
- **Zustand** - Client state management
- **React Hook Form** - Form state management

### UI Components
- **Headless UI** - Unstyled accessible components
- **Heroicons** - Beautiful SVG icons
- **React Table** - Data tables
- **Recharts** - Data visualization

### Blockchain Integration
- **Wagmi** - React hooks for Ethereum
- **Web3Modal** - Wallet connection UI
- **Ethers.js** - Ethereum library

### Development Tools
- **React Scripts** - Build tooling
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Admin access to TollCrypt system
- MetaMask or compatible wallet

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/tollcrypt.git
   cd tollcrypt/admin-dashboard
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

The dashboard will open at `http://localhost:3003`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the admin-dashboard directory:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=ws://localhost:3001

# Application Configuration
REACT_APP_APP_NAME=TollCrypt Admin
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=development

# Authentication Configuration
REACT_APP_AUTH_ENABLED=true
REACT_APP_SESSION_TIMEOUT=3600000

# Blockchain Configuration
REACT_APP_BLOCKCHAIN_NETWORK=sepolia
REACT_APP_CONTRACT_ADDRESS=0x...
REACT_APP_USDC_ADDRESS=0x....

# WalletConnect Configuration
REACT_APP_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# External Services
REACT_APP_ETHERSCAN_URL=https://sepolia.etherscan.io
REACT_APP_POLYGONSCAN_URL=https://mumbai.polygonscan.com

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_REAL_TIME_UPDATES=true
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_EXPORT=true

# UI Configuration
REACT_APP_THEME=dark
REACT_APP_LANGUAGE=en
REACT_APP_TIMEZONE=UTC

# Development Configuration
REACT_APP_DEBUG_MODE=false
REACT_APP_MOCK_DATA=false
REACT_APP_LOG_LEVEL=info
```

## 📁 Project Structure

```
admin-dashboard/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── favicon.ico
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Common components
│   │   ├── forms/          # Form components
│   │   ├── layout/         # Layout components
│   │   ├── charts/         # Chart components
│   │   └── tables/         # Table components
│   ├── pages/              # Page components
│   │   ├── Dashboard/      # Dashboard pages
│   │   ├── Users/          # User management
│   │   ├── Transactions/   # Transaction management
│   │   ├── Plazas/         # Plaza management
│   │   └── Settings/       # System settings
│   ├── hooks/              # Custom React hooks
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

### Layout Components
- **TopNavigation**: Main navigation bar
- **Sidebar**: Side navigation menu
- **Footer**: Dashboard footer
- **Layout**: Main layout wrapper

### Dashboard Components
- **LiveDashboard**: Real-time monitoring
- **StatsCards**: Key metrics display
- **Charts**: Data visualization
- **Tables**: Data tables with sorting/filtering

### Management Components
- **UserManagement**: User administration
- **TransactionMonitoring**: Transaction tracking
- **PlazaManagement**: Plaza configuration
- **SystemSettings**: System configuration

### Form Components
- **UserForm**: User creation/editing
- **PlazaForm**: Plaza configuration
- **SettingsForm**: System settings
- **ReportForm**: Report generation

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
├── pages/             # Page tests
├── hooks/             # Hook tests
├── utils/             # Utility tests
└── setupTests.ts      # Test setup
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test
npm test -- --testNamePattern="UserManagement"

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Examples
```typescript
// Component test
import { render, screen } from '@testing-library/react';
import { UserManagement } from './UserManagement';

test('renders user management table', () => {
  render(<UserManagement />);
  expect(screen.getByText('User Management')).toBeInTheDocument();
});

// Hook test
import { renderHook } from '@testing-library/react';
import { useUsers } from './useUsers';

test('should fetch users', () => {
  const { result } = renderHook(() => useUsers());
  expect(result.current.users).toEqual([]);
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

## 📊 Analytics & Monitoring

### Real-time Features
- **Live Dashboard**: Real-time system monitoring
- **WebSocket Integration**: Live data updates
- **Event Streaming**: Real-time event processing
- **Alert System**: Automated notifications

### Data Visualization
- **Charts**: Interactive charts and graphs
- **Tables**: Sortable and filterable data tables
- **Maps**: Geographic data visualization
- **Reports**: Custom report generation

### Performance Monitoring
- **System Health**: Real-time system status
- **Performance Metrics**: Response times and throughput
- **Error Tracking**: Error monitoring and alerting
- **User Activity**: User behavior analytics

## 🔐 Security Features

### Access Control
- **Role-Based Permissions**: Granular access control
- **Multi-Factor Authentication**: Enhanced security
- **Session Management**: Secure session handling
- **Audit Logging**: Complete activity tracking

### Data Protection
- **Encryption**: Data encryption at rest and in transit
- **Secure Communication**: HTTPS/TLS encryption
- **Input Validation**: Client and server-side validation
- **XSS Protection**: Cross-site scripting prevention

### Compliance
- **GDPR Compliance**: Data protection regulations
- **Audit Trails**: Complete activity logging
- **Data Retention**: Configurable data retention policies
- **Privacy Controls**: User privacy management

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Issues**
   ```bash
   # Clear browser cache
   # Check token expiration
   # Verify API connectivity
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

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px
- **Large Desktop**: > 1440px

### Mobile Features
- **Touch-Friendly**: Optimized for touch interactions
- **Responsive Tables**: Mobile-optimized data tables
- **Swipe Gestures**: Touch navigation
- **Offline Support**: Limited offline functionality

## 🎯 User Roles

### Super Admin
- Full system access
- User management
- System configuration
- Security settings

### Plaza Operator
- Plaza management
- Transaction monitoring
- Equipment status
- Local analytics

### Auditor
- Transaction auditing
- Compliance reporting
- Data export
- Audit logs

### Analyst
- Analytics access
- Report generation
- Data visualization
- Performance monitoring

## 📈 Performance

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
- **User Guide**: [Admin Manual](https://docs.tollcrypt.com/admin-guide)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/tollcrypt/issues)
- **Discord**: [Community](https://discord.gg/tollcrypt)
- **Email**: admin@tollcrypt.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**TollCrypt Admin Dashboard** - Comprehensive administrative control panel for toll collection management.

Made with ❤️ by the TollCrypt Team