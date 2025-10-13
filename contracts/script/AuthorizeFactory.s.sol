// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TollCollection.sol";

contract AuthorizeFactoryScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Authorizing factory with account:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Contract addresses
        address topUpTollCollectionAddress = 0xE5f4743CF4726A7f58E0ccBB5888f1507E5aeF9d;
        address factoryAddress = 0x3Bd98A2a16EfEa3B40B0d5F8a2E16613b625d9aA;
        
        TollCollection topUpTollCollection = TollCollection(topUpTollCollectionAddress);
        
        // Authorize the factory
        topUpTollCollection.setTopUpWalletAuthorization(factoryAddress, true);
        console.log("Factory authorized successfully");
        
        // Verify authorization
        bool isAuthorized = topUpTollCollection.isTopUpWalletAuthorized(factoryAddress);
        console.log("Factory authorization status:", isAuthorized);
        
        vm.stopBroadcast();
        
        console.log("=== Authorization Complete ===");
        console.log("TopUp TollCollection:", topUpTollCollectionAddress);
        console.log("Factory Address:", factoryAddress);
        console.log("Authorized:", isAuthorized);
    }
}