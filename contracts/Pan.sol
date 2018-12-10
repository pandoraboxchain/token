pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";


contract Pan is ERC20Mintable {

    string public constant name = "Pandora AI Network Token";
    string public constant symbol = "PAN";
    uint public constant decimals = 18;

    /**
     * @dev Pan token constructor
     * @param _totalSupply Total amount of tokens that should be minted at contract creation
     * @notice All minted tokens will be transferred to the token creator 
     * and this amount will be allowed to be spent by the him
     */
    constructor (uint256 _totalSupply) public {
        mint(msg.sender, _totalSupply);
    }
}
