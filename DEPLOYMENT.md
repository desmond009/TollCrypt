# TollChain Deployment Guide

This guide provides comprehensive instructions for deploying the TollChain blockchain-based toll collection system.

## Prerequisites

### System Requirements
- Docker and Docker Compose
- Node.js 18+ (for development)
- Python 3.11+ (for hardware integration)
- Git
- At least 4GB RAM and 20GB storage

### Blockchain Requirements
- Ethereum/Polygon wallet with testnet/mainnet ETH
- Contract deployment permissions
- RPC endpoint access

## Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd TollChain
cp env.example .env
# Edit .env with your configuration
```

### 2. Deploy Smart Contracts
```bash
cd contracts
forge install
forge build
forge test
forge script script/Deploy.s.sol --rpc-url $POLYGON_RPC_URL --broadcast --verify
```

### 3. Deploy with Docker Compose
```bash
docker-compose up -d
```

### 4. Access Applications
- Frontend: http://localhost:3000
- Admin Dashboard: http://localhost:3002
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## Detailed Deployment

### Smart Contracts Deployment

1. **Configure Environment**
   ```bash
   cd contracts
   cp .env.example .env
   # Edit .env with your private key and RPC URLs
   ```

2. **Deploy to Mumbai Testnet**
   ```bash
   forge script script/Deploy.s.sol --rpc-url mumbai --broadcast --verify
   ```

3. **Deploy to Polygon Mainnet**
   ```bash
   forge script script/Deploy.s.sol --rpc-url polygon --broadcast --verify
   ```

4. **Update Environment Variables**
   ```bash
   # Copy deployed contract addresses to .env files
   TOLL_COLLECTION_ADDRESS=0x...
   ANON_AADHAAR_VERIFIER_ADDRESS=0x...
   ```

### Backend Deployment

1. **Local Development**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Production with Docker**
   ```bash
   docker build -t tollchain-backend .
   docker run -p 3001:3001 --env-file .env tollchain-backend
   ```

3. **Environment Configuration**
   ```bash
   # Required environment variables
   MONGODB_URI=mongodb://localhost:27017/tollchain
   POLYGON_RPC_URL=https://polygon-rpc.com
   TOLL_COLLECTION_ADDRESS=0x...
   ANON_AADHAAR_VERIFIER_ADDRESS=0x...
   ```

### Frontend Deployment

1. **Local Development**
   ```bash
   cd frontend
   npm install
   npm start
   ```

2. **Production Build**
   ```bash
   npm run build
   # Serve with nginx or any static file server
   ```

3. **Docker Deployment**
   ```bash
   docker build -t tollchain-frontend .
   docker run -p 3000:80 tollchain-frontend
   ```

### Admin Dashboard Deployment

1. **Local Development**
   ```bash
   cd admin-dashboard
   npm install
   npm start
   ```

2. **Production Build**
   ```bash
   npm run build
   # Deploy to static hosting or use Docker
   ```

### Hardware Integration

1. **Raspberry Pi Setup**
   ```bash
   # Install dependencies
   sudo apt update
   sudo apt install python3-pip python3-opencv libzbar0
   pip3 install -r requirements.txt
   
   # Configure hardware access
   sudo usermod -a -G dialout $USER
   sudo usermod -a -G video $USER
   
   # Run hardware integration
   python3 main.py
   ```

2. **Docker Deployment**
   ```bash
   docker build -t tollchain-hardware .
   docker run --device=/dev/ttyUSB0 --device=/dev/video0 tollchain-hardware
   ```

## Production Deployment

### Using Docker Compose

1. **Configure Production Environment**
   ```bash
   cp env.example .env.production
   # Edit with production values
   ```

2. **Deploy Stack**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

3. **Monitor Services**
   ```bash
   docker-compose logs -f
   ```

### Using Kubernetes

1. **Create Namespace**
   ```bash
   kubectl create namespace tollchain
   ```

2. **Deploy ConfigMaps and Secrets**
   ```bash
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/secrets.yaml
   ```

3. **Deploy Services**
   ```bash
   kubectl apply -f k8s/
   ```

### Using Cloud Providers

#### AWS Deployment
1. Use ECS with Fargate
2. RDS for MongoDB
3. Application Load Balancer
4. CloudFront for CDN

#### Google Cloud Deployment
1. Use GKE (Google Kubernetes Engine)
2. Cloud SQL for MongoDB
3. Cloud Load Balancing
4. Cloud CDN

#### Azure Deployment
1. Use AKS (Azure Kubernetes Service)
2. Cosmos DB for MongoDB
3. Azure Load Balancer
4. Azure CDN

## Security Configuration

### SSL/TLS Setup
1. **Generate Certificates**
   ```bash
   # Using Let's Encrypt
   certbot certonly --standalone -d yourdomain.com
   ```

2. **Configure Nginx**
   ```nginx
   server {
       listen 443 ssl;
       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
       # ... rest of configuration
   }
   ```

### Environment Security
1. **Use Secrets Management**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Kubernetes Secrets

2. **Network Security**
   - VPC configuration
   - Security groups
   - Firewall rules

3. **Access Control**
   - IAM roles and policies
   - RBAC for Kubernetes
   - API authentication

## Monitoring and Logging

### Application Monitoring
1. **Health Checks**
   - Backend: `/health` endpoint
   - Frontend: Static health check
   - Database: Connection monitoring

2. **Metrics Collection**
   - Prometheus for metrics
   - Grafana for visualization
   - Custom dashboards

3. **Log Management**
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Fluentd for log forwarding
   - Centralized logging

### Blockchain Monitoring
1. **Transaction Monitoring**
   - Web3 event listeners
   - Transaction status tracking
   - Gas usage monitoring

2. **Smart Contract Monitoring**
   - Contract event logs
   - Function call monitoring
   - Error tracking

## Backup and Recovery

### Database Backup
```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/tollchain" --out=/backup/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://localhost:27017/tollchain" /backup/20240101
```

### Configuration Backup
```bash
# Backup configuration files
tar -czf config-backup-$(date +%Y%m%d).tar.gz .env docker-compose.yml k8s/
```

## Troubleshooting

### Common Issues

1. **Contract Deployment Fails**
   - Check RPC URL and private key
   - Ensure sufficient gas
   - Verify network connectivity

2. **Database Connection Issues**
   - Check MongoDB service status
   - Verify connection string
   - Check network connectivity

3. **Hardware Integration Issues**
   - Check device permissions
   - Verify hardware connections
   - Check Python dependencies

4. **Frontend Build Issues**
   - Check Node.js version
   - Clear npm cache
   - Verify environment variables

### Log Analysis
```bash
# View application logs
docker-compose logs -f backend

