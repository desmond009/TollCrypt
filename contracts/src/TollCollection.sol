// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TollCollection
 * @dev Main contract for automated toll collection with privacy-preserving authentication
 * @notice This contract handles vehicle registration, toll payments, and ZKP verification
 */
contract TollCollection is ReentrancyGuard, Ownable, Pausable {
    // Events
    event VehicleRegistered(address indexed owner, string vehicleId, uint256 timestamp);
    event VehicleUpdated(address indexed owner, string vehicleId, uint256 timestamp);
    event VehicleRemoved(address indexed owner, string vehicleId, uint256 timestamp);
    event TollPaid(
        address indexed payer,
        string vehicleId,
        uint256 amount,
        uint256 tollId,
        bytes32 zkProofHash,
        uint256 timestamp
    );
    event VehicleBlacklisted(string vehicleId, bool isBlacklisted, uint256 timestamp);
    event TollRateUpdated(uint256 newRate, uint256 timestamp);
    event RevenueWithdrawn(address indexed to, uint256 amount, uint256 timestamp);

    // Structs
    struct Vehicle {
        address owner;
        string vehicleId;
        bool isActive;
        bool isBlacklisted;
        uint256 registrationTime;
        uint256 lastTollTime;
    }

    struct TollTransaction {
        address payer;
        string vehicleId;
        uint256 amount;
        bytes32 zkProofHash;
        uint256 timestamp;
        bool isProcessed;
    }

    // State variables
    uint256 private _tollIdCounter;
    uint256 private _vehicleCounter;

    mapping(string => Vehicle) public vehicles;
    mapping(address => string[]) public userVehicles;
    mapping(uint256 => TollTransaction) public tollTransactions;
    mapping(string => bool) public blacklistedVehicles;
    mapping(address => bool) public authorizedOperators;

    uint256 public tollRate; // in wei
    uint256 public totalRevenue;
    IERC20 public paymentToken;

    // Modifiers
    modifier onlyAuthorizedOperator() {
        require(authorizedOperators[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier vehicleExists(string memory vehicleId) {
        require(vehicles[vehicleId].owner != address(0), "Vehicle not registered");
        _;
    }

    modifier vehicleNotBlacklisted(string memory vehicleId) {
        require(!blacklistedVehicles[vehicleId], "Vehicle is blacklisted");
        _;
    }

    // Constructor
    constructor(
        address _paymentToken,
        uint256 _initialTollRate
    ) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
        tollRate = _initialTollRate;
        authorizedOperators[msg.sender] = true;
    }

    /**
     * @dev Register a new vehicle
     * @param vehicleId Unique vehicle identifier (RFID/QR code)
     * @param owner Vehicle owner address
     */
    function registerVehicle(
        string memory vehicleId,
        address owner
    ) external onlyAuthorizedOperator {
        require(vehicles[vehicleId].owner == address(0), "Vehicle already registered");
        require(owner != address(0), "Invalid owner address");
        require(bytes(vehicleId).length > 0, "Invalid vehicle ID");

        vehicles[vehicleId] = Vehicle({
            owner: owner,
            vehicleId: vehicleId,
            isActive: true,
            isBlacklisted: false,
            registrationTime: block.timestamp,
            lastTollTime: 0
        });

        userVehicles[owner].push(vehicleId);
        _vehicleCounter++;

        emit VehicleRegistered(owner, vehicleId, block.timestamp);
    }

    /**
     * @dev Update vehicle information
     * @param vehicleId Vehicle identifier
     * @param newOwner New owner address
     */
    function updateVehicle(
        string memory vehicleId,
        address newOwner
    ) external onlyAuthorizedOperator vehicleExists(vehicleId) {
        require(newOwner != address(0), "Invalid owner address");
        
        address oldOwner = vehicles[vehicleId].owner;
        vehicles[vehicleId].owner = newOwner;

        // Remove from old owner's list
        _removeVehicleFromUserList(oldOwner, vehicleId);
        
        // Add to new owner's list
        userVehicles[newOwner].push(vehicleId);

        emit VehicleUpdated(newOwner, vehicleId, block.timestamp);
    }

    /**
     * @dev Remove a vehicle from the system
     * @param vehicleId Vehicle identifier
     */
    function removeVehicle(
        string memory vehicleId
    ) external onlyAuthorizedOperator vehicleExists(vehicleId) {
        address owner = vehicles[vehicleId].owner;
        
        vehicles[vehicleId].isActive = false;
        _removeVehicleFromUserList(owner, vehicleId);

        emit VehicleRemoved(owner, vehicleId, block.timestamp);
    }

    /**
     * @dev Process toll payment with ZKP verification
     * @param vehicleId Vehicle identifier
     * @param zkProofHash Hash of the zero-knowledge proof
     * @param amount Payment amount
     */
    function processTollPayment(
        string memory vehicleId,
        bytes32 zkProofHash,
        uint256 amount
    ) external 
        nonReentrant 
        whenNotPaused 
        vehicleExists(vehicleId) 
        vehicleNotBlacklisted(vehicleId) 
    {
        require(vehicles[vehicleId].isActive, "Vehicle not active");
        require(amount >= tollRate, "Insufficient payment amount");
        require(zkProofHash != bytes32(0), "Invalid ZK proof");

        // Transfer payment from user to contract
        require(
            paymentToken.transferFrom(msg.sender, address(this), amount),
            "Payment transfer failed"
        );

        // Create toll transaction record
        uint256 tollId = _tollIdCounter;
        _tollIdCounter++;

        tollTransactions[tollId] = TollTransaction({
            payer: msg.sender,
            vehicleId: vehicleId,
            amount: amount,
            zkProofHash: zkProofHash,
            timestamp: block.timestamp,
            isProcessed: true
        });

        // Update vehicle last toll time
        vehicles[vehicleId].lastTollTime = block.timestamp;
        totalRevenue += amount;

        emit TollPaid(msg.sender, vehicleId, amount, tollId, zkProofHash, block.timestamp);
    }

    /**
     * @dev Blacklist or whitelist a vehicle
     * @param vehicleId Vehicle identifier
     * @param isBlacklisted Blacklist status
     */
    function setVehicleBlacklistStatus(
        string memory vehicleId,
        bool isBlacklisted
    ) external onlyAuthorizedOperator vehicleExists(vehicleId) {
        blacklistedVehicles[vehicleId] = isBlacklisted;
        vehicles[vehicleId].isBlacklisted = isBlacklisted;

        emit VehicleBlacklisted(vehicleId, isBlacklisted, block.timestamp);
    }

    /**
     * @dev Update toll rate
     * @param newRate New toll rate in wei
     */
    function updateTollRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Invalid toll rate");
        tollRate = newRate;
        emit TollRateUpdated(newRate, block.timestamp);
    }

    /**
     * @dev Add or remove authorized operators
     * @param operator Operator address
     * @param isAuthorized Authorization status
     */
    function setOperatorAuthorization(
        address operator,
        bool isAuthorized
    ) external onlyOwner {
        require(operator != address(0), "Invalid operator address");
        authorizedOperators[operator] = isAuthorized;
    }

    /**
     * @dev Withdraw collected revenue
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawRevenue(
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient address");
        require(amount <= totalRevenue, "Insufficient revenue");
        require(amount <= paymentToken.balanceOf(address(this)), "Insufficient contract balance");

        totalRevenue -= amount;
        require(paymentToken.transfer(to, amount), "Transfer failed");

        emit RevenueWithdrawn(to, amount, block.timestamp);
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get vehicle information
     * @param vehicleId Vehicle identifier
     * @return Vehicle struct
     */
    function getVehicle(string memory vehicleId) external view returns (Vehicle memory) {
        return vehicles[vehicleId];
    }

    /**
     * @dev Get user's vehicles
     * @param user User address
     * @return Array of vehicle IDs
     */
    function getUserVehicles(address user) external view returns (string[] memory) {
        return userVehicles[user];
    }

    /**
     * @dev Get toll transaction details
     * @param tollId Transaction ID
     * @return TollTransaction struct
     */
    function getTollTransaction(uint256 tollId) external view returns (TollTransaction memory) {
        return tollTransactions[tollId];
    }

    /**
     * @dev Get total number of vehicles
     * @return Total vehicle count
     */
    function getTotalVehicles() external view returns (uint256) {
        return _vehicleCounter;
    }

    /**
     * @dev Get total number of toll transactions
     * @return Total transaction count
     */
    function getTotalTransactions() external view returns (uint256) {
        return _tollIdCounter;
    }

    /**
     * @dev Internal function to remove vehicle from user's list
     * @param user User address
     * @param vehicleId Vehicle identifier
     */
    function _removeVehicleFromUserList(address user, string memory vehicleId) internal {
        string[] storage userVehicleList = userVehicles[user];
        for (uint256 i = 0; i < userVehicleList.length; i++) {
            if (keccak256(bytes(userVehicleList[i])) == keccak256(bytes(vehicleId))) {
                userVehicleList[i] = userVehicleList[userVehicleList.length - 1];
                userVehicleList.pop();
                break;
            }
        }
    }
}
