# Privacy-Preserving Aadhaar Verification System

This document describes the implementation of a privacy-preserving Aadhaar verification system for the Toll Chain blockchain toll collection app using OTP-based authentication and zero-knowledge proofs.

## Overview

The system allows users to prove their Indian residency without revealing personal Aadhaar details through a multi-step verification process that combines OTP authentication, secure XML download, and zero-knowledge proof generation.

## User Flow

### 1. Aadhaar Number Input
- User enters their 12-digit Aadhaar number
- System validates the format and prepares for OTP verification

### 2. OTP Verification
- System sends OTP to the mobile number registered with the Aadhaar
- User enters the received OTP
- System verifies the OTP against UIDAI's authentication service

### 3. Share Code Setup
- User sets a "Share Code" (security password)
- This password encrypts and protects the Aadhaar XML data
- Minimum 6 characters required for security

### 4. Aadhaar XML Download
- System automatically downloads digitally signed Aadhaar XML from UIDAI
- XML contains demographic information and is digitally signed by UIDAI
- Data is processed securely and temporarily stored

### 5. Zero-Knowledge Proof Generation
- Anon-Aadhaar SDK generates ZKP locally in the user's browser
- Process takes 30-90 seconds depending on device capabilities
- Proof confirms Indian residency without revealing personal data

### 6. Blockchain Verification
- Generated ZKP is submitted to the smart contract
- Smart contract verifies the proof validity
- User is marked as verified upon successful verification

### 7. Vehicle Registration Access
- Verified users can now register vehicles
- System ensures only verified users can access toll collection services

## Technical Implementation

### Frontend Components

#### AnonAadhaarAuth Component
- **Location**: `frontend/src/components/AnonAadhaarAuth.tsx`
- **Features**:
  - Step-by-step verification process
  - Real-time progress tracking
  - Error handling and validation
  - Privacy protection information
  - Integration with Anon-Aadhaar SDK

#### VehicleRegistration Component
- **Location**: `frontend/src/components/VehicleRegistration.tsx`
- **Features**:
  - Aadhaar verification requirement check
  - Vehicle registration form
  - Document upload functionality
  - Top-up wallet creation

### Backend Services

#### Aadhaar Routes
- **Location**: `backend/src/routes/aadhaarRoutes.ts`
- **Endpoints**:
  - `POST /api/aadhaar/send-otp` - Send OTP to user's mobile
  - `POST /api/aadhaar/verify-otp` - Verify OTP
  - `POST /api/aadhaar/download-xml` - Download Aadhaar XML
  - `POST /api/aadhaar/verify-xml-signature` - Verify XML signature
  - `GET /api/aadhaar/verification-status/:userAddress` - Check verification status

#### AnonAadhaar Service
- **Location**: `backend/src/services/anonAadhaarService.ts`
- **Features**:
  - Proof validation and verification
  - User session management
  - Blockchain integration simulation
  - Enhanced security checks

### Smart Contracts

#### AnonAadhaarVerifier Contract
- **Location**: `contracts/src/AnonAadhaarVerifier.sol`
- **Features**:
  - ZKP verification on blockchain
  - User verification tracking
  - Replay attack prevention
  - Batch verification support
  - Circuit hash management
  - Emergency revocation functions

## Security Features

### Privacy Protection
- **Local Processing**: All sensitive operations happen in the user's browser
- **Zero-Knowledge Proofs**: Verify identity without revealing personal data
- **No Data Storage**: Aadhaar numbers are never stored or transmitted
- **Encrypted Communication**: All API calls use secure protocols

### Authentication Security
- **OTP Verification**: UIDAI-compliant OTP authentication
- **Share Code Encryption**: User-defined password for data protection
- **Session Management**: Secure session token handling
- **Replay Prevention**: Smart contract prevents duplicate verifications

### Blockchain Security
- **Proof Verification**: Cryptographic verification of ZK proofs
- **User Tracking**: Immutable verification records on blockchain
- **Access Control**: Only authorized verifiers can validate proofs
- **Circuit Updates**: Ability to update verification circuits

