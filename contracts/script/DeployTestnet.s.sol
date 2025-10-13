// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TollCollection.sol";
import "../src/AnonAadhaarVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 token for testnet deployment
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC (6 decimals)
    }
}

contract DeployTestnetScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts to TESTNET with account:", deployer);
        console.log("Account balance:", deployer.balance);
        console.log("Network:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy mock USDC token
        MockUSDC usdc = new MockUSDC();
        console.log("USDC deployed at:", address(usdc));

        // Deploy AnonAadhaar verifier
        AnonAadhaarVerifier verifier = new AnonAadhaarVerifier(deployer);
        console.log("AnonAadhaarVerifier deployed at:", address(verifier));

        // Deploy TollCollection contract with lower toll rate for testnet
        uint256 initialTollRate = 0.1 * 10**6; // 0.1 USDC (6 decimals) - lower for testing
        TollCollection tollCollection = new TollCollection(address(usdc), initialTollRate, address(0));
        console.log("TollCollection deployed at:", address(tollCollection));

        // Set up initial operators
        tollCollection.setOperatorAuthorization(address(verifier), true);
        console.log("Verifier authorized as operator");

        // Transfer some USDC to the toll collection contract for testing
        usdc.transfer(address(tollCollection), 10000 * 10**6); // 10,000 USDC
        console.log("Transferred 10,000 USDC to TollCollection contract");

        vm.stopBroadcast();

        // Save deployment addresses
        string memory deploymentInfo = string(abi.encodePacked(
            "TESTNET Deployment completed successfully!\n",
            "Network ID: ", vm.toString(block.chainid), "\n",
            "USDC Token: ", vm.toString(address(usdc)), "\n",
            "AnonAadhaarVerifier: ", vm.toString(address(verifier)), "\n",
            "TollCollection: ", vm.toString(address(tollCollection)), "\n",
            "Initial Toll Rate: ", vm.toString(initialTollRate), " USDC\n",
            "Contract USDC Balance: 10,000 USDC\n"
        ));
        
        console.log(deploymentInfo);
        
        // Write addresses to file for easy access
        vm.writeFile(
            "testnet-deployment.json",
            string(abi.encodePacked(
                '{\n',
                '  "networkId": ', vm.toString(block.chainid), ',\n',
                '  "usdcAddress": "', vm.toString(address(usdc)), '",\n',
                '  "verifierAddress": "', vm.toString(address(verifier)), '",\n',
                '  "tollCollectionAddress": "', vm.toString(address(tollCollection)), '",\n',
                '  "tollRate": "', vm.toString(initialTollRate), '",\n',
                '  "deployer": "', vm.toString(deployer), '"\n',
                '}'
            ))
        );
        
        console.log("Deployment info saved to testnet-deployment.json");
    }
}
