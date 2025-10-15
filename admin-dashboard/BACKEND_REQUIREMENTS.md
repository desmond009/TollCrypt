# Backend API Requirements for Admin Portal

This document outlines the backend API endpoints and services required to support the comprehensive admin portal functionality.

## 🔐 Authentication & Authorization

### Endpoints
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/profile
POST /api/auth/metamask-login
POST /api/auth/reset-password
POST /api/auth/verify-2fa
```

### Required Features
- JWT token generation and validation
- Role-based access control middleware
- MetaMask signature verification
- Session management with auto-logout
- Password reset functionality
- 2FA support (optional)

## 📊 Dashboard & Analytics

### Endpoints
```
GET  /api/dashboard/stats
GET  /api/analytics/revenue
GET  /api/analytics/transactions
GET  /api/analytics/vehicles
GET  /api/analytics/performance
GET  /api/analytics/vehicle-types
```

### Required Features
- Real-time statistics calculation
- Date range filtering
- Plaza-specific analytics
- Vehicle type distribution
- Performance metrics
- Revenue trend analysis

## 🚗 Vehicle Management

### Endpoints
```
GET    /api/vehicles
GET    /api/vehicles/:id
POST   /api/vehicles
PUT    /api/vehicles/:id
DELETE /api/vehicles/:id
PATCH  /api/vehicles/:id/blacklist
PATCH  /api/vehicles/:id/status
GET    /api/vehicles/search
GET    /api/vehicles/export
```

### Required Features
- Vehicle CRUD operations
- Search and filtering
- Blacklist management
- Status updates
- CSV export functionality
- Pagination support

## 🏢 Plaza Management

### Endpoints
```
GET    /api/plazas
GET    /api/plazas/:id
POST   /api/plazas
PUT    /api/plazas/:id
DELETE /api/plazas/:id
PATCH  /api/plazas/:id/status
GET    /api/plazas/:id/analytics
```

### Required Features
- Plaza CRUD operations
- GPS coordinate validation
- Toll rate configuration
- Operator assignment
- Operating hours management
- Plaza-specific analytics

## 💰 Transaction Processing

### Endpoints
```
GET    /api/transactions
GET    /api/transactions/:id
POST   /api/transactions
GET    /api/transactions/recent
GET    /api/transactions/export
PATCH  /api/transactions/:id/status
```

### Required Features
- Transaction logging
- Status tracking
- Blockchain integration
- Receipt generation
- Export functionality
- Real-time updates via WebSocket

## 👥 User Management

### Endpoints
```
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
PATCH  /api/users/:id/status
GET    /api/operators
```

### Required Features
- User CRUD operations
- Operator management
- Role assignment
- Permission management
- User activity tracking

## 🔍 QR Code Processing

### Endpoints
```
POST   /api/qr/verify
POST   /api/qr/process
GET    /api/qr/validate
```

### Required Features
- QR code data validation
- Vehicle registration verification
- Balance checking
- Blacklist verification
- Transaction processing

## 📈 Real-time Updates

### WebSocket Events
```javascript
// Client to Server
socket.emit('authenticate', { userId, userRole });
socket.emit('join_plaza', { plazaId });
socket.emit('leave_plaza', { plazaId });

// Server to Client
socket.on('toll_payment_update', (data) => {});
socket.on('vehicle_detected', (data) => {});
socket.on('system_alert', (data) => {});
socket.on('plaza_status_update', (data) => {});
socket.on('transaction_update', (data) => {});
```

## 🔗 Blockchain Integration

### Required Services
- **Blockchain Service**: Handle smart contract interactions
- **Wallet Service**: Manage wallet operations
- **Transaction Service**: Process blockchain transactions
- **Balance Service**: Check wallet balances
- **Contract Service**: Interact with deployed contracts

### Smart Contract Functions
```solidity
// TollCollection Contract
function processTollPayment(address userWallet, string memory vehicleId, uint256 amount, uint256 timestamp) external returns (bool);
function getVehicleRegistration(string memory vehicleId) external view returns (bool isRegistered, address owner, string memory vehicleType);
function getTollRate(string memory vehicleType) external view returns (uint256);
function isVehicleBlacklisted(string memory vehicleId) external view returns (bool);

