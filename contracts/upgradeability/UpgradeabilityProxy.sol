pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/utils/Address.sol";
import "./Proxy.sol";


/**
 * @title UpgradeabilityProxy
 * @dev This contract represents a proxy where the implementation address to which it will delegate can be upgraded
 */
contract UpgradeabilityProxy is Proxy {

    // Storage position of the address of the current implementation
    bytes32 private constant IMPLEMENTATION_POSITION = keccak256("proxy.implementation");

    /**
     * @dev This event will be emitted every time the implementation gets upgraded
     * @param implementation representing the address of the upgraded implementation
     */
    event Upgraded(address indexed implementation);

    /**
     * @dev Tells the address of the current implementation
     * @return address of the current implementation
     */
    function implementation() public view returns(address impl) {
        bytes32 position = IMPLEMENTATION_POSITION;
        assembly {
            impl := sload(position)
        }
    }

    /**
     * @dev Sets the address of the current implementation
     * @param newImplementation address representing the new implementation to be set
     */
    function setImplementation(address newImplementation) internal {
        bytes32 position = IMPLEMENTATION_POSITION;
        assembly {
            sstore(position, newImplementation)
        }
    }

    /**
     * @dev Upgrades the implementation address
     * @param newImplementation representing the address of the new implementation to be set
     */
    function _upgradeTo(address newImplementation) internal {
        require(Address.isContract(newImplementation), "ERROR_INVALID_IMPLEMENTATION_ADDRESS");
        address currentImplementation = implementation();
        require(currentImplementation != newImplementation, "ERROR_SAME_IMPLEMENTATION");
        setImplementation(newImplementation);
        emit Upgraded(newImplementation);
    }
}
