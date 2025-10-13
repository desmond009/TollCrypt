// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TopUpWallet.sol";
import "../src/TopUpWalletFactory.sol";
import "../src/TollCollection.sol";

contract TopUpWalletSystemTest is Test {
    TopUpWalletFactory public factory;
    TollCollection public tollCollection;
    TopUpWallet public topUpWallet;
    
    address public owner = address(0x1);
    address public user = address(0x2);
    address public paymentToken = address(0x3);
    
    uint256 public initialTollRate = 0.001 ether;

    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy factory with temporary address
        factory = new TopUpWalletFactory(address(0x123)); // Will be updated
        
        // Deploy toll collection
        tollCollection = new TollCollection(
            paymentToken,
            initialTollRate,
            address(factory)
        );
        
        // Update factory with toll collection address
        factory.updateTollContract(address(tollCollection));
        
        // Authorize factory in toll collection (this should be done by the factory itself)
        // The factory will authorize itself when deploying wallets
        
        vm.stopPrank();
    }

    function testDeployTopUpWallet() public {
        vm.startPrank(owner);
        
        // Deploy wallet for user
        address walletAddress = factory.deployTopUpWallet(user);
        assertTrue(walletAddress != address(0));
        
        // Check if wallet is deployed
        assertTrue(factory.hasTopUpWallet(user));
        assertEq(factory.getUserTopUpWallet(user), walletAddress);
        
        // Check wallet ownership
        topUpWallet = TopUpWallet(payable(walletAddress));
        assertEq(topUpWallet.owner(), user);
        assertTrue(topUpWallet.isInitialized());
        
        vm.stopPrank();
    }

    function testTopUpWalletFunctionality() public {
        vm.startPrank(owner);
        
        // Deploy wallet
        address walletAddress = factory.deployTopUpWallet(user);
        topUpWallet = TopUpWallet(payable(walletAddress));
        
        vm.stopPrank();
        
        // Test top-up functionality
        vm.startPrank(user);
        vm.deal(user, 1 ether);
        
        // Top up wallet
        topUpWallet.topUp{value: 0.1 ether}("");
        
        // Check balance
        assertEq(topUpWallet.getBalance(), 0.1 ether);
        
        // Check stats
        (uint256 totalTopUps, uint256 totalTollPayments, uint256 totalWithdrawals, uint256 currentBalance) = topUpWallet.getWalletStats();
        assertEq(totalTopUps, 0.1 ether);
        assertEq(totalTollPayments, 0);
        assertEq(totalWithdrawals, 0);
        assertEq(currentBalance, 0.1 ether);
        
        vm.stopPrank();
    }

    function testTollPaymentFromTopUpWallet() public {
        vm.startPrank(owner);
        
        // Deploy wallet
        address walletAddress = factory.deployTopUpWallet(user);
        topUpWallet = TopUpWallet(payable(walletAddress));
        
        // Register a vehicle
        tollCollection.registerVehicle("VEHICLE123", user);
        
        vm.stopPrank();
        
        // Top up wallet
        vm.startPrank(user);
        vm.deal(user, 1 ether);
        topUpWallet.topUp{value: 0.1 ether}("");
        
        // Process toll payment
        topUpWallet.processTollPayment(
            0.01 ether,
            "VEHICLE123",
            keccak256("test-proof")
        );
        
        // Check balance after payment
        assertEq(topUpWallet.getBalance(), 0.09 ether);
        
        vm.stopPrank();
    }

    function testWithdrawalFromTopUpWallet() public {
        vm.startPrank(owner);
        
        // Deploy wallet
        address walletAddress = factory.deployTopUpWallet(user);
        topUpWallet = TopUpWallet(payable(walletAddress));
        
        vm.stopPrank();
        
        // Top up wallet
        vm.startPrank(user);
        vm.deal(user, 1 ether);
        topUpWallet.topUp{value: 0.1 ether}("");
        
        // Withdraw funds
        topUpWallet.withdraw(0.05 ether, "");
        
        // Check balance after withdrawal
        assertEq(topUpWallet.getBalance(), 0.05 ether);
        
        // Check stats
        (uint256 totalTopUps, uint256 totalTollPayments, uint256 totalWithdrawals, uint256 currentBalance) = topUpWallet.getWalletStats();
        assertEq(totalTopUps, 0.1 ether);
        assertEq(totalTollPayments, 0);
        assertEq(totalWithdrawals, 0.05 ether);
        assertEq(currentBalance, 0.05 ether);
        
        vm.stopPrank();
    }

    function testBatchWalletDeployment() public {
        vm.startPrank(owner);
        
        address[] memory users = new address[](3);
        users[0] = address(0x10);
        users[1] = address(0x11);
        users[2] = address(0x12);
        
        // Deploy wallets in batch
        address[] memory walletAddresses = factory.deployTopUpWalletsBatch(users);
        
        // Check all wallets are deployed
        assertEq(walletAddresses.length, 3);
        for (uint256 i = 0; i < users.length; i++) {
            assertTrue(factory.hasTopUpWallet(users[i]));
            assertEq(factory.getUserTopUpWallet(users[i]), walletAddresses[i]);
        }
        
        vm.stopPrank();
    }

    function testFactoryAuthorization() public {
        vm.startPrank(owner);
        
        // Check factory is authorized
        assertTrue(tollCollection.isTopUpWalletAuthorized(address(factory)));
        
        // Deploy wallet
        address walletAddress = factory.deployTopUpWallet(user);
        
        // Check wallet is authorized
        assertTrue(tollCollection.isTopUpWalletAuthorized(walletAddress));
        
        vm.stopPrank();
    }

    function testEmergencyWithdrawal() public {
        vm.startPrank(owner);
        
        // Deploy wallet
        address walletAddress = factory.deployTopUpWallet(user);
        topUpWallet = TopUpWallet(payable(walletAddress));
        
        vm.stopPrank();
        
        // Top up wallet
        vm.startPrank(user);
        vm.deal(user, 1 ether);
        topUpWallet.topUp{value: 0.1 ether}("");
        vm.stopPrank();
        
        // Emergency withdrawal by owner
        vm.startPrank(owner);
        topUpWallet.emergencyWithdraw(0.05 ether);
        
        // Check balance
        assertEq(topUpWallet.getBalance(), 0.05 ether);
        
        vm.stopPrank();
    }

    function testPauseUnpause() public {
        vm.startPrank(owner);
        
        // Deploy wallet
        address walletAddress = factory.deployTopUpWallet(user);
        topUpWallet = TopUpWallet(payable(walletAddress));
        
        // Pause wallet
        topUpWallet.pause();
        
        vm.stopPrank();
        
        // Try to top up while paused (should fail)
        vm.startPrank(user);
        vm.deal(user, 1 ether);
        
        vm.expectRevert();
        topUpWallet.topUp{value: 0.1 ether}("");
        
        vm.stopPrank();
        
        // Unpause wallet
        vm.startPrank(owner);
        topUpWallet.unpause();
        
        vm.stopPrank();
        
        // Now top up should work
        vm.startPrank(user);
        vm.deal(user, 1 ether);
        topUpWallet.topUp{value: 0.1 ether}("");
        
        assertEq(topUpWallet.getBalance(), 0.1 ether);
        
        vm.stopPrank();
    }
}
