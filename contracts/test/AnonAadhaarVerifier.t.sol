// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AnonAadhaarVerifier.sol";

contract AnonAadhaarVerifierTest is Test {
    AnonAadhaarVerifier public verifier;
    address public owner;
    address public authorizedVerifier;
    address public user1;
    address public user2;

    event ProofVerified(address indexed user, bytes32 proofHash, bool isValid, uint256 timestamp);
    event UserVerified(address indexed user, uint256 timestamp);

    function setUp() public {
        owner = address(this);
        authorizedVerifier = makeAddr("authorizedVerifier");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // Deploy the verifier contract
        verifier = new AnonAadhaarVerifier(authorizedVerifier);
    }

    function testInitialState() public {
        assertEq(verifier.owner(), owner);
        assertTrue(verifier.authorizedVerifiers(authorizedVerifier));
        assertTrue(verifier.authorizedVerifiers(owner));
        assertEq(verifier.getVerifiedProofCount(), 0);
        assertEq(verifier.getVerifiedUserCount(), 0);
    }

    function testVerifyAnonAadhaarProof() public {
        // Prepare test data
        bytes memory proof = abi.encodePacked(
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        );
        uint256[] memory publicInputs = new uint256[](2);
        publicInputs[0] = 12345;
        publicInputs[1] = 67890;

        // Verify the proof
        vm.prank(authorizedVerifier);
        bool isValid = verifier.verifyAnonAadhaarProof(proof, publicInputs, user1);

        assertTrue(isValid);
        assertTrue(verifier.isUserVerified(user1));
        assertEq(verifier.getVerifiedProofCount(), 1);
        assertEq(verifier.getVerifiedUserCount(), 1);
        assertTrue(verifier.userVerificationTimestamp(user1) > 0);
    }

    function testVerifyProofWithInvalidData() public {
        // Test with empty proof
        bytes memory emptyProof = "";
        uint256[] memory publicInputs = new uint256[](2);
        publicInputs[0] = 12345;
        publicInputs[1] = 67890;

        vm.prank(authorizedVerifier);
        vm.expectRevert("Empty proof");
        verifier.verifyAnonAadhaarProof(emptyProof, publicInputs, user1);
    }

    function testVerifyProofWithInvalidPublicInputs() public {
        bytes memory proof = abi.encodePacked("0x1234567890abcdef");
        uint256[] memory emptyInputs = new uint256[](0);

        vm.prank(authorizedVerifier);
        vm.expectRevert("Invalid public inputs length");
        verifier.verifyAnonAadhaarProof(proof, emptyInputs, user1);
    }

    function testVerifyProofWithInvalidUserAddress() public {
        bytes memory proof = abi.encodePacked("0x1234567890abcdef");
        uint256[] memory publicInputs = new uint256[](2);
        publicInputs[0] = 12345;
        publicInputs[1] = 67890;

        vm.prank(authorizedVerifier);
        vm.expectRevert("Invalid user address");
        verifier.verifyAnonAadhaarProof(proof, publicInputs, address(0));
    }

    function testVerifyProofWithUnauthorizedVerifier() public {
        bytes memory proof = abi.encodePacked("0x1234567890abcdef");
        uint256[] memory publicInputs = new uint256[](2);
        publicInputs[0] = 12345;
        publicInputs[1] = 67890;

        vm.prank(user1);
        vm.expectRevert("Not authorized verifier");
        verifier.verifyAnonAadhaarProof(proof, publicInputs, user1);
    }

    function testBatchVerifyAnonAadhaarProofs() public {
        // Prepare test data for batch verification
        bytes[] memory proofs = new bytes[](2);
        proofs[0] = abi.encodePacked("0x1234567890abcdef1234567890abcdef");
        proofs[1] = abi.encodePacked("0xabcdef1234567890abcdef1234567890");

        uint256[][] memory publicInputsArray = new uint256[][](2);
        publicInputsArray[0] = new uint256[](2);
        publicInputsArray[0][0] = 11111;
        publicInputsArray[0][1] = 22222;
        publicInputsArray[1] = new uint256[](2);
        publicInputsArray[1][0] = 33333;
        publicInputsArray[1][1] = 44444;

        address[] memory userAddresses = new address[](2);
        userAddresses[0] = user1;
        userAddresses[1] = user2;

        // Verify batch proofs
        vm.prank(authorizedVerifier);
        bool[] memory results = verifier.batchVerifyAnonAadhaarProofs(
            proofs,
            publicInputsArray,
            userAddresses
        );

        assertTrue(results[0]);
        assertTrue(results[1]);
        assertTrue(verifier.isUserVerified(user1));
        assertTrue(verifier.isUserVerified(user2));
        assertEq(verifier.getVerifiedProofCount(), 2);
        assertEq(verifier.getVerifiedUserCount(), 2);
    }

    function testBatchVerifyWithMismatchedArrayLengths() public {
        bytes[] memory proofs = new bytes[](2);
        uint256[][] memory publicInputsArray = new uint256[][](1); // Mismatched length
        address[] memory userAddresses = new address[](2);

        vm.prank(authorizedVerifier);
        vm.expectRevert("Array length mismatch");
        verifier.batchVerifyAnonAadhaarProofs(proofs, publicInputsArray, userAddresses);
    }

    function testBatchVerifyWithTooManyProofs() public {
        bytes[] memory proofs = new bytes[](51); // Too many
        uint256[][] memory publicInputsArray = new uint256[][](51);
        address[] memory userAddresses = new address[](51);

        vm.prank(authorizedVerifier);
        vm.expectRevert("Too many proofs in batch");
        verifier.batchVerifyAnonAadhaarProofs(proofs, publicInputsArray, userAddresses);
    }

    function testPreventReplayAttack() public {
        bytes memory proof = abi.encodePacked("0x1234567890abcdef1234567890abcdef");
        uint256[] memory publicInputs = new uint256[](2);
        publicInputs[0] = 12345;
        publicInputs[1] = 67890;

        // First verification should succeed
        vm.prank(authorizedVerifier);
        bool isValid1 = verifier.verifyAnonAadhaarProof(proof, publicInputs, user1);
        assertTrue(isValid1);

        // Second verification with same user should fail (replay attack)
        vm.prank(authorizedVerifier);
        bool isValid2 = verifier.verifyAnonAadhaarProof(proof, publicInputs, user1);
        assertFalse(isValid2);
    }

    function testUpdateVerifierContract() public {
        address newVerifier = makeAddr("newVerifier");
        
        verifier.updateVerifierContract(newVerifier);
        assertEq(verifier.verifierContract(), newVerifier);
    }

    function testUpdateVerifierContractWithZeroAddress() public {
        vm.expectRevert("Invalid verifier address");
        verifier.updateVerifierContract(address(0));
    }

    function testSetVerifierAuthorization() public {
        address newVerifier = makeAddr("newVerifier");
        
        verifier.setVerifierAuthorization(newVerifier, true);
        assertTrue(verifier.authorizedVerifiers(newVerifier));
        
        verifier.setVerifierAuthorization(newVerifier, false);
        assertFalse(verifier.authorizedVerifiers(newVerifier));
    }

    function testSetVerifierAuthorizationWithZeroAddress() public {
        vm.expectRevert("Invalid verifier address");
        verifier.setVerifierAuthorization(address(0), true);
    }

    function testUpdateCircuitHash() public {
        bytes32 newCircuitHash = keccak256(abi.encodePacked("new-circuit-v2"));
        
        verifier.updateCircuitHash(newCircuitHash);
        assertEq(verifier.circuitHash(), newCircuitHash);
    }

    function testRevokeUserVerification() public {
        // First verify a user
        bytes memory proof = abi.encodePacked("0x1234567890abcdef1234567890abcdef");
        uint256[] memory publicInputs = new uint256[](2);
        publicInputs[0] = 12345;
        publicInputs[1] = 67890;

        vm.prank(authorizedVerifier);
        verifier.verifyAnonAadhaarProof(proof, publicInputs, user1);
        
        assertTrue(verifier.isUserVerified(user1));
        assertTrue(verifier.userVerificationTimestamp(user1) > 0);

        // Revoke verification
        verifier.revokeUserVerification(user1);
        
        assertFalse(verifier.isUserVerified(user1));
        assertEq(verifier.userVerificationTimestamp(user1), 0);
    }

    function testRevokeUserVerificationForUnverifiedUser() public {
        vm.expectRevert("User not verified");
        verifier.revokeUserVerification(user1);
    }

    function testGetContractStats() public {
        // Verify a user first
        bytes memory proof = abi.encodePacked("0x1234567890abcdef1234567890abcdef");
        uint256[] memory publicInputs = new uint256[](2);
        publicInputs[0] = 12345;
        publicInputs[1] = 67890;

        vm.prank(authorizedVerifier);
        verifier.verifyAnonAadhaarProof(proof, publicInputs, user1);

        // Get contract stats
        (
            uint256 totalVerifications,
            uint256 totalUsers,
            bytes32 currentCircuitHash,
            address currentVerifier
        ) = verifier.getContractStats();

        assertEq(totalVerifications, 1);
        assertEq(totalUsers, 1);
        assertEq(currentCircuitHash, verifier.circuitHash());
        assertEq(currentVerifier, verifier.verifierContract());
    }

    function testProofValidationWithShortProof() public {
        bytes memory shortProof = abi.encodePacked("0x1234"); // Too short
        uint256[] memory publicInputs = new uint256[](2);
        publicInputs[0] = 12345;
        publicInputs[1] = 67890;

        vm.prank(authorizedVerifier);
        bool isValid = verifier.verifyAnonAadhaarProof(shortProof, publicInputs, user1);
        assertFalse(isValid);
    }

    function testProofValidationWithLongProof() public {
        // Create a proof that's too long (> 10000 bytes)
        bytes memory longProof = new bytes(10001);
        uint256[] memory publicInputs = new uint256[](2);
        publicInputs[0] = 12345;
        publicInputs[1] = 67890;

        vm.prank(authorizedVerifier);
        bool isValid = verifier.verifyAnonAadhaarProof(longProof, publicInputs, user1);
        assertFalse(isValid);
    }

    function testProofValidationWithZeroPublicInputs() public {
        bytes memory proof = abi.encodePacked("0x1234567890abcdef1234567890abcdef");
        uint256[] memory publicInputs = new uint256[](2);
        publicInputs[0] = 0; // Zero input
        publicInputs[1] = 67890;

        vm.prank(authorizedVerifier);
        bool isValid = verifier.verifyAnonAadhaarProof(proof, publicInputs, user1);
        assertFalse(isValid);
    }

    function testEventsEmitted() public {
        bytes memory proof = abi.encodePacked("0x1234567890abcdef1234567890abcdef");
        uint256[] memory publicInputs = new uint256[](2);
        publicInputs[0] = 12345;
        publicInputs[1] = 67890;

        vm.prank(authorizedVerifier);
        vm.expectEmit(true, false, false, true);
        emit ProofVerified(user1, bytes32(0), true, block.timestamp);
        vm.expectEmit(true, false, false, true);
        emit UserVerified(user1, block.timestamp);
        
        verifier.verifyAnonAadhaarProof(proof, publicInputs, user1);
    }
}
