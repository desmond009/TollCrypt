// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TopUpWallet.sol";
import "../src/TopUpWalletFactory.sol";
import "../src/TollCollection.sol";

contract DeployTopUpWalletFactoryOnly is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying TopUpWalletFactory with account:", deployer);
        console.log("Account balance:", deployer.balance);

        // Get existing TollCollection address from environment
        address existingTollCollection = vm.envAddress("EXISTING_TOLL_COLLECTION_ADDRESS");
        require(existingTollCollection != address(0), "EXISTING_TOLL_COLLECTION_ADDRESS not set");
        
        console.log("Using existing TollCollection at:", existingTollCollection);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy TopUpWalletFactory with existing TollCollection
        TopUpWalletFactory factory = new TopUpWalletFactory(existingTollCollection);
        console.log("TopUpWalletFactory deployed at:", address(factory));

        // Authorize factory in existing TollCollection
        TollCollection tollCollection = TollCollection(existingTollCollection);
        tollCollection.authorizeTopUpWalletFromFactory(address(factory));
        console.log("Factory authorized in existing TollCollection");

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("TopUpWalletFactory:", address(factory));
        console.log("Existing TollCollection:", existingTollCollection);
        
        // Write addresses to file for frontend/backend use
        string memory addresses = string(abi.encodePacked(
            "TOPUP_WALLET_FACTORY_ADDRESS=", vm.toString(address(factory)), "\n",
            "TOLL_COLLECTION_CONTRACT_ADDRESS=", vm.toString(existingTollCollection), "\n"
        ));
        
        vm.writeFile("./deployed-addresses.env", addresses);
        console.log("Addresses written to deployed-addresses.env");
    }
}