// USDC Contract
function balanceOf(address account) external view returns (uint256);
function transfer(address to, uint256 amount) external returns (bool);
function transferFrom(address from, address to, uint256 amount) external returns (bool);
```

## 🗄️ Database Schema

### Collections/Tables Required
- **users**: Admin users and operators
- **vehicles**: Registered vehicles
- **plazas**: Toll plazas
- **transactions**: Transaction records
- **toll_rates**: Dynamic toll rates
- **blacklist**: Blacklisted vehicles
- **audit_logs**: System audit trail
- **notifications**: System notifications

### Sample MongoDB Schemas
```javascript
// User Schema
{
  _id: ObjectId,
  email: String,
  password: String,
  name: String,
  role: String, // 'super_admin', 'admin', 'operator', 'auditor', 'analyst'
  isActive: Boolean,
  tollPlaza: String,
  walletAddress: String,
  permissions: Object,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}

// Vehicle Schema
{
  _id: ObjectId,
  vehicleId: String,
  vehicleType: String,
  owner: String,
  ownerHash: String,
  walletAddress: String,
  isActive: Boolean,
  isBlacklisted: Boolean,
  registrationDate: Date,
  lastTransactionDate: Date,
  totalTransactions: Number,
  totalAmount: Number,
  currentBalance: Number,
  status: String,
  createdAt: Date,
  updatedAt: Date
}

// Transaction Schema
{
  _id: ObjectId,
  vehicleId: String,
  vehicleType: String,
  owner: String,
  walletAddress: String,
  amount: Number,
  plazaId: String,
  adminId: String,
  transactionHash: String,
  status: String, // 'pending', 'success', 'failed'
  timestamp: Date,
  gasUsed: Number,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}

// Plaza Schema
{
  _id: ObjectId,
  name: String,
  location: String,
  coordinates: {
    lat: Number,
    lng: Number
  },
  status: String, // 'active', 'maintenance', 'inactive'
  tollRates: Object,
  operatingHours: {
    start: String,
    end: String
  },
  assignedOperators: [String],
  createdAt: Date,
  updatedAt: Date
}
```

## 🔧 Middleware Requirements

### Authentication Middleware
```javascript
const authenticateToken = (req, res, next) => {
  // JWT token validation
  // Role-based access control
  // MetaMask signature verification
};

const requireRole = (roles) => (req, res, next) => {
  // Check user role against required roles
};

const requirePermission = (permission) => (req, res, next) => {
  // Check user permissions
};
```

### Validation Middleware
```javascript
const validateQRCode = (req, res, next) => {
  // QR code data validation
  // Vehicle registration check
  // Balance verification
};

const validateTransaction = (req, res, next) => {
  // Transaction data validation
  // Amount validation
  // Plaza verification
};
```

## 📊 Caching Strategy

### Redis Cache Keys
- `dashboard:stats:${date}`: Dashboard statistics
- `analytics:revenue:${period}`: Revenue analytics
- `vehicles:active`: Active vehicles list
- `plazas:status`: Plaza status information
- `transactions:recent:${limit}`: Recent transactions

### Cache TTL
- Dashboard stats: 5 minutes
- Analytics data: 1 hour
- Vehicle data: 30 minutes
- Plaza data: 1 hour
- Transaction data: 10 minutes

## 🚀 Deployment Considerations

### Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/tollchain
REDIS_URL=redis://localhost:6379

# Blockchain
BASE_SEPOLIA_RPC=https://sepolia.base.org
TOLL_CONTRACT_ADDRESS=0x...
USDC_CONTRACT_ADDRESS=0x...
PRIVATE_KEY=0x...

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your-refresh-secret

# API
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### Docker Configuration
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 📝 API Documentation

### Response Format
```javascript
// Success Response
{
  success: true,
  data: any,
  message?: string,
  timestamp: string
}

// Error Response
{
  success: false,
  error: string,
  message: string,
  timestamp: string,
  code?: string
}
```

### Pagination
```javascript
{
  data: any[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    pages: number
  }
}
```

## 🔍 Testing Requirements

### Unit Tests
- Authentication service tests
- Blockchain service tests
- Database operation tests
- Validation middleware tests

### Integration Tests
- API endpoint tests
- WebSocket connection tests
- Database integration tests
- Blockchain integration tests

### End-to-End Tests
- Complete transaction flow
- QR code scanning process
- Admin portal workflows
- Real-time updates

---

This backend implementation will provide a robust foundation for the admin portal, ensuring scalability, security, and real-time functionality for the toll collection system.
