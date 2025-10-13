// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TopUpWallet.sol";
import "../src/TopUpWalletFactory.sol";
import "../src/TollCollection.sol";

contract DeployTopUpWalletSystemFixed is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy TollCollection first with a temporary factory address
        address paymentToken = vm.envOr("PAYMENT_TOKEN_ADDRESS", address(0));
        uint256 initialTollRate = vm.envOr("INITIAL_TOLL_RATE", uint256(0.001 ether));
        
        // Use deployer address as temporary factory address
        TollCollection tollCollection = new TollCollection(
            paymentToken,
            initialTollRate,
            deployer // Use deployer as temporary factory address
        );
        console.log("TollCollection deployed at:", address(tollCollection));

        // Deploy TopUpWalletFactory with the actual TollCollection address
        TopUpWalletFactory factory = new TopUpWalletFactory(address(tollCollection));
        console.log("TopUpWalletFactory deployed at:", address(factory));

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("TopUpWalletFactory:", address(factory));
        console.log("TollCollection:", address(tollCollection));
        console.log("Payment Token:", paymentToken);
        console.log("Initial Toll Rate:", initialTollRate);
        
        console.log("\n=== Important Notes ===");
        console.log("1. The TollCollection was deployed with deployer address as factory");
        console.log("2. The TopUpWalletFactory was deployed with correct TollCollection address");
        console.log("3. You need to manually authorize the factory in TollCollection");
        console.log("4. Use the factory address to deploy top-up wallets");
    }
}
