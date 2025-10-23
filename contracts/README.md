# 🔗 TollCrypt Smart Contracts

The blockchain layer of the TollCrypt system, consisting of Solidity smart contracts deployed on Ethereum and Polygon networks. These contracts handle toll collection, payment processing, and privacy-preserving authentication.

## 🌟 Features

### 💰 Toll Collection
- **Dynamic Pricing**: Real-time toll calculation based on vehicle type and time
- **Multi-Currency Support**: USDC, ETH, and native token payments
- **Automated Processing**: Smart contract-based payment processing
- **Refund System**: Automated refund handling for failed transactions

### 🔐 Privacy & Security
- **Zero-Knowledge Proofs**: Anonymous Aadhaar verification
- **Privacy-Preserving**: No personal data stored on blockchain
- **Secure Authentication**: Cryptographic proof verification
- **Audit Trails**: Immutable transaction records

### 🏗️ Architecture
- **Modular Design**: Separate contracts for different functions
- **Upgradeable**: Proxy pattern for contract upgrades
- **Gas Optimized**: Efficient gas usage
- **Event Logging**: Comprehensive event emission

## 🛠️ Technology Stack

### Core Technologies
- **Solidity 0.8.20** - Smart contract language
- **Foundry** - Development framework
- **Forge** - Testing and deployment
- **OpenZeppelin** - Secure contract libraries

### Testing & Deployment
- **Foundry Tests** - Comprehensive test suite
- **Fuzz Testing** - Automated vulnerability testing
- **Gas Optimization** - Gas usage optimization
- **Multi-Network** - Ethereum and Polygon support

## 📁 Contract Structure

```
contracts/
├── src/
│   ├── TollCollection.sol        # Main toll collection contract
│   ├── TopUpWallet.sol          # Individual wallet contract
│   ├── TopUpWalletFactory.sol   # Wallet factory contract
│   ├── AnonAadhaarVerifier.sol  # Privacy verification contract
│   └── Counter.sol              # Test contract
├── script/
│   ├── Deploy.s.sol             # Main deployment script
│   ├── DeployTopUpWalletSystem.s.sol # Wallet system deployment
│   └── AuthorizeFactory.s.sol   # Factory authorization
├── test/
│   ├── TollCollection.t.sol     # Toll collection tests
│   ├── TopUpWalletSystem.t.sol  # Wallet system tests
│   └── AnonAadhaarVerifier.t.sol # Verification tests
├── foundry.toml                 # Foundry configuration
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- **Foundry** - Install from [getfoundry.sh](https://getfoundry.sh)
- **Node.js** (v18 or higher)
- **Git**

### Installation

1. **Install Foundry**
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/tollcrypt.git
   cd tollcrypt/contracts
   ```

3. **Install dependencies**
   ```bash
   forge install
   ```

4. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the contracts directory:

```env
# RPC URLs
ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_MUMBAI_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_MAINNET_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_POLYGON_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY

# Private Keys
PRIVATE_KEY=your_private_key

# API Keys
ETHERSCAN_API_KEY=your_etherscan_key
POLYGONSCAN_API_KEY=your_polygonscan_key

# Contract Addresses (set after deployment)
TOLL_COLLECTION_ADDRESS=0x...
TOPUP_WALLET_FACTORY_ADDRESS=0x...
ANON_AADHAAR_VERIFIER_ADDRESS=0x...
USDC_ADDRESS=0x...
```

## 🔧 Development

### Available Commands

```bash
# Compilation
forge build              # Build contracts
forge build --sizes      # Build with size info

# Testing
forge test               # Run all tests
forge test --match-test testTollCollection # Run specific test
forge test --gas-report  # Run with gas report
forge test --fuzz-runs 1000 # Run with more fuzz iterations

# Deployment
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify

# Verification
forge verify-contract --chain-id 11155111 --num-of-optimizations 200 --watch --etherscan-api-key $ETHERSCAN_API_KEY $CONTRACT_ADDRESS src/TollCollection.sol:TollCollection
```

