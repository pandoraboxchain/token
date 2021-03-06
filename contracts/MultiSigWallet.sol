pragma solidity 0.4.24;


/**
 * @title Multisignature wallet - Allows multiple parties to agree on transactions before execution.
 */
contract MultiSigWallet {

    uint constant public MAX_OWNER_COUNT = 50;

    event Confirmation(address indexed sender, uint indexed transactionId);
    event Revocation(address indexed sender, uint indexed transactionId);
    event Submission(uint indexed transactionId);
    event Execution(uint indexed transactionId);
    event ExecutionFailure(uint indexed transactionId);
    event Deposit(address indexed sender, uint value);
    event Withdraw(address indexed to, uint value);
    event OwnerAddition(address indexed owner);
    event OwnerRemoval(address indexed owner);
    event RequirementChange(uint required);

    mapping(uint => Transaction) public transactions;
    mapping(uint => mapping(address => bool)) public confirmations;
    mapping(address => bool) public isOwner;
    address[] public owners;
    uint public required;
    uint public transactionCount;

    struct Transaction {
        address destination;
        uint value;
        bytes data;
        bool executed;
    }

    /**
     * @dev Throws if sender is not a contract address itself
     */
    modifier onlyWallet() {
        require(msg.sender == address(this), "ERROR_NOT_A_WALLET");
        _;
    }

    /**
     * @dev Throws if owner exists
     */
    modifier ownerDoesNotExist(address owner) {
        require(!isOwner[owner], "ERROR_OWNER_EXISTS");
        _;
    }

    /**
     * @dev Throws if owner not exists
     */
    modifier ownerExists(address owner) {
        require(isOwner[owner], "ERROR_OWNER_NOT_EXISTS");
        _;
    }

    /**
     * @dev Throws if transaction not existed
     */
    modifier transactionExists(uint transactionId) {
        require(transactions[transactionId].destination != address(0), "ERROR_TRANSACTION_NOT_EXISTS");
        _;
    }

    /**
     * @dev Throws if transaction had not been confirmed
     */
    modifier confirmed(uint transactionId, address owner) {
        require(confirmations[transactionId][owner], "ERROR_TRANSACTION_NOT_CONFIRMED");
        _;
    }

    /**
     * @dev Throws if transaction had not been confirmed
     */ 
    modifier notConfirmed(uint transactionId, address owner) {
        require(!confirmations[transactionId][owner], "ERROR_TRANSACTION_ALREADY_CONFIRMED");
        _;
    }

    /**
     * @dev Throws if transaction has been executed
     */
    modifier notExecuted(uint transactionId) {
        require(!isExecuted(transactionId), "ERROR_TRANSACTION_ALREADY_EXECUTED");
        _;
    }

    /**
     * @dev Throws if address is invalid
     */
    modifier notNull(address _address) {
        require(_address != address(0), "ERROR_INVALID_ADDRESS");
        _;
    }

    /**
     * @dev Throws if not valid requirement
     * @param ownerCount Owner count
     * @param _required Number of required confirmations
     * @notice Throws if ownerCount not fits in MAX_OWNER_COUNT
     */
    modifier validRequirement(uint ownerCount, uint _required) {
        require(ownerCount <= MAX_OWNER_COUNT && 
            _required <= ownerCount && 
            _required != 0 &&
            ownerCount != 0, "ERROR_INVALID_REQUIRED_CONFIRMATIONS_NUMBER");
        _;
    }

    /**
     * @dev Fallback function allows to deposit ether.
     */
    function () external payable {

        if (msg.value > 0) {
            emit Deposit(msg.sender, msg.value);
        }            
    }

    /**
     * @dev Get current contract balance
     */
    function walletBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Withdraw contract balance
     * @param to Funds recipient address
     * @notice Transaction has to be sent by wallet.
     */
    function withdraw(address to) public 
    onlyWallet 
    notNull(to) {
        emit Withdraw(to, address(this).balance);
        to.transfer(address(this).balance);
    }

    /**
     * @dev Contract constructor sets initial owners and required number of confirmations.
     * @param _owners List of initial owners.
     * @param _required Number of required confirmations.
     */
    constructor(address[] memory _owners, uint _required) public validRequirement(_owners.length, _required) {

        for (uint i = 0; i < _owners.length; i++) {
            require(!isOwner[_owners[i]] && _owners[i] != address(0), "ERROR_OWNER_EXISTS");
            isOwner[_owners[i]] = true;
        }

        owners = _owners;
        required = _required;
    }

    /**
     * @dev Allows to add a new owner. 
     * @param owner Address of new owner.
     * @notice Transaction has to be sent by wallet.
     */
    function addOwner(address owner) public 
    onlyWallet 
    ownerDoesNotExist(owner) 
    notNull(owner) 
    validRequirement(owners.length + 1, required) {
        isOwner[owner] = true;
        owners.push(owner);
        emit OwnerAddition(owner);
    }

    /**
     * @dev Allows to remove an owner. 
     * @param owner Address of owner.
     * @notice Transaction has to be sent by wallet.
     */
    function removeOwner(address owner) public 
    onlyWallet 
    ownerExists(owner) {

        isOwner[owner] = false;

        for (uint i = 0; i < owners.length - 1; i++) {

            if (owners[i] == owner) {
                owners[i] = owners[owners.length - 1];
                break;
            }
        }
            
        owners.length -= 1;

        if (required > owners.length) {
            changeRequirement(owners.length);
        }
            
        emit OwnerRemoval(owner);
    }

    /**
     * @dev Allows to replace an owner with a new owner.
     * @param owner Address of owner to be replaced.
     * @param newOwner Address of new owner.
     * @notice Transaction has to be sent by wallet.
     */
    function replaceOwner(address owner, address newOwner) public 
    onlyWallet 
    ownerExists(owner)
    ownerDoesNotExist(newOwner) {

        for (uint i = 0; i < owners.length; i++) {

            if (owners[i] == owner) {
                owners[i] = newOwner;
                break;
            }
        }
            
        isOwner[owner] = false;
        isOwner[newOwner] = true;
        emit OwnerRemoval(owner);
        emit OwnerAddition(newOwner);
    }

    /**
     * @dev Allows to change the number of required confirmations. Transaction has to be sent by wallet.
     * @param _required Number of required confirmations.
     */
    function changeRequirement(uint _required) public 
    onlyWallet
    validRequirement(owners.length, _required) {

        required = _required;
        emit RequirementChange(_required);
    }

    /**
     * @dev Allows an owner to submit and confirm a transaction.
     * @param destination Transaction target address.
     * @param value Transaction ether value.
     * @param data Transaction data payload.
     * @return Returns transaction ID.
     */
    function submitTransaction(
        address destination, 
        uint value, 
        bytes memory data
    ) public
    returns(uint transactionId) {
        transactionId = addTransaction(destination, value, data);
        confirmTransaction(transactionId);
    }

    /**
     * @dev Allows an owner to confirm a transaction.
     * @param transactionId Transaction ID.
     */
    function confirmTransaction(uint transactionId) public
    ownerExists(msg.sender)
    transactionExists(transactionId)
    notConfirmed(transactionId, msg.sender) {
        confirmations[transactionId][msg.sender] = true;
        emit Confirmation(msg.sender, transactionId);
        executeTransaction(transactionId);
    }

    /**
     * @dev Allows an owner to revoke a confirmation for a transaction.
     * @param transactionId Transaction ID.
     */
    function revokeConfirmation(uint transactionId) public
    ownerExists(msg.sender)
    confirmed(transactionId, msg.sender)
    notExecuted(transactionId) {

        confirmations[transactionId][msg.sender] = false;
        emit Revocation(msg.sender, transactionId);
    }

    /**
     * @dev Allows anyone to execute a confirmed transaction.
     * @param transactionId Transaction ID.
     */
    function executeTransaction(uint transactionId) public
    ownerExists(msg.sender)
    confirmed(transactionId, msg.sender)
    notExecuted(transactionId) {

        if (isConfirmed(transactionId)) {

            transactions[transactionId].executed = true; 

            if (external_call(
                transactions[transactionId].destination, 
                transactions[transactionId].value, 
                transactions[transactionId].data.length, 
                transactions[transactionId].data
            )) {
                emit Execution(transactionId);
            } else {
                emit ExecutionFailure(transactionId);
                transactions[transactionId].executed = false;
            }
        }
    }

    /**
     * @notice call has been separated into its own function in order to take advantage
     * of the Solidity's code generator to produce a loop that copies tx.data into memory.
     */
    function external_call(
        address destination, 
        uint value, 
        uint dataLength, 
        bytes memory data
    ) private returns(bool) {
        bool result;

        assembly {
            let x := mload(0x40) // "Allocate" memory for output (0x40 is where "free memory" pointer is stored by convention)
            let d := add(data, 32) // First 32 bytes are the padded length of data, so exclude that
            result := call(
                sub(gas, 34710), // 34710 is the value that solidity is currently emitting
                // It includes callGas (700) + callVeryLow (3, to pay for SUB) + callValueTransferGas (9000) +
                // callNewAccountGas (25000, in case the destination address does not exist and needs creating)
                destination,
                value,
                d,
                dataLength, // Size of the input (in bytes) - this is what fixes the padding problem
                x,
                0 // Output is ignored, therefore the output size is zero
            )
        }

        return result;
    }

    /**
     * @dev Returns the confirmation status of a transaction.
     * @param transactionId Transaction ID.
     * @return Confirmation status.
     */
    function isConfirmed(uint transactionId) public view returns(bool) {
        uint count = 0;

        for (uint i = 0; i < owners.length; i++) {
            
            if (confirmations[transactionId][owners[i]]) {
                count += 1;
            }
                
            if (count == required) {
                return true;
            }                
        }

        return false;
    }

    /**
     * @dev Returns the execution status of a transaction.
     * @param transactionId Transaction ID.
     * @return Execution status.
     */
    function isExecuted(uint transactionId) public view returns(bool) {
        return transactions[transactionId].executed;
    }

    /**
     * @dev Adds a new transaction to the transaction mapping, if transaction does not exist yet.
     * @param destination Transaction target address.
     * @param value Transaction ether value.
     * @param data Transaction data payload.
     * @return Returns transaction ID.
     */
    function addTransaction(
        address destination, 
        uint value, 
        bytes memory data
    ) internal notNull(destination) returns(uint transactionId) {
        transactionId = transactionCount;
        transactions[transactionId] = Transaction({
            destination: destination,
            value: value,
            data: data,
            executed: false
        });
        transactionCount += 1;
        emit Submission(transactionId);
    }

    /**
     * @dev Returns number of confirmations of a transaction.
     * @param transactionId Transaction ID.
     * @return Number of confirmations.
     */
    function getConfirmationCount(uint transactionId) public view returns(uint count) {
        
        for (uint i = 0; i < owners.length; i++) {

            if (confirmations[transactionId][owners[i]]) {
                count += 1;
            }
        }                            
    }

    /**
     * @dev Returns total number of transactions after filers are applied.
     * @param pending Include pending transactions.
     * @param executed Include executed transactions.
     * @return Total number of transactions after filters are applied.
     */
    function getTransactionCount(bool pending, bool executed) public view returns(uint count) {

        for (uint i = 0; i < transactionCount; i++) {

            if (pending && !transactions[i].executed ||
                executed && transactions[i].executed) {

                count += 1;
            }
        }               
    }

    /**
     * @dev Returns list of owners.
     * @return List of owner addresses.
     */
    function getOwners() public view returns(address[] memory) {
        return owners;
    }

    /**
     * @dev Returns array with owner addresses, which confirmed transaction.
     * @param transactionId Transaction ID.
     * @return Returns array of owner addresses.
     */
    function getConfirmations(uint transactionId) public view returns(address[] memory _confirmations) {
        address[] memory confirmationsTemp = new address[](owners.length);
        uint count = 0;
        uint i;

        for (i = 0; i < owners.length; i++) {
            
            if (confirmations[transactionId][owners[i]]) {
                confirmationsTemp[count] = owners[i];
                count += 1;
            }
        }
            
        _confirmations = new address[](count);

        for (i = 0; i < count; i++) {
            _confirmations[i] = confirmationsTemp[i];
        }            
    }

    /**
     * @dev Returns list of pending transaction IDs
     * @return Returns array of transaction IDs.
     */
    function getPendingTransactionIds() public view returns(uint[] memory) {
        uint[] memory _transactionIds;
        uint[] memory transactionIdsTemp = new uint[](transactionCount);
        uint count = 0;
        uint i;

        for (i = 0; i < transactionCount; i++) {

            if (!isExecuted(i)) {

                transactionIdsTemp[count] = i;
                count += 1;
            }
        }
        
        _transactionIds = new uint[](count);

        for (i = 0; i < count; i++) {
            _transactionIds[i] = transactionIdsTemp[i];
        }

        return _transactionIds;            
    }
}
