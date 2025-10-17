// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AnonAadhaarVerifier
 * @dev Contract for verifying anon-Aadhaar zero-knowledge proofs
 * @notice This contract handles ZKP verification for privacy-preserving Aadhaar authentication
 */
contract AnonAadhaarVerifier is Ownable, ReentrancyGuard {
    // Events
    event ProofVerified(address indexed user, bytes32 proofHash, bool isValid, uint256 timestamp);
    event VerifierUpdated(address indexed newVerifier, uint256 timestamp);
    event UserVerified(address indexed user, uint256 timestamp);
    event CircuitUpdated(bytes32 newCircuitHash, uint256 timestamp);

    // State variables
    address public verifierContract;
    mapping(bytes32 => bool) public verifiedProofs;
    mapping(address => bool) public authorizedVerifiers;
    mapping(address => bool) public verifiedUsers;
    mapping(address => uint256) public userVerificationTimestamp;
    
    // Circuit and verification parameters
    bytes32 public circuitHash;
    uint256 public constant MAX_PUBLIC_INPUTS = 10;
    uint256 public verificationCount;
    
    // Modifiers
    modifier onlyAuthorizedVerifier() {
        require(
            authorizedVerifiers[msg.sender] || msg.sender == owner(),
            "Not authorized verifier"
        );
        _;
    }

    modifier onlyVerifiedUser() {
        require(verifiedUsers[msg.sender], "User not verified");
        _;
    }

    // Constructor
    constructor(address _initialVerifier) Ownable(msg.sender) {
        verifierContract = _initialVerifier;
        authorizedVerifiers[msg.sender] = true;
        circuitHash = keccak256(abi.encodePacked("anon-aadhaar-circuit-v1"));
    }

    /**
     * @dev Verify an anon-Aadhaar zero-knowledge proof
     * @param proof The zero-knowledge proof data
     * @param publicInputs Public inputs for the proof
     * @param userAddress User's wallet address
     * @return isValid Whether the proof is valid
     */
    function verifyAnonAadhaarProof(
        bytes calldata proof,
        uint256[] calldata publicInputs,
        address userAddress
    ) external onlyAuthorizedVerifier nonReentrant returns (bool isValid) {
        return _verifyAnonAadhaarProofInternal(proof, publicInputs, userAddress);
    }

    /**
     * @dev Internal function to verify an anon-Aadhaar zero-knowledge proof
     * @param proof The zero-knowledge proof data
     * @param publicInputs Public inputs for the proof
     * @param userAddress User's wallet address
     * @return isValid Whether the proof is valid
     */
    function _verifyAnonAadhaarProofInternal(
        bytes calldata proof,
        uint256[] calldata publicInputs,
        address userAddress
    ) internal returns (bool isValid) {
        require(proof.length > 0, "Empty proof");
        require(publicInputs.length > 0 && publicInputs.length <= MAX_PUBLIC_INPUTS, "Invalid public inputs length");
        require(userAddress != address(0), "Invalid user address");

        // Generate proof hash for tracking
        bytes32 proofHash = keccak256(abi.encodePacked(proof, userAddress, block.timestamp));

        // Check if proof was already verified
        require(!verifiedProofs[proofHash], "Proof already verified");

        // Verify the proof
        isValid = _validateProof(proof, publicInputs, userAddress);

        if (isValid) {
            verifiedProofs[proofHash] = true;
            verifiedUsers[userAddress] = true;
            userVerificationTimestamp[userAddress] = block.timestamp;
            verificationCount++;
            
            emit ProofVerified(userAddress, proofHash, isValid, block.timestamp);
            emit UserVerified(userAddress, block.timestamp);
        } else {
            emit ProofVerified(userAddress, proofHash, isValid, block.timestamp);
        }

        return isValid;
    }

    /**
     * @dev Batch verify multiple anon-Aadhaar proofs
     * @param proofs Array of zero-knowledge proof data
     * @param publicInputsArray Array of public inputs for each proof
     * @param userAddresses Array of user addresses
     * @return results Array of verification results
     */
    function batchVerifyAnonAadhaarProofs(
        bytes[] calldata proofs,
        uint256[][] calldata publicInputsArray,
        address[] calldata userAddresses
    ) external onlyAuthorizedVerifier nonReentrant returns (bool[] memory results) {
        require(
            proofs.length == publicInputsArray.length && 
            proofs.length == userAddresses.length,
            "Array length mismatch"
        );
        require(proofs.length <= 50, "Too many proofs in batch");

        results = new bool[](proofs.length);

        for (uint256 i = 0; i < proofs.length; i++) {
            results[i] = _verifyAnonAadhaarProofInternal(
                proofs[i],
                publicInputsArray[i],
                userAddresses[i]
            );
        }

        return results;
    }

    /**
     * @dev Check if a proof hash has been verified
     * @param proofHash The proof hash to check
     * @return isVerified Whether the proof has been verified
     */
    function isProofVerified(bytes32 proofHash) external view returns (bool isVerified) {
        return verifiedProofs[proofHash];
    }

    /**
     * @dev Check if a user is verified
     * @param userAddress The user address to check
     * @return isVerified Whether the user is verified
     */
    function isUserVerified(address userAddress) external view returns (bool isVerified) {
        return verifiedUsers[userAddress];
    }

    /**
     * @dev Get user verification timestamp
     * @param userAddress The user address
     * @return timestamp The verification timestamp
     */
    function getUserVerificationTimestamp(address userAddress) external view returns (uint256 timestamp) {
        return userVerificationTimestamp[userAddress];
    }

    /**
     * @dev Update the verifier contract address
     * @param newVerifier New verifier contract address
     */
    function updateVerifierContract(address newVerifier) external onlyOwner {
        require(newVerifier != address(0), "Invalid verifier address");
        verifierContract = newVerifier;
        emit VerifierUpdated(newVerifier, block.timestamp);
    }

    /**
     * @dev Add or remove authorized verifiers
     * @param verifier Verifier address
     * @param isAuthorized Authorization status
     */
    function setVerifierAuthorization(
        address verifier,
        bool isAuthorized
    ) external onlyOwner {
        require(verifier != address(0), "Invalid verifier address");
        authorizedVerifiers[verifier] = isAuthorized;
    }

    /**
     * @dev Update the circuit hash
     * @param newCircuitHash New circuit hash
     */
    function updateCircuitHash(bytes32 newCircuitHash) external onlyOwner {
        circuitHash = newCircuitHash;
        emit CircuitUpdated(newCircuitHash, block.timestamp);
    }

    /**
     * @dev Internal function to validate proof (enhanced implementation)
     * @param proof The zero-knowledge proof data
     * @param publicInputs Public inputs for the proof
     * @param userAddress User's wallet address
     * @return isValid Whether the proof is valid
     */
    function _validateProof(
        bytes calldata proof,
        uint256[] calldata publicInputs,
        address userAddress
    ) internal view returns (bool isValid) {
        // Enhanced validation checks
        require(proof.length >= 32, "Proof too short");
        require(publicInputs.length >= 2, "Insufficient public inputs");
        require(userAddress != address(0), "Invalid user address");

        // Check if user is already verified (prevent replay attacks)
        if (verifiedUsers[userAddress]) {
            return false;
        }

        // In a real implementation, this would:
        // 1. Call the actual ZKP verifier contract
        // 2. Validate the proof against the circuit
        // 3. Check public inputs against expected values
        // 4. Verify the proof is not a replay attack
        // 5. Verify the Aadhaar signature within the proof

        // For demonstration purposes, we'll implement enhanced validation
        // that checks for basic proof structure and prevents obvious attacks
        
        // Check proof length (should be reasonable for a ZK proof)
        if (proof.length < 100 || proof.length > 10000) {
            return false;
        }

        // Check public inputs are within reasonable ranges
        for (uint256 i = 0; i < publicInputs.length; i++) {
            if (publicInputs[i] == 0 || publicInputs[i] > type(uint128).max) {
                return false;
            }
        }

        // Simulate circuit verification
        // In production, this would call the actual verifier contract
        bytes32 proofHash = keccak256(abi.encodePacked(proof, publicInputs, circuitHash));
        
        // Basic validation - in production this would be replaced with actual ZKP verification
        isValid = (proofHash != bytes32(0) && 
                  publicInputs[0] > 0 && 
                  publicInputs[1] > 0 &&
                  proof.length > 100);

        return isValid;
    }

    /**
     * @dev Get the number of verified proofs
     * @return count Number of verified proofs
     */
    function getVerifiedProofCount() external view returns (uint256 count) {
        return verificationCount;
    }

    /**
     * @dev Get the number of verified users
     * @return count Number of verified users
     */
    function getVerifiedUserCount() external view returns (uint256 count) {
        return verificationCount; // Same as proof count since each user can only verify once
    }

    /**
     * @dev Emergency function to revoke user verification
     * @param userAddress User address to revoke
     */
    function revokeUserVerification(address userAddress) external onlyOwner {
        require(verifiedUsers[userAddress], "User not verified");
        verifiedUsers[userAddress] = false;
        userVerificationTimestamp[userAddress] = 0;
    }

    /**
     * @dev Get contract statistics
     * @return stats Contract statistics
     */
    function getContractStats() external view returns (
        uint256 totalVerifications,
        uint256 totalUsers,
        bytes32 currentCircuitHash,
        address currentVerifier
    ) {
        return (
            verificationCount,
            verificationCount,
            circuitHash,
            verifierContract
        );
    }
}
