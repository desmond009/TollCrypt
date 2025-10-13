// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TollCollection.sol";

contract CheckTollCollectionScript is Script {
    function run() external view {
        // Use the deployed addresses
        address tollCollectionAddress = 0xeC9423d9EBFe0C0f49F7bc221aE52572E8734291;
        address topUpTollCollectionAddress = 0xE5f4743CF4726A7f58E0ccBB5888f1507E5aeF9d;
        address factoryAddress = 0x3Bd98A2a16EfEa3B40B0d5F8a2E16613b625d9aA;
        
        console.log("=== Main TollCollection Contract ===");
        console.log("Address:", tollCollectionAddress);
        
        TollCollection tollCollection = TollCollection(tollCollectionAddress);
        
        // Check basic contract info
        address owner = tollCollection.owner();
        console.log("Owner:", owner);
        
        uint256 tollRate = tollCollection.tollRate();
        console.log("Toll Rate:", tollRate);
        
        uint256 totalRevenue = tollCollection.totalRevenue();
        console.log("Total Revenue:", totalRevenue);
        
        console.log("\n=== TopUp TollCollection Contract ===");
        console.log("Address:", topUpTollCollectionAddress);
        
        TollCollection topUpTollCollection = TollCollection(topUpTollCollectionAddress);
        
        // Check the factory address
        address factoryInContract = address(topUpTollCollection.topUpWalletFactory());
        console.log("Factory address in contract:", factoryInContract);
        console.log("Expected factory address:", factoryAddress);
        
        // Check if our factory is authorized
        bool isAuthorized = topUpTollCollection.isTopUpWalletAuthorized(factoryAddress);
        console.log("Is factory authorized:", isAuthorized);
        
        address topUpOwner = topUpTollCollection.owner();
        console.log("TopUp TollCollection owner:", topUpOwner);
        
        uint256 topUpTollRate = topUpTollCollection.tollRate();
        console.log("TopUp Toll Rate:", topUpTollRate);
    }
}
