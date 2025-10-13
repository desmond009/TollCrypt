// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title TopUpWallet
 * @dev Smart contract wallet for storing Sepolia ETH for toll payments
 * @notice Each user gets their own TopUpWallet instance with unique private/public key pair
 */
contract TopUpWallet is ReentrancyGuard, Ownable, Pausable {
    using ECDSA for bytes32;

    // Events
    event TopUpReceived(address indexed from, uint256 amount, uint256 timestamp);
    event TollPaymentProcessed(address indexed tollContract, uint256 amount, uint256 timestamp);
    event WithdrawalProcessed(address indexed to, uint256 amount, uint256 timestamp);
    event WalletInitialized(address indexed owner, uint256 timestamp);

    // State variables
    address public tollCollectionContract;
    bool public isInitialized;
    uint256 public totalTopUps;
    uint256 public totalTollPayments;
    uint256 public totalWithdrawals;

    // Mapping to track authorized toll contracts
    mapping(address => bool) public authorizedTollContracts;

    // Modifiers
    modifier onlyTollContract() {
        require(authorizedTollContracts[msg.sender], "Only authorized toll contracts");
        _;
    }

    modifier onlyInitialized() {
        require(isInitialized, "Wallet not initialized");
        _;
    }

    // Constructor
    constructor() Ownable(msg.sender) {
        // Wallet will be initialized by factory
    }

    /**
     * @dev Initialize the wallet with toll contract address
     * @param _tollCollectionContract Address of the toll collection contract
     */
    function initialize(address _tollCollectionContract) external onlyOwner {
        require(!isInitialized, "Wallet already initialized");
        require(_tollCollectionContract != address(0), "Invalid toll contract address");
        
        tollCollectionContract = _tollCollectionContract;
        authorizedTollContracts[_tollCollectionContract] = true;
        isInitialized = true;
        
        emit WalletInitialized(owner(), block.timestamp);
    }

    /**
     * @dev Add or remove authorized toll contracts
     * @param _tollContract Address of the toll contract
     * @param _isAuthorized Authorization status
     */
    function setTollContractAuthorization(
        address _tollContract,
        bool _isAuthorized
    ) external onlyOwner {
        require(_tollContract != address(0), "Invalid toll contract address");
        authorizedTollContracts[_tollContract] = _isAuthorized;
    }

    /**
     * @dev Receive ETH top-ups from user wallet
     * Requires user signature for authorization
     */
    function topUp(bytes memory signature) external payable nonReentrant whenNotPaused onlyInitialized {
        require(msg.value > 0, "Top-up amount must be greater than 0");
        
        // Verify signature (in a real implementation, you would verify the signature)
        // For now, we'll accept any top-up
        // TODO: Implement proper signature verification
        
        totalTopUps += msg.value;
        
        emit TopUpReceived(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Process toll payment to authorized toll contract
     * @param amount Amount to pay for toll
     * @param vehicleId Vehicle identifier
     * @param zkProofHash Hash of zero-knowledge proof
     */
    function processTollPayment(
        uint256 amount,
        string memory vehicleId,
        bytes32 zkProofHash
    ) external 
        nonReentrant 
        whenNotPaused 
        onlyTollContract 
        onlyInitialized 
    {
        require(amount > 0, "Invalid payment amount");
        require(address(this).balance >= amount, "Insufficient wallet balance");
        require(zkProofHash != bytes32(0), "Invalid ZK proof");
        
        // Transfer ETH to toll contract
        (bool success, ) = payable(tollCollectionContract).call{value: amount}("");
        require(success, "Toll payment transfer failed");
        
        totalTollPayments += amount;
        
        emit TollPaymentProcessed(tollCollectionContract, amount, block.timestamp);
    }

    /**
     * @dev Withdraw funds to owner's main wallet
     * @param amount Amount to withdraw
     * @param signature Owner's signature for authorization
     */
    function withdraw(
        uint256 amount,
        bytes memory signature
    ) external 
        nonReentrant 
        whenNotPaused 
        onlyInitialized 
    {
        require(amount > 0, "Invalid withdrawal amount");
        require(address(this).balance >= amount, "Insufficient wallet balance");
        
        // Verify signature (in a real implementation, you would verify the signature)
        // For now, we'll accept any withdrawal from owner
        // TODO: Implement proper signature verification
        
        totalWithdrawals += amount;
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal transfer failed");
        
        emit WithdrawalProcessed(owner(), amount, block.timestamp);
    }

    /**
     * @dev Emergency withdrawal by owner
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Invalid withdrawal amount");
        require(address(this).balance >= amount, "Insufficient wallet balance");
        
        totalWithdrawals += amount;
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Emergency withdrawal transfer failed");
        
        emit WithdrawalProcessed(owner(), amount, block.timestamp);
    }

    /**
     * @dev Pause the wallet
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the wallet
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get wallet balance
     * @return Current ETH balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get wallet statistics
     * @return totalTopUpsAmount Total amount topped up
     * @return totalTollPaymentsAmount Total amount paid for tolls
     * @return totalWithdrawalsAmount Total amount withdrawn
     * @return currentBalance Current wallet balance
     */
    function getWalletStats() external view returns (
        uint256 totalTopUpsAmount,
        uint256 totalTollPaymentsAmount,
        uint256 totalWithdrawalsAmount,
        uint256 currentBalance
    ) {
        return (
            totalTopUps,
            totalTollPayments,
            totalWithdrawals,
            address(this).balance
        );
    }

    /**
     * @dev Check if wallet is authorized for toll contract
     * @param _tollContract Address of toll contract
     * @return Authorization status
     */
    function isAuthorizedForTollContract(address _tollContract) external view returns (bool) {
        return authorizedTollContracts[_tollContract];
    }

    // Fallback function to receive ETH
    receive() external payable {
        // Allow direct ETH transfers to wallet
        totalTopUps += msg.value;
        emit TopUpReceived(msg.sender, msg.value, block.timestamp);
    }
}