### Testing

```bash
# Run all tests
forge test

# Run specific test file
forge test --match-path test/TollCollection.t.sol

# Run with gas report
forge test --gas-report

# Run fuzz tests
forge test --fuzz-runs 10000

# Run invariant tests
forge test --match-test invariant
```

## 📋 Contract Details

### TollCollection.sol

Main contract for toll collection and payment processing.

```solidity
contract TollCollection {
    // State variables
    mapping(address => bool) public authorizedPlazas;
    mapping(bytes32 => bool) public processedTransactions;
    
    // Events
    event TollProcessed(address indexed user, uint256 amount, bytes32 transactionHash);
    event RefundProcessed(address indexed user, uint256 amount, bytes32 transactionHash);
    
    // Functions
    function processToll(
        address user,
        uint256 amount,
        bytes32 vehicleId,
        bytes calldata proof
    ) external;
    
    function processRefund(
        address user,
        uint256 amount,
        bytes32 transactionHash
    ) external;
}
```

### TopUpWallet.sol

Individual wallet contract for users.

```solidity
contract TopUpWallet {
    // State variables
    address public owner;
    uint256 public balance;
    mapping(address => bool) public authorizedSpenders;
    
    // Events
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event Payment(address indexed recipient, uint256 amount);
    
    // Functions
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function makePayment(address recipient, uint256 amount) external;
}
```

### TopUpWalletFactory.sol

Factory contract for creating user wallets.

```solidity
contract TopUpWalletFactory {
    // State variables
    mapping(address => address) public userWallets;
    address[] public allWallets;
    
    // Events
    event WalletCreated(address indexed user, address indexed wallet);
    
    // Functions
    function createWallet() external returns (address);
    function getUserWallet(address user) external view returns (address);
}
```

### AnonAadhaarVerifier.sol

Privacy-preserving Aadhaar verification.

```solidity
contract AnonAadhaarVerifier {
    // State variables
    mapping(bytes32 => bool) public verifiedProofs;
    
    // Events
    event ProofVerified(address indexed user, bytes32 proofHash);
    
    // Functions
    function verifyProof(
        bytes calldata proof,
        bytes32 publicInput
    ) external returns (bool);
}
```

## 🧪 Testing

### Test Structure
```
test/
├── TollCollection.t.sol     # Toll collection tests
├── TopUpWalletSystem.t.sol  # Wallet system tests
├── AnonAadhaarVerifier.t.sol # Verification tests
└── Counter.t.sol            # Basic tests
```

### Test Examples

```solidity
// TollCollection test
contract TollCollectionTest is Test {
    TollCollection public tollCollection;
    address public user = makeAddr("user");
    address public plaza = makeAddr("plaza");
    
    function setUp() public {
        tollCollection = new TollCollection();
        tollCollection.authorizePlaza(plaza);
    }
    
    function testProcessToll() public {
        uint256 amount = 100;
        bytes32 vehicleId = keccak256("ABC123");
        
        vm.prank(plaza);
        tollCollection.processToll(user, amount, vehicleId, "");
        
        assertTrue(tollCollection.processedTransactions(keccak256(abi.encodePacked(user, amount, vehicleId))));
    }
}

// Fuzz test
function testFuzzProcessToll(uint256 amount, bytes32 vehicleId) public {
    vm.assume(amount > 0 && amount < 1000 ether);
    
    vm.prank(plaza);
    tollCollection.processToll(user, amount, vehicleId, "");
    
    assertTrue(tollCollection.processedTransactions(keccak256(abi.encodePacked(user, amount, vehicleId))));
}
```

## 🚀 Deployment

### Local Deployment
```bash
# Start local node
anvil

# Deploy to local network
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

### Testnet Deployment
```bash
# Deploy to Sepolia
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify

