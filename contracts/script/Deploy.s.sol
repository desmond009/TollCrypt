// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TollCollection.sol";
import "../src/AnonAadhaarVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 token for deployment
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC (6 decimals)
    }
}

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy mock USDC token
        MockUSDC usdc = new MockUSDC();
        console.log("USDC deployed at:", address(usdc));

        // Deploy AnonAadhaar verifier
        AnonAadhaarVerifier verifier = new AnonAadhaarVerifier(deployer);
        console.log("AnonAadhaarVerifier deployed at:", address(verifier));

        // Deploy TollCollection contract
        uint256 initialTollRate = 1 * 10**6; // 1 USDC (6 decimals)
        TollCollection tollCollection = new TollCollection(address(usdc), initialTollRate);
        console.log("TollCollection deployed at:", address(tollCollection));

        // Set up initial operators
        tollCollection.setOperatorAuthorization(address(verifier), true);
        console.log("Verifier authorized as operator");

        vm.stopBroadcast();

        // Save deployment addresses
        string memory deploymentInfo = string(abi.encodePacked(
            "Deployment completed successfully!\n",
            "USDC Token: ", vm.toString(address(usdc)), "\n",
            "AnonAadhaarVerifier: ", vm.toString(address(verifier)), "\n",
            "TollCollection: ", vm.toString(address(tollCollection)), "\n",
            "Initial Toll Rate: ", vm.toString(initialTollRate), " USDC\n"
        ));
        
        console.log(deploymentInfo);
    }
}
