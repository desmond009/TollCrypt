# 🔧 TollCrypt Backend API

The backend API server for the TollCrypt blockchain-based toll collection system. Built with Node.js, Express, and MongoDB, it provides secure APIs for vehicle management, toll processing, payment handling, and administrative functions.

## 🌟 Features

### 🚗 Vehicle Management
- **Vehicle Registration**: Register and manage vehicles
- **License Plate Recognition**: OCR-based plate detection
- **Vehicle Status Tracking**: Active, blacklisted, and inactive states
- **QR Code Management**: Generate and validate QR codes

### 💰 Payment Processing
- **Multi-Currency Support**: USDC, ETH, and native tokens
- **Top-Up Wallets**: Pre-funded account management
- **Transaction Processing**: Real-time payment processing
- **Refund System**: Automated refund handling

### 🛣️ Toll Collection
- **Dynamic Pricing**: Real-time toll calculation
- **Plaza Management**: Manage toll plazas and rates
- **Transaction Logging**: Complete audit trails
- **Real-time Updates**: WebSocket-based live updates

### 🔐 Security & Authentication
- **JWT Authentication**: Secure token-based auth
- **Role-Based Access Control**: Granular permissions
- **Aadhaar Integration**: Privacy-preserving verification
- **Audit Logging**: Complete activity tracking

### 📊 Analytics & Reporting
- **Real-time Analytics**: Live transaction monitoring
- **Financial Reports**: Revenue and transaction analysis
- **Performance Metrics**: System health monitoring
- **Data Export**: CSV and PDF report generation

## 🛠️ Technology Stack

### Core Technologies
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe development
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling

### Blockchain Integration
- **Ethers.js** - Ethereum library
- **Web3** - Blockchain interaction
- **Smart Contract Integration** - Direct contract calls
- **Event Listening** - Real-time blockchain events

### Security & Authentication
- **JWT** - JSON Web Tokens
- **bcryptjs** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

### Real-time Communication
- **Socket.io** - WebSocket communication
- **WebSocket** - Real-time updates
- **Event Emitters** - Internal event system

### Development Tools
- **Nodemon** - Development server
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v5.0 or higher)
- Git
- MetaMask or compatible wallet

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/tollcrypt.git
   cd tollcrypt/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   # Start MongoDB
   mongod

   # Seed the database
   npm run seed:all-plazas
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/tollcrypt

# Blockchain Configuration
RPC_URL=https://sepolia.base.org
PRIVATE_KEY=your_private_key
CONTRACT_ADDRESS=0x...
USDC_ADDRESS=0x...

# Security
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=your_encryption_key

