# TollChain Admin Portal

A comprehensive, production-ready admin portal for a blockchain-based toll collection system using QR code scanning, smart contracts on Base Sepolia testnet, and real-time transaction monitoring.

## 🚀 Features

### 1. Admin Authentication & Authorization
- **Secure JWT Authentication** with role-based access control
- **MetaMask Integration** for blockchain operations
- **Role-based Permissions**: Super Admin, Toll Operator, Auditor, Analyst
- **Session Management** with auto-logout on idle
- **Password Reset** and 2FA support

### 2. QR Code Scanner Module
- **Full-screen QR Scanner** using html5-qrcode
- **Real-time Detection** with visual feedback (green box on successful scan)
- **Multi-format Support**: QR codes, barcodes, and other formats
- **Manual Entry Fallback** if QR scan fails
- **Sound/Vibration Feedback** on successful scan
- **Camera Switching** between front and back cameras

### 3. Transaction Processing Engine
- **Blockchain Integration** with Base Sepolia testnet
- **Real-time Balance Checking** using ethers.js
- **Smart Contract Integration** for toll processing
- **Vehicle Registration Verification**
- **Blacklist Checking** for fraud prevention
- **Transaction Status Tracking**: Processing → Success/Failed
- **Block Explorer Integration** for transaction verification
- **Digital Receipt Generation** with QR codes

### 4. Live Dashboard
- **Real-time Transaction Feed** (auto-updating every 5 seconds)
- **Statistics Cards**: Total Vehicles, Revenue, Wait Time, Success Rate
- **Interactive Charts**: Revenue trends, vehicle type distribution
- **Plaza Performance Monitoring**
- **System Health Indicators**
- **Alert Notifications** for failed transactions and system errors

### 5. Vehicle & User Management
- **Comprehensive Vehicle Database** with search and filters
- **Vehicle Details**: Owner info, wallet address, transaction history
- **Blacklist/Whitelist Management** for fraud prevention
- **User Wallet Top-up History**
- **Dispute Management** with notes and resolution tracking
- **CSV Export** functionality

### 6. Toll Plaza Management
- **Plaza CRUD Operations** with GPS coordinates
- **Toll Rate Configuration** by vehicle category
- **Operating Hours Management**
- **Operator Assignment** with permissions
- **Plaza-specific Analytics** and performance metrics
- **Maintenance Scheduling**

### 7. Analytics & Reporting
- **Custom Date Range** reporting
- **Revenue Reports**: Daily, Weekly, Monthly, Yearly
- **Traffic Analysis**: Peak hours, seasonal trends
- **Payment Method Breakdown**: Blockchain vs Cash
- **Fraud Detection Alerts**
- **Export Capabilities**: CSV, PDF with charts
- **Audit Trail**: Complete admin action logs

## 🛠️ Technology Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Chart.js** & **Recharts** for data visualization
- **React Hook Form** for form management
- **Ethers.js** for blockchain integration
- **Socket.io** for real-time updates
- **HTML5 QR Code Scanner** for QR code detection

### Backend Integration
- **RESTful APIs** for data management
- **WebSocket** for real-time updates
- **JWT Authentication** with refresh tokens
- **MongoDB** for data persistence
- **Blockchain Smart Contracts** on Base Sepolia

### Blockchain
- **Base Sepolia Testnet** for smart contract deployment
- **Ethers.js v6** for blockchain interactions
- **USDC** for toll payments
- **Smart Contract Integration** for transaction processing

## 📦 Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Update the following environment variables:
   ```env
   REACT_APP_API_URL=http://localhost:3001
   REACT_APP_TOLL_CONTRACT_ADDRESS=0x...
   REACT_APP_USDC_CONTRACT_ADDRESS=0x...
   REACT_APP_BASE_SEPOLIA_RPC=https://sepolia.base.org
   ```

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### MetaMask Setup
1. Install MetaMask browser extension
2. Add Base Sepolia testnet:
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.basescan.org

### Smart Contract Configuration
Update contract addresses in environment variables:
- `REACT_APP_TOLL_CONTRACT_ADDRESS`: Your deployed TollCollection contract
- `REACT_APP_USDC_CONTRACT_ADDRESS`: USDC token contract on Base Sepolia

## 🚦 Usage

### Admin Login
1. **Email/Password Login**: Use admin credentials
2. **MetaMask Login**: Connect wallet and sign message for authentication

### QR Code Scanning
1. Navigate to "QR Scanner" in the sidebar
2. Click "Start Scanning" to activate camera
3. Position QR code within the scanning area
4. System automatically processes valid QR codes

### Transaction Processing
1. Scan vehicle QR code
2. System validates vehicle registration and balance
3. Admin confirms or modifies toll amount
4. Transaction is processed on blockchain
5. Digital receipt is generated

### Vehicle Management
1. Navigate to "Vehicles" section
2. Use search and filters to find specific vehicles
3. View detailed vehicle information
4. Manage blacklist status and vehicle status

### Plaza Management
1. Navigate to "Plazas" section
2. Add/edit toll plazas with GPS coordinates
3. Configure toll rates by vehicle type
4. Assign operators to specific plazas

### Analytics & Reporting
1. Navigate to "Analytics" section
2. Select report type and date range
3. View interactive charts and statistics
4. Export reports as CSV or PDF

## 🔒 Security Features

- **JWT Token Authentication** with refresh mechanism
- **Role-based Access Control** with granular permissions
- **MetaMask Signature Verification** for blockchain operations
- **QR Code Validation** with timestamp and signature verification
- **Input Sanitization** and validation
- **HTTPS Enforcement** in production
- **Session Timeout** for security

## 📊 Monitoring & Alerts

- **Real-time Transaction Monitoring**
- **System Health Indicators**
- **Failed Transaction Alerts**
- **Low Balance Warnings**
- **Fraud Detection Notifications**
- **Performance Metrics Tracking**

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Docker Deployment
```bash
docker build -t tollchain-admin .
docker run -p 3000:3000 tollchain-admin
```

### Environment Variables for Production
```env
REACT_APP_API_URL=https://api.tollchain.com
REACT_APP_TOLL_CONTRACT_ADDRESS=0x...
REACT_APP_USDC_CONTRACT_ADDRESS=0x...
REACT_APP_BASE_SEPOLIA_RPC=https://sepolia.base.org
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Updates

### Version 1.0.0
- Initial release with core functionality
- QR code scanning and transaction processing
- Vehicle and plaza management
- Analytics and reporting
- MetaMask integration
- Real-time monitoring

---

**Built with ❤️ for the TollChain ecosystem**