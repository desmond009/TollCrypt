// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/TollCollection.sol";
import "../src/AnonAadhaarVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 token for testing
contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MTK") {
        _mint(msg.sender, 1000000 * 10**18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract TollCollectionTest is Test {
    TollCollection public tollCollection;
    AnonAadhaarVerifier public verifier;
    MockToken public token;

    address public owner = address(0x1);
    address public operator = address(0x2);
    address public user = address(0x3);
    address public admin = address(0x4);

    uint256 public initialTollRate = 1000; // 1000 wei
    uint256 public initialTokenSupply = 1000000 * 10**18;

    function setUp() public {
        // Deploy mock token
        token = new MockToken();
        
        // Deploy verifier
        verifier = new AnonAadhaarVerifier(address(0x5));
        
        // Deploy toll collection contract
        vm.prank(owner);
        tollCollection = new TollCollection(address(token), initialTollRate);
        
        // Set up test accounts
        vm.startPrank(owner);
        tollCollection.setOperatorAuthorization(operator, true);
        tollCollection.setOperatorAuthorization(admin, true);
        vm.stopPrank();

        // Mint tokens to test accounts
        token.mint(user, initialTokenSupply);
        token.mint(operator, initialTokenSupply);
        token.mint(admin, initialTokenSupply);

        // Approve token spending
        vm.prank(user);
        token.approve(address(tollCollection), type(uint256).max);
    }

    function testVehicleRegistration() public {
        string memory vehicleId = "VEH001";
        
        vm.prank(operator);
        tollCollection.registerVehicle(vehicleId, user);
        
        TollCollection.Vehicle memory vehicle = tollCollection.getVehicle(vehicleId);
        assertEq(vehicle.owner, user);
        assertEq(vehicle.vehicleId, vehicleId);
        assertTrue(vehicle.isActive);
        assertFalse(vehicle.isBlacklisted);
        assertEq(vehicle.registrationTime, block.timestamp);
    }

    function testVehicleRegistrationFailsWhenAlreadyExists() public {
        string memory vehicleId = "VEH001";
        
        vm.prank(operator);
        tollCollection.registerVehicle(vehicleId, user);
        
        vm.prank(operator);
        vm.expectRevert("Vehicle already registered");
        tollCollection.registerVehicle(vehicleId, user);
    }

    function testVehicleUpdate() public {
        string memory vehicleId = "VEH001";
        address newOwner = address(0x6);
        
        // Register vehicle
        vm.prank(operator);
        tollCollection.registerVehicle(vehicleId, user);
        
        // Update vehicle owner
        vm.prank(operator);
        tollCollection.updateVehicle(vehicleId, newOwner);
        
        TollCollection.Vehicle memory vehicle = tollCollection.getVehicle(vehicleId);
        assertEq(vehicle.owner, newOwner);
    }

    function testVehicleRemoval() public {
        string memory vehicleId = "VEH001";
        
        // Register vehicle
        vm.prank(operator);
        tollCollection.registerVehicle(vehicleId, user);
        
        // Remove vehicle
        vm.prank(operator);
        tollCollection.removeVehicle(vehicleId);
        
        TollCollection.Vehicle memory vehicle = tollCollection.getVehicle(vehicleId);
        assertFalse(vehicle.isActive);
    }

    function testTollPayment() public {
        string memory vehicleId = "VEH001";
        bytes32 zkProofHash = keccak256("test-proof");
        uint256 paymentAmount = initialTollRate;
        
        // Register vehicle
        vm.prank(operator);
        tollCollection.registerVehicle(vehicleId, user);
        
        // Process toll payment
        vm.prank(user);
        tollCollection.processTollPayment(vehicleId, zkProofHash, paymentAmount);
        
        // Check transaction was recorded
        uint256 totalTransactions = tollCollection.getTotalTransactions();
        assertEq(totalTransactions, 1);
        
        // Check revenue was updated
        assertEq(tollCollection.totalRevenue(), paymentAmount);
    }

    function testTollPaymentFailsWithInsufficientAmount() public {
        string memory vehicleId = "VEH001";
        bytes32 zkProofHash = keccak256("test-proof");
        uint256 insufficientAmount = initialTollRate - 1;
        
        // Register vehicle
        vm.prank(operator);
        tollCollection.registerVehicle(vehicleId, user);
        
        // Attempt toll payment with insufficient amount
        vm.prank(user);
        vm.expectRevert("Insufficient payment amount");
        tollCollection.processTollPayment(vehicleId, zkProofHash, insufficientAmount);
    }

    function testTollPaymentFailsForBlacklistedVehicle() public {
        string memory vehicleId = "VEH001";
        bytes32 zkProofHash = keccak256("test-proof");
        uint256 paymentAmount = initialTollRate;
        
        // Register vehicle
        vm.prank(operator);
        tollCollection.registerVehicle(vehicleId, user);
        
        // Blacklist vehicle
        vm.prank(operator);
        tollCollection.setVehicleBlacklistStatus(vehicleId, true);
        
        // Attempt toll payment
        vm.prank(user);
        vm.expectRevert("Vehicle is blacklisted");
        tollCollection.processTollPayment(vehicleId, zkProofHash, paymentAmount);
    }

    function testTollRateUpdate() public {
        uint256 newRate = 2000;
        
        vm.prank(owner);
        tollCollection.updateTollRate(newRate);
        
        assertEq(tollCollection.tollRate(), newRate);
    }

    function testRevenueWithdrawal() public {
        string memory vehicleId = "VEH001";
        bytes32 zkProofHash = keccak256("test-proof");
        uint256 paymentAmount = initialTollRate;
        
        // Register vehicle and process payment
        vm.prank(operator);
        tollCollection.registerVehicle(vehicleId, user);
        
        vm.prank(user);
        tollCollection.processTollPayment(vehicleId, zkProofHash, paymentAmount);
        
        // Withdraw revenue
        uint256 balanceBefore = token.balanceOf(admin);
        vm.prank(owner);
        tollCollection.withdrawRevenue(admin, paymentAmount);
        uint256 balanceAfter = token.balanceOf(admin);
        
        assertEq(balanceAfter - balanceBefore, paymentAmount);
        assertEq(tollCollection.totalRevenue(), 0);
    }

    function testPauseUnpause() public {
        vm.prank(owner);
        tollCollection.pause();
        assertTrue(tollCollection.paused());
        
        vm.prank(owner);
        tollCollection.unpause();
        assertFalse(tollCollection.paused());
    }

    function testOnlyOwnerCanUpdateTollRate() public {
        vm.prank(user);
        vm.expectRevert();
        tollCollection.updateTollRate(2000);
    }

    function testOnlyAuthorizedOperatorCanRegisterVehicle() public {
        vm.prank(user);
        vm.expectRevert("Not authorized");
        tollCollection.registerVehicle("VEH001", user);
    }

    function testGetUserVehicles() public {
        string memory vehicleId1 = "VEH001";
        string memory vehicleId2 = "VEH002";
        
        // Register vehicles
        vm.prank(operator);
        tollCollection.registerVehicle(vehicleId1, user);
        
        vm.prank(operator);
        tollCollection.registerVehicle(vehicleId2, user);
        
        // Get user vehicles
        string[] memory userVehicles = tollCollection.getUserVehicles(user);
        assertEq(userVehicles.length, 2);
        assertEq(userVehicles[0], vehicleId1);
        assertEq(userVehicles[1], vehicleId2);
    }
}