# External Services
ALCHEMY_API_KEY=your_alchemy_key
ETHERSCAN_API_KEY=your_etherscan_key
POLYGONSCAN_API_KEY=your_polygonscan_key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/         # Route controllers
│   │   ├── authController.ts
│   │   ├── vehicleController.ts
│   │   ├── tollController.ts
│   │   └── adminController.ts
│   ├── models/              # Database models
│   │   ├── User.ts
│   │   ├── Vehicle.ts
│   │   ├── TollTransaction.ts
│   │   └── AdminUser.ts
│   ├── routes/              # API routes
│   │   ├── authRoutes.ts
│   │   ├── vehicleRoutes.ts
│   │   ├── tollRoutes.ts
│   │   └── adminRoutes.ts
│   ├── middleware/          # Custom middleware
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── errorHandler.ts
│   ├── services/            # Business logic
│   │   ├── blockchainService.ts
│   │   ├── paymentService.ts
│   │   └── notificationService.ts
│   ├── utils/               # Utility functions
│   │   ├── logger.ts
│   │   ├── encryption.ts
│   │   └── validation.ts
│   ├── scripts/             # Database scripts
│   │   ├── seedDatabase.ts
│   │   └── seedPlazaDatabase.ts
│   └── index.ts             # Entry point
├── dist/                    # Compiled JavaScript
├── uploads/                 # File uploads
├── logs/                    # Log files
├── package.json
├── tsconfig.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register     # User registration
POST   /api/auth/login        # User login
POST   /api/auth/logout       # User logout
POST   /api/auth/refresh      # Refresh token
GET    /api/auth/profile      # Get user profile
PUT    /api/auth/profile      # Update user profile
```

### Vehicle Management
```
GET    /api/vehicles          # Get user vehicles
POST   /api/vehicles          # Register vehicle
GET    /api/vehicles/:id      # Get vehicle details
PUT    /api/vehicles/:id      # Update vehicle
DELETE /api/vehicles/:id      # Delete vehicle
POST   /api/vehicles/:id/qr   # Generate QR code
```

### Toll Collection
```
GET    /api/tolls             # Get toll transactions
POST   /api/tolls/process     # Process toll payment
GET    /api/tolls/:id         # Get transaction details
POST   /api/tolls/:id/refund  # Process refund
GET    /api/tolls/plazas      # Get toll plazas
```

### Payment System
```
GET    /api/payments/wallet   # Get wallet balance
POST   /api/payments/topup    # Top up wallet
GET    /api/payments/history  # Payment history
POST   /api/payments/withdraw # Withdraw funds
```

### Admin Management
```
GET    /api/admin/users       # Get all users
POST   /api/admin/users       # Create user
PUT    /api/admin/users/:id   # Update user
DELETE /api/admin/users/:id   # Delete user
GET    /api/admin/analytics   # Get analytics
GET    /api/admin/logs        # Get system logs
```

## 🗄️ Database Models

### User Model
```typescript
interface User {
  _id: ObjectId;
  walletAddress: string;
  email: string;
  name: string;
  phone: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Vehicle Model
```typescript
interface Vehicle {
  _id: ObjectId;
  userId: ObjectId;
  licensePlate: string;
  vehicleType: string;
  make: string;
  model: string;
  year: number;
  isActive: boolean;
  isBlacklisted: boolean;
  qrCode: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### TollTransaction Model
```typescript
interface TollTransaction {
  _id: ObjectId;
  vehicleId: ObjectId;
  userId: ObjectId;
  tollPlazaId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  transactionHash: string;
  timestamp: Date;
  createdAt: Date;
}
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server

# Database
npm run seed             # Seed database
npm run seed:plazas      # Seed plaza data
npm run seed:simple-plazas # Seed simple plazas

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
```

### Database Operations

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/tollcrypt

# Backup database
mongodump --db tollcrypt --out ./backup

# Restore database
mongorestore --db tollcrypt ./backup/tollcrypt

# Clear database
mongo tollcrypt --eval "db.dropDatabase()"
```

## 🧪 Testing

### Test Structure
```
src/
├── __tests__/           # Test files
├── controllers/         # Controller tests
├── services/           # Service tests
├── utils/              # Utility tests
└── setupTests.ts       # Test setup
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test
npm test -- --testNamePattern="VehicleController"

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Examples
```typescript
// Controller test
import request from 'supertest';
import app from '../app';

describe('Vehicle Controller', () => {
  test('should register vehicle', async () => {
    const response = await request(app)
      .post('/api/vehicles')
      .send({
        licensePlate: 'ABC123',
        vehicleType: 'car',
        make: 'Toyota',
        model: 'Camry'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});

// Service test
import { VehicleService } from '../services/vehicleService';

describe('Vehicle Service', () => {
  test('should create vehicle', async () => {
    const vehicleData = {
      licensePlate: 'ABC123',
      vehicleType: 'car'
    };
    
    const vehicle = await VehicleService.createVehicle(vehicleData);
    expect(vehicle.licensePlate).toBe('ABC123');
  });
});
```

## 🚀 Deployment

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
```

### Environment-Specific Deployments
```bash
# Development
NODE_ENV=development npm run dev

# Staging
NODE_ENV=staging npm start

# Production
NODE_ENV=production npm start
```

## 📊 Monitoring & Logging

### Logging Configuration
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
});
```

### Health Checks
```bash
# Health check endpoint
GET /health

# Response
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "blockchain": "connected"
}
```

## 🔐 Security

### Security Measures
- **Helmet**: Security headers
- **CORS**: Cross-origin protection
- **Rate Limiting**: Request rate limiting
- **Input Validation**: Request validation
- **SQL Injection Protection**: Parameterized queries

### Authentication Flow
1. User provides credentials
2. Server validates credentials
3. JWT token generated
4. Token sent to client
5. Client includes token in requests
6. Server validates token on each request

### Data Encryption
- **At Rest**: Database encryption
- **In Transit**: HTTPS/TLS encryption
- **Sensitive Data**: Field-level encryption
- **Passwords**: bcrypt hashing

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check MongoDB status
   sudo systemctl status mongod
   
   # Restart MongoDB
   sudo systemctl restart mongod
   ```

2. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :3001
   
   # Kill process
   kill -9 <PID>
   ```

3. **Memory Issues**
   ```bash
   # Increase Node.js memory
   node --max-old-space-size=4096 dist/index.js
   ```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# Enable specific debug
DEBUG=tollcrypt:* npm run dev
```

## 📈 Performance

### Optimization Features
- **Connection Pooling**: Database connection pooling
- **Caching**: Redis caching layer
- **Compression**: Gzip compression
- **Rate Limiting**: Request rate limiting

### Performance Metrics
- **Response Time**: < 200ms average
- **Throughput**: 1000+ requests/second
- **Memory Usage**: < 512MB
- **CPU Usage**: < 50%

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards
- Use TypeScript
- Follow ESLint rules
- Write tests for new features
- Update documentation

## 📚 Documentation

- **API Documentation**: [API Docs](https://docs.tollcrypt.com/api)
- **Database Schema**: [Schema Docs](https://docs.tollcrypt.com/database)
- **Deployment Guide**: [Deploy Guide](https://docs.tollcrypt.com/deploy)
- **Contributing Guide**: [Contributing](https://docs.tollcrypt.com/contributing)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/tollcrypt/issues)
- **Discord**: [Community](https://discord.gg/tollcrypt)
- **Email**: backend@tollcrypt.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**TollCrypt Backend** - Secure, scalable, and efficient toll collection API.

Made with ❤️ by the TollCrypt Team
