pragma solidity 0.4.24;

import "../lifestyle/FeatureInitializable.sol";

/**
 * @title TestFeatureInitializable
 * @dev Testing interface for FeatureInitializable contract
 */
contract TestFeatureInitializable is FeatureInitializable {

    function setInitialised(bytes32 feature) public {
        _setFeatureInitialized(feature);
    }

    function isInitialised(bytes32 feature) public view returns (bool) {
        return bool(isFeatureInitialized(feature));
    }

    function testOnlyInitialized(bytes32 feature) public view onlyInitializedFeature(feature) returns (bool) {
        return true;
    }

    function testNotInitialized(bytes32 feature) public view notInitializedFeature(feature) returns (bool) {
        return true;
    }
}
