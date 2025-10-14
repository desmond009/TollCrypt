// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./TopUpWallet.sol";
import "./TollCollection.sol";

/**
 * @title TopUpWalletFactory
 * @dev Factory contract to deploy new TopUpWallet instances for each user
 * @notice Creates unique top-up wallets with their own private/public key pairs
 */
contract TopUpWalletFactory is ReentrancyGuard, Ownable, Pausable {
    // Events
    event TopUpWalletCreated(
        address indexed user,
        address indexed walletAddress,
        uint256 timestamp
    );
    event TollContractUpdated(address indexed oldContract, address indexed newContract);
    event WalletDeployed(address indexed walletAddress, address indexed owner);

    // State variables
    address public tollCollectionContract;
    address[] public deployedWallets;
    mapping(address => address) public userToWallet; // user address => wallet address
    mapping(address => bool) public isDeployedWallet; // wallet address => is deployed
    mapping(address => bool) public authorizedDeployers; // authorized deployer addresses

    // Modifiers
    modifier onlyAuthorizedDeployer() {
        require(
            authorizedDeployers[msg.sender] || msg.sender == owner(),
            "Not authorized to deploy wallets"
        );
        _;
    }

    // Constructor
    constructor(address _tollCollectionContract) Ownable(msg.sender) {
        require(_tollCollectionContract != address(0), "Invalid toll contract address");
        tollCollectionContract = _tollCollectionContract;
        authorizedDeployers[msg.sender] = true;
    }

    /**
     * @dev Deploy a new TopUpWallet for a user
     * @param user Address of the user who will own the wallet
     * @return walletAddress Address of the deployed wallet
     */
    function deployTopUpWallet(address user) 
        external 
        onlyAuthorizedDeployer 
        nonReentrant 
        whenNotPaused 
        returns (address walletAddress) 
    {
        require(user != address(0), "Invalid user address");
        require(userToWallet[user] == address(0), "User already has a top-up wallet");

        // Deploy new TopUpWallet contract
        TopUpWallet newWallet = new TopUpWallet();
        walletAddress = address(newWallet);

        // Initialize the wallet with toll contract
        newWallet.initialize(tollCollectionContract);

        // Transfer ownership to the user
        newWallet.transferOwnership(user);

        // Authorize the wallet in the toll collection contract
        TollCollection tollCollection = TollCollection(tollCollectionContract);
        tollCollection.authorizeTopUpWalletFromFactory(walletAddress);

        // Update mappings and arrays
        userToWallet[user] = walletAddress;
        isDeployedWallet[walletAddress] = true;
        deployedWallets.push(walletAddress);

        emit TopUpWalletCreated(user, walletAddress, block.timestamp);
        emit WalletDeployed(walletAddress, user);

        return walletAddress;
    }

    /**
     * @dev Deploy multiple wallets in batch
     * @param users Array of user addresses
     * @return walletAddresses Array of deployed wallet addresses
     */
    function deployTopUpWalletsBatch(address[] calldata users) 
        external 
        onlyAuthorizedDeployer 
        nonReentrant 
        whenNotPaused 
        returns (address[] memory walletAddresses) 
    {
        require(users.length > 0, "No users provided");
        require(users.length <= 50, "Too many users in batch"); // Gas limit protection

        walletAddresses = new address[](users.length);

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            require(user != address(0), "Invalid user address");
            require(userToWallet[user] == address(0), "User already has a top-up wallet");

            // Deploy new TopUpWallet contract
            TopUpWallet newWallet = new TopUpWallet();
            address walletAddress = address(newWallet);

            // Initialize the wallet with toll contract
            newWallet.initialize(tollCollectionContract);

            // Transfer ownership to the user
            newWallet.transferOwnership(user);

            // Authorize the wallet in the toll collection contract
            TollCollection tollCollection = TollCollection(tollCollectionContract);
            tollCollection.authorizeTopUpWalletFromFactory(walletAddress);

            // Update mappings and arrays
            userToWallet[user] = walletAddress;
            isDeployedWallet[walletAddress] = true;
            deployedWallets.push(walletAddress);

            walletAddresses[i] = walletAddress;

            emit TopUpWalletCreated(user, walletAddress, block.timestamp);
            emit WalletDeployed(walletAddress, user);
        }

        return walletAddresses;
    }

    /**
     * @dev Update the toll collection contract address
     * @param newTollContract New toll collection contract address
     */
    function updateTollContract(address newTollContract) external onlyOwner {
        require(newTollContract != address(0), "Invalid toll contract address");
        require(newTollContract != tollCollectionContract, "Same toll contract address");
        
        address oldContract = tollCollectionContract;
        tollCollectionContract = newTollContract;
        
        emit TollContractUpdated(oldContract, newTollContract);
    }

    /**
     * @dev Add or remove authorized deployers
     * @param deployer Address of the deployer
     * @param isAuthorized Authorization status
     */
    function setDeployerAuthorization(address deployer, bool isAuthorized) external onlyOwner {
        require(deployer != address(0), "Invalid deployer address");
        authorizedDeployers[deployer] = isAuthorized;
    }

    /**
     * @dev Pause the factory
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the factory
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get user's top-up wallet address
     * @param user User address
     * @return walletAddress Top-up wallet address (address(0) if not deployed)
     */
    function getUserTopUpWallet(address user) external view returns (address walletAddress) {
        return userToWallet[user];
    }

    /**
     * @dev Check if user has a top-up wallet
     * @param user User address
     * @return hasWallet True if user has a wallet
     */
    function hasTopUpWallet(address user) external view returns (bool hasWallet) {
        return userToWallet[user] != address(0);
    }

    /**
     * @dev Get total number of deployed wallets
     * @return count Total number of deployed wallets
     */
    function getTotalDeployedWallets() external view returns (uint256 count) {
        return deployedWallets.length;
    }

    /**
     * @dev Get all deployed wallet addresses
     * @return wallets Array of all deployed wallet addresses
     */
    function getAllDeployedWallets() external view returns (address[] memory wallets) {
        return deployedWallets;
    }

    /**
     * @dev Get deployed wallets with pagination
     * @param offset Starting index
     * @param limit Maximum number of wallets to return
     * @return wallets Array of wallet addresses
     * @return totalCount Total number of deployed wallets
     */
    function getDeployedWalletsPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (
        address[] memory wallets,
        uint256 totalCount
    ) {
        totalCount = deployedWallets.length;
        
        if (offset >= totalCount) {
            return (new address[](0), totalCount);
        }
        
        uint256 end = offset + limit;
        if (end > totalCount) {
            end = totalCount;
        }
        
        wallets = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            wallets[i - offset] = deployedWallets[i];
        }
        
        return (wallets, totalCount);
    }

    /**
     * @dev Get wallet information for a user
     * @param user User address
     * @return walletAddress Top-up wallet address
     * @return exists Whether the wallet exists
     * @return balance Current wallet balance
     */
    function getUserWalletInfo(address user) external view returns (
        address walletAddress,
        bool exists,
        uint256 balance
    ) {
        walletAddress = userToWallet[user];
        exists = walletAddress != address(0);
        
        if (exists) {
            TopUpWallet wallet = TopUpWallet(payable(walletAddress));
            balance = wallet.getBalance();
        }
    }
}
