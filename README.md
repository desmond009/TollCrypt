# TollCrypt - Blockchain-Based Automated Toll Collection System

A production-ready web application for automated toll collection using blockchain smart contracts, privacy-preserving anon-Aadhaar user authentication, and RFID/QR hardware integration.

## Features

- **Privacy-First Authentication**: Zero-knowledge Aadhaar verification using anon-aadhaar protocol
- **Blockchain Integration**: Ethereum/Polygon smart contracts for secure, auditable transactions
- **Hardware Integration**: RFID/QR reader support for automated vehicle detection
- **Real-time Payments**: Instant toll processing with on-chain verification
- **Admin Dashboard**: Comprehensive monitoring, fraud detection, and analytics
- **Scalable Architecture**: Event-driven backend with real-time data streaming

## Tech Stack

- **Frontend**: React, TailwindCSS, Web3Modal, anon-aadhaar/react
- **Blockchain**: Ethereum/Polygon, Solidity, OpenZeppelin, anon-aadhaar/contracts
- **Backend**: Node.js, Express, Socket.io, Firebase/MongoDB
- **Hardware**: Python/Node.js bridge for RFID/QR integration
- **Testing**: Hardhat/Foundry, Jest, Cypress

## Project Structure

```
TollCrypt/
├── frontend/          # React frontend application
├── backend/           # Node.js/Express backend API
├── contracts/         # Solidity smart contracts
├── hardware/          # RFID/QR hardware integration
├── admin-dashboard/   # Admin monitoring dashboard
└── docs/             # Documentation and API specs
```

## Quick Start

1. **Install Dependencies**
   ```bash
   npm run install:all
   ```

2. **Set up Environment Variables**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

3. **Deploy Smart Contracts**
   ```bash
   npm run deploy:contracts
   ```

4. **Start Development Servers**
   ```bash
   npm run dev
   ```

## Environment Setup

Create `.env` files in each directory with appropriate configuration:

- `frontend/.env` - Frontend environment variables
- `backend/.env` - Backend API configuration
- `contracts/.env` - Blockchain network configuration

## Security Features

- Zero-knowledge proofs for Aadhaar verification
- No personal data stored on-chain
- Encrypted communication channels
- Multi-signature wallet support
- Fraud detection algorithms

## License

MIT License - see LICENSE file for details