# View specific service logs
docker-compose logs -f mongodb

# View hardware logs
docker-compose logs -f hardware
```

## Performance Optimization

### Database Optimization
1. **Indexing**
   - Create appropriate indexes
   - Monitor query performance
   - Optimize slow queries

2. **Connection Pooling**
   - Configure connection limits
   - Monitor connection usage
   - Implement connection retry logic

### Application Optimization
1. **Caching**
   - Redis for session storage
   - CDN for static assets
   - Application-level caching

2. **Load Balancing**
   - Multiple backend instances
   - Health check configuration
   - Session affinity

### Blockchain Optimization
1. **Gas Optimization**
   - Optimize smart contract code
   - Use appropriate gas prices
   - Batch transactions when possible

2. **Event Processing**
   - Efficient event filtering
   - Parallel processing
   - Error handling and retries

## Maintenance

### Regular Tasks
1. **Security Updates**
   - Update dependencies
   - Apply security patches
   - Review access permissions

2. **Performance Monitoring**
   - Monitor resource usage
   - Analyze performance metrics
   - Optimize bottlenecks

3. **Backup Verification**
   - Test backup restoration
   - Verify data integrity
   - Update backup procedures

### Scaling
1. **Horizontal Scaling**
   - Add more backend instances
   - Use load balancers
   - Implement auto-scaling

2. **Vertical Scaling**
   - Increase server resources
   - Optimize application code
   - Upgrade hardware

## Support

For technical support and questions:
- GitHub Issues: [Repository Issues]
- Documentation: [Documentation URL]
- Community: [Community Forum]

## License

This project is licensed under the MIT License - see the LICENSE file for details.