## Dependencies

### Frontend
```json
{
  "@anon-aadhaar/core": "^latest",
  "axios": "^latest"
}
```

### Backend
```json
{
  "axios": "^latest",
  "crypto": "^latest"
}
```

### Smart Contracts
```solidity
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
```

## Environment Variables

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_TOLL_COLLECTION_ADDRESS=0x...
```

### Backend (.env)
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/tollchain
JWT_SECRET=your-jwt-secret
```

## API Endpoints

### OTP Management
- **Send OTP**: `POST /api/aadhaar/send-otp`
- **Verify OTP**: `POST /api/aadhaar/verify-otp`

### Aadhaar Data
- **Download XML**: `POST /api/aadhaar/download-xml`
- **Verify Signature**: `POST /api/aadhaar/verify-xml-signature`

### Verification Status
- **Check Status**: `GET /api/aadhaar/verification-status/:userAddress`

### Authentication
- **Anon-Aadhaar Auth**: `POST /api/tolls/auth/anon-aadhaar`

## Testing

### Smart Contract Tests
- **Location**: `contracts/test/AnonAadhaarVerifier.t.sol`
- **Coverage**: All contract functions and edge cases
- **Run**: `forge test --match-contract AnonAadhaarVerifierTest`

### Backend Tests
- **OTP Service**: Mock OTP generation and verification
- **XML Processing**: Aadhaar XML validation and processing
- **Proof Verification**: ZKP validation simulation

## Deployment

### Smart Contract Deployment
```bash
# Deploy AnonAadhaarVerifier
forge script script/DeployAnonAadhaarVerifier.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

### Backend Deployment
```bash
# Install dependencies
npm install

# Start server
npm start
```

### Frontend Deployment
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start development server
npm start
```

## Compliance

### UIDAI Guidelines
- **OTP Authentication**: Compliant with UIDAI OTP service
- **Data Protection**: No storage of sensitive Aadhaar data
- **User Consent**: Explicit consent required for verification
- **Audit Trail**: Complete verification logs maintained

### Data Protection
- **GDPR Compliance**: Privacy-by-design implementation
- **Data Minimization**: Only necessary data processed
- **User Rights**: Complete user control over data
- **Transparency**: Clear privacy policy and data usage

## Monitoring and Analytics

### Verification Metrics
- **Success Rate**: Track verification success rates
- **Processing Time**: Monitor ZKP generation times
- **Error Rates**: Track and analyze failure points
- **User Experience**: Monitor user journey completion

### Security Monitoring
- **Failed Attempts**: Track suspicious verification attempts
- **Proof Validation**: Monitor blockchain verification success
- **Session Security**: Track session token usage
- **Access Patterns**: Monitor API usage patterns

## Future Enhancements

### Planned Features
- **Multi-Factor Authentication**: Additional security layers
- **Biometric Integration**: Fingerprint/face recognition
- **Mobile App**: Native mobile application
- **Offline Support**: Offline verification capabilities

### Technical Improvements
- **Circuit Optimization**: Faster ZKP generation
- **Batch Processing**: Bulk verification support
- **Cross-Chain**: Multi-blockchain support
- **API Rate Limiting**: Enhanced security controls

## Support and Documentation

### User Support
- **Help Center**: Comprehensive user guides
- **Video Tutorials**: Step-by-step verification process
- **FAQ**: Common questions and answers
- **Contact Support**: Direct support channels

### Developer Resources
- **API Documentation**: Complete API reference
- **SDK Documentation**: Integration guides
- **Code Examples**: Sample implementations
- **Community Forum**: Developer discussions

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contributing

We welcome contributions! Please see our contributing guidelines for more information.

## Contact

For questions or support, please contact:
- **Email**: support@tollchain.com
- **GitHub**: https://github.com/tollchain/privacy-aadhaar
- **Documentation**: https://docs.tollchain.com/aadhaar-verification