# Deploy to Mumbai
forge script script/Deploy.s.sol --rpc-url mumbai --broadcast --verify
```

### Mainnet Deployment
```bash
# Deploy to Ethereum mainnet
forge script script/Deploy.s.sol --rpc-url mainnet --broadcast --verify

# Deploy to Polygon
forge script script/Deploy.s.sol --rpc-url polygon --broadcast --verify
```

## 🔐 Security

### Security Features
- **Access Control**: Role-based permissions
- **Reentrancy Protection**: ReentrancyGuard from OpenZeppelin
- **Integer Overflow**: SafeMath operations
- **Input Validation**: Comprehensive input checks

### Security Audits
- **OpenZeppelin**: Battle-tested libraries
- **Foundry Tests**: Comprehensive test coverage
- **Fuzz Testing**: Automated vulnerability testing
- **Formal Verification**: Mathematical proof verification

### Best Practices
- **Checks-Effects-Interactions**: CEI pattern
- **Event Emission**: Complete event logging
- **Gas Optimization**: Efficient gas usage
- **Upgradeability**: Proxy pattern implementation

## 📊 Gas Optimization

### Optimization Techniques
- **Packed Structs**: Efficient storage layout
- **Custom Errors**: Gas-efficient error handling
- **Assembly**: Low-level optimizations
- **Batch Operations**: Multiple operations in single transaction

### Gas Usage
- **TollCollection.processToll**: ~50,000 gas
- **TopUpWallet.deposit**: ~30,000 gas
- **TopUpWallet.makePayment**: ~40,000 gas
- **AnonAadhaarVerifier.verifyProof**: ~200,000 gas

## 🌐 Network Support

### Supported Networks
- **Ethereum Mainnet**: Production deployment
- **Polygon**: Layer 2 scaling
- **Sepolia**: Ethereum testnet
- **Mumbai**: Polygon testnet
- **Local**: Anvil development

### Network Configuration
```toml
# foundry.toml
[rpc_endpoints]
sepolia = "https://rpc.sepolia.eth.gateway.fm"
mumbai = "https://rpc.ankr.com/polygon_mumbai"
mainnet = "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
polygon = "https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY"
```

## 🔍 Monitoring

### Event Monitoring
```solidity
// Monitor toll processing
event TollProcessed(
    address indexed user,
    uint256 amount,
    bytes32 vehicleId,
    bytes32 transactionHash
);

// Monitor wallet creation
event WalletCreated(
    address indexed user,
    address indexed wallet
);
```

### Analytics
- **Transaction Volume**: Daily/monthly transaction counts
- **Gas Usage**: Average gas consumption
- **User Activity**: Active user metrics
- **Revenue Tracking**: Total revenue collected

## 🐛 Troubleshooting

### Common Issues

1. **Compilation Errors**
   ```bash
   # Check Solidity version
   forge build --sizes
   
   # Update dependencies
   forge update
   ```

2. **Test Failures**
   ```bash
   # Run with verbose output
   forge test -vvv
   
   # Check gas limits
   forge test --gas-report
   ```

3. **Deployment Issues**
   ```bash
   # Check RPC connectivity
   cast block-number --rpc-url sepolia
   
   # Verify private key
   cast wallet address --private-key $PRIVATE_KEY
   ```

## 📚 Documentation

- **Solidity Docs**: [Solidity Documentation](https://docs.soliditylang.org/)
- **Foundry Book**: [Foundry Documentation](https://book.getfoundry.sh/)
- **OpenZeppelin**: [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- **Ethereum Docs**: [Ethereum Documentation](https://ethereum.org/developers/)

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Code Standards
- Use Solidity 0.8.20
- Follow OpenZeppelin patterns
- Write comprehensive tests
- Document all functions

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/tollcrypt/issues)
- **Discord**: [Community](https://discord.gg/tollcrypt)
- **Email**: contracts@tollcrypt.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**TollCrypt Smart Contracts** - Secure, efficient, and privacy-preserving blockchain infrastructure.

Made with ❤️ by the TollCrypt Team