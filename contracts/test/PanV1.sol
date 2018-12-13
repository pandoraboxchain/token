pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../Pan.sol";


/**
 * @title PanV1
 * @dev Adds to Pan contract pausable features
 */
contract PanV1 is Pan, Pausable {

    modifier pausableInitialized() {
        require(isFeatureInitialized(keccak256("pausable")), "ERROR_FEATURE_NOT_INITIALIZED");
        _;
    }

    function initializePausable(address _pauser) public {
        require(_pauser != address(0), "ERROR_INVALID_ADDRESS");
        _setFeatureInitialized(keccak256("pausable"));

        if (!isPauser(_pauser)) {
            _addPauser(_pauser);
        }
    }

    
    /**
     * @dev called by the owner to pause, triggers stopped state
     */
    function pause() public pausableInitialized onlyPauser whenNotPaused {
        return super.pause();
    }

    function transfer(
        address to,
        uint256 value
    ) public whenNotPaused returns(bool) {
        return super.transfer(to, value);
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public whenNotPaused returns(bool) {
        return super.transferFrom(from, to, value);
    }

    function approve(
        address spender,
        uint256 value
    )
    public whenNotPaused returns(bool) {
        return super.approve(spender, value);
    }

    function increaseAllowance(
        address spender,
        uint addedValue
    ) public whenNotPaused returns(bool success) {
        return super.increaseAllowance(spender, addedValue);
    }

    function decreaseAllowance(
        address spender,
        uint subtractedValue
    ) public whenNotPaused returns(bool success) {
        return super.decreaseAllowance(spender, subtractedValue);
    }
}
