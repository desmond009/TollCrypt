// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

contract VerifyDeployment is Script {
    function run() external {
        // Contract addresses from the deployment
        address tollCollectionAddress = 0x03D06643229896b61651925825434a8c364F95Eb;
        address factoryAddress = 0xE199D737d625dB8B38A622f3c7083efFe682C340;
        
        console.log("Checking contract deployment...");
        console.log("TollCollection address:", tollCollectionAddress);
        console.log("Factory address:", factoryAddress);
        
        // Check if contracts exist by checking their code size
        uint256 tollCollectionCodeSize = tollCollectionAddress.code.length;
        uint256 factoryCodeSize = factoryAddress.code.length;
        
        console.log("TollCollection code size:", tollCollectionCodeSize);
        console.log("Factory code size:", factoryCodeSize);
        
        if (tollCollectionCodeSize > 0) {
            console.log("SUCCESS: TollCollection contract is deployed");
        } else {
            console.log("ERROR: TollCollection contract not found");
        }
        
        if (factoryCodeSize > 0) {
            console.log("SUCCESS: TopUpWalletFactory contract is deployed");
        } else {
            console.log("ERROR: TopUpWalletFactory contract not found");
        }
    }
}
