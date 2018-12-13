pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/access/roles/MinterRole.sol";
import "./lifestyle/FeatureInitializable.sol";


contract Pan is ERC20, MinterRole, FeatureInitializable {

    string public constant name = "Pandora AI Network Token";
    string public constant symbol = "PAN";
    uint public constant decimals = 18;

    /**
     * @dev Throws if called not initialized feature
     */
    modifier mintableInitialized() {
        require(isFeatureInitialized(keccak256("mintable")), "ERROR_FEATURE_NOT_INITIALIZED");
        _;
    }
    
    /**
     * @dev Initializing of mintable feature
     * @param _minter Minter address
     */
    function initializeMintable(address _minter) public {
        require(_minter != address(0), "ERROR_INVALID_ADDRESS");
        _setFeatureInitialized(keccak256("mintable"));

        if (!isMinter(_minter)) {
            _addMinter(_minter);
        }        
    }

    /**
     * @dev Function to mint tokens
     * @param to The address that will receive the minted tokens.
     * @param value The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(
        address to,
        uint256 value
    ) public mintableInitialized onlyMinter returns(bool) {
        _mint(to, value);
        return true;
    }
}
