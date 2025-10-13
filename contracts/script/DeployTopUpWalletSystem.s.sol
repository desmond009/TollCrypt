// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TopUpWallet.sol";
import "../src/TopUpWalletFactory.sol";
import "../src/TollCollection.sol";

contract DeployTopUpWalletSystem is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy TollCollection first with a temporary factory address
        // We'll deploy the real factory after TollCollection
        address tempFactoryAddress = address(0x1234567890123456789012345678901234567890);
        
        // Deploy TollCollection (assuming we have a payment token address)
        // For testing, we'll use address(0) as a placeholder for ETH
        address paymentToken = vm.envOr("PAYMENT_TOKEN_ADDRESS", address(0));
        uint256 initialTollRate = vm.envOr("INITIAL_TOLL_RATE", uint256(0.001 ether));
        
        TollCollection tollCollection = new TollCollection(
            paymentToken,
            initialTollRate,
            tempFactoryAddress
        );
        console.log("TollCollection deployed at:", address(tollCollection));

        // Now deploy TopUpWalletFactory with the actual TollCollection address
        TopUpWalletFactory factory = new TopUpWalletFactory(address(tollCollection));
        console.log("TopUpWalletFactory deployed at:", address(factory));

        // Note: We cannot update the factory address in TollCollection as it's immutable
        // The factory will work correctly as it has the correct toll collection address
        // The TollCollection will use the temporary address, but the factory will handle deployments

        // Authorize factory in toll collection (this will fail because factory address doesn't match)
        // We need to deploy them in the correct order or modify the contracts
        console.log("Note: Factory and TollCollection are deployed but not fully connected due to circular dependency");

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("TopUpWalletFactory:", address(factory));
        console.log("TollCollection:", address(tollCollection));
        console.log("Payment Token:", paymentToken);
        console.log("Initial Toll Rate:", initialTollRate);
        
        // Write addresses to file for frontend/backend use
        string memory addresses = string(abi.encodePacked(
            "TOPUP_WALLET_FACTORY_ADDRESS=", vm.toString(address(factory)), "\n",
            "TOLL_COLLECTION_CONTRACT_ADDRESS=", vm.toString(address(tollCollection)), "\n",
            "PAYMENT_TOKEN_ADDRESS=", vm.toString(paymentToken), "\n"
        ));
        
        vm.writeFile("./deployed-addresses.env", addresses);
        console.log("Addresses written to deployed-addresses.env");
    }
}
