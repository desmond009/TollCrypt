// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TollCollection.sol";

contract UpdateFactoryAddressScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Updating factory address with account:", deployer);
        
        // Contract addresses
        address topUpTollCollectionAddress = 0xE5f4743CF4726A7f58E0ccBB5888f1507E5aeF9d;
        address correctFactoryAddress = 0x3Bd98A2a16EfEa3B40B0d5F8a2E16613b625d9aA;
        
        vm.startBroadcast(deployerPrivateKey);
        
        TollCollection topUpTollCollection = TollCollection(topUpTollCollectionAddress);
        
        // Update the factory address
        topUpTollCollection.setTopUpWalletFactory(correctFactoryAddress);
        console.log("Factory address updated to:", correctFactoryAddress);
        
        // Verify the update
        address factoryInContract = address(topUpTollCollection.topUpWalletFactory());
        console.log("Factory address in contract:", factoryInContract);
        console.log("Expected factory address:", correctFactoryAddress);
        console.log("Addresses match:", factoryInContract == correctFactoryAddress);
        
        vm.stopBroadcast();
        
        console.log("=== Update Complete ===");
        console.log("TopUp TollCollection:", topUpTollCollectionAddress);
        console.log("Updated Factory Address:", correctFactoryAddress);
    }
}
