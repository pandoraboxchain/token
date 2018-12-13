const BigNumber = web3.BigNumber;
require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .should();
const assertRevert = require('./helpers/assertRevert');
const sendConfirmations = require('./helpers/sendConfirmations');
const eventFired = require('./helpers/eventFired');
const MultiSigWallet = artifacts.require('MultiSigWallet');

contract('MultiSigWallet', async ([owner1, owner2, owner3, owner4, owner5, owner6, owner7, owner8, owner9, _]) => {
    
    let wallet;

    before(async () => {
        await web3.eth.sendTransaction({
            from: _, 
            to: owner1, 
            value: web3.toWei(50, 'ether')
        });
    });

    beforeEach(async () => {
        wallet = await MultiSigWallet.new([
            owner1,
            owner2,
            owner3,
            owner4,
            owner5
        ], 3, { from: owner1 });
        await wallet.send(web3.toWei(3, 'ether'), { from: owner1 });
    });

    describe('Constructor', () => {

        it('should fail if ownerCount > MAX_OWNER_COUNT', async () => {
            let owners = [];

            for (let i=0; i<60; i++) {
                owners.push(web3.toHex(i));
            }

            await assertRevert(MultiSigWallet.new(owners, 3, { from: owner1 }));
        });

        it('should fail if _required > ownerCount', async () => {
            await assertRevert(MultiSigWallet.new([
                owner1,
                owner2,
                owner3,
                owner4,
                owner5
            ], 7, { from: owner1 }));
        });

        it('should fail if ownerCount == 0', async () => {
            await assertRevert(MultiSigWallet.new([], 3, { from: owner1 }));
        });

        it('should fail if _required > ownerCount', async () => {
            await assertRevert(MultiSigWallet.new([
                owner1,
                owner2,
                owner3,
                owner4,
                owner5
            ], 0, { from: owner1 }));
        });

        it('should fail if at least one of owners has zero address', async () => {
            await assertRevert(MultiSigWallet.new([
                owner1,
                0x0,
                owner3,
                owner4,
                owner5
            ], 0, { from: owner1 }));
        });

        it('should fail if owner already exists', async () => {
            await assertRevert(MultiSigWallet.new([
                owner1,
                owner2,
                owner1,//!!!
                owner4,
                owner5
            ], 0, { from: owner1 }));
        });
    });

    describe('Wallet getters', () => {

        it('#MAX_OWNER_COUNT should return max count of signers', async () => {
            const count = await wallet.MAX_OWNER_COUNT();
            (count).should.be.bignumber.equal(50);
        });

        it('#getOwners should return array of owners', async () => {
            const owners = await wallet.getOwners();
            (owners.length).should.equal(5);
            (owners).should.be.deep.equal([
                owner1,
                owner2,
                owner3,
                owner4,
                owner5
            ]);
        });

        it('#getConfirmationCount should return confirmations count', async () => {
            // Encode transaction
            const addOwnerData = wallet.contract.addOwner.getData(owner6);
            
            // Submission
            const addSubmitResult = await wallet.submitTransaction(wallet.address, 0, addOwnerData, { from: owner1 });
            const submitionEvents = addSubmitResult.logs.filter(l => (
                l.event === 'Submission' && addSubmitResult.tx === l.transactionHash
            ));
            const transactionId = submitionEvents[0].args.transactionId.toNumber();
            await sendConfirmations(wallet, transactionId, [owner2]);

            const confirmationsCount = await wallet.getConfirmationCount(transactionId);            
            (confirmationsCount.toNumber()).should.equal(2);
        });

        it('#getTransactionCount should return transactions count', async () => {
            // Encode transactions
            const addOwnerData = wallet.contract.addOwner.getData(owner6);
            const replaceOwnerData = wallet.contract.replaceOwner.getData(owner5, owner8);
            
            // Submission 1
            let submitResult = await wallet.submitTransaction(wallet.address, 0, addOwnerData, { from: owner1 });
            let events = submitResult.logs.filter(l => (
                l.event === 'Submission' && submitResult.tx === l.transactionHash
            ));
            const transactionId1 = events[0].args.transactionId.toNumber();
            await sendConfirmations(wallet, transactionId1, [owner2, owner3, owner4, owner5]);

            // Submission 2
            submitResult = await wallet.submitTransaction(wallet.address, 0, replaceOwnerData, { from: owner1 });
            events = submitResult.logs.filter(l => (
                l.event === 'Submission' && submitResult.tx === l.transactionHash
            ));
            const transactionId2 = events[0].args.transactionId.toNumber();
            await sendConfirmations(wallet, transactionId2, [owner2]);

            let pendingCount = await wallet.getTransactionCount(true, false);// without executed
            (pendingCount).should.be.bignumber.equal(1);

            pendingCount = await wallet.getTransactionCount(true, true);// with executed
            (pendingCount).should.be.bignumber.equal(2);

            pendingCount = await wallet.getTransactionCount(false, true);// without pending
            (pendingCount).should.be.bignumber.equal(1);
        });

        it('#getConfirmations should return confirmations count by transaction Id', async () => {
            const addOwnerData = wallet.contract.addOwner.getData(owner6);
            let submitResult = await wallet.submitTransaction(wallet.address, 0, addOwnerData, { from: owner1 });
            let events = submitResult.logs.filter(l => (
                l.event === 'Submission' && submitResult.tx === l.transactionHash
            ));
            const transactionId1 = events[0].args.transactionId.toNumber();
            await sendConfirmations(wallet, transactionId1, [owner2]);

            const confirmations = await wallet.getConfirmations(transactionId1);
            (confirmations.length).should.equal(2);// submiter itself + one more owner
            (confirmations[0]).should.equal(owner1);
            (confirmations[1]).should.equal(owner2);
        });

        it('#getPendingTransactionIds should return transactions Ids', async () => {
            const addOwnerData6 = wallet.contract.addOwner.getData(owner6);
            await wallet.submitTransaction(wallet.address, 0, addOwnerData6, { from: owner1 });
            const addOwnerData7 = wallet.contract.addOwner.getData(owner7);
            await wallet.submitTransaction(wallet.address, 0, addOwnerData7, { from: owner1 });
                        
            // pending (2), executed (0)
            let transactionIds = await wallet.getPendingTransactionIds();
            (transactionIds.length).should.equal(2);

            const addOwnerData8 = wallet.contract.addOwner.getData(owner8);
            await wallet.submitTransaction(wallet.address, 0, addOwnerData8, { from: owner1 });

            // pending (3), executed (0)
            transactionIds = await wallet.getPendingTransactionIds();
            (transactionIds.length).should.equal(3);
            
            await sendConfirmations(wallet, transactionIds[0].toNumber(), [owner2, owner3, owner4, owner5]);

            // pending (2), executed (1)
            transactionIds = await wallet.getPendingTransactionIds();
            (transactionIds.length).should.equal(2);

            await sendConfirmations(wallet, transactionIds[0].toNumber(), [owner2, owner3, owner4, owner5]);
            await sendConfirmations(wallet, transactionIds[1].toNumber(), [owner2, owner3, owner4, owner5]);

            // pending (0), executed (3)
            transactionIds = await wallet.getPendingTransactionIds();
            (transactionIds.length).should.equal(0);
        });
    });

    describe('Wallet balance', () => {

        it('fallback function should be able to recive ethers', async () => {
            wallet = await MultiSigWallet.new([
                owner1,
                owner2,
                owner3,
                owner4,
                owner5
            ], 3, { from: owner1 });
            let ballance = await wallet.walletBalance();
            (ballance).should.be.bignumber.equal(0);
            const depositResult = await wallet.send(web3.toWei(10, 'ether'), {
                from: owner1
            });
            const events = depositResult.logs.filter(l => (
                l.event === 'Deposit' && depositResult.tx === l.transactionHash
            ));
            (events.length).should.equal(1);
            (events[0].args.sender).should.equal(owner1);
            (events[0].args.value).should.be.bignumber.equal(web3.toWei(10, 'ether'));
            ballance = await wallet.walletBalance();
            (ballance).should.be.bignumber.equal(web3.toWei(10, 'ether'));
        });

        it('#withdraw should withdraw balance to owner (with confirmations)', async () => {
            const initialBalance = await web3.eth.getBalance(owner1);

            const withdrawData = wallet.contract.withdraw.getData(owner1);
            const withdrawSubmitResult = await wallet.submitTransaction(wallet.address, 0, withdrawData, { from: owner1 });
            const events = withdrawSubmitResult.logs.filter(l => (
                l.event === 'Submission' && withdrawSubmitResult.tx === l.transactionHash
            ));
            (events.length).should.equal(1);
            const transactionId = events[0].args.transactionId.toNumber();
            await sendConfirmations(wallet, transactionId, [owner2, owner3, owner4]);// 3 confirmations is enough
            
            const withdrawEvents = await eventFired(wallet, 'Withdraw');
            (withdrawEvents.length).should.equal(1);
            (withdrawEvents[0].args.to).should.equal(owner1);
            (withdrawEvents[0].args.value).should.be.bignumber.equal(web3.toWei(3, 'ether'));

            const finalBalance = await web3.eth.getBalance(owner1);
            (finalBalance).should.be.bignumber.gt(initialBalance);
        });        
    });

    describe('Ownership', () => {

        it('#addOwner should add new owner (with confirmations)', async () => {
            // Encode transaction
            const addOwnerData = wallet.contract.addOwner.getData(owner6);
            
            // Submission
            const addSubmitResult = await wallet.submitTransaction(wallet.address, 0, addOwnerData, { from: owner1 });
            const submitionEvents = addSubmitResult.logs.filter(l => (
                l.event === 'Submission' && addSubmitResult.tx === l.transactionHash
            ));
            const transactionId = submitionEvents[0].args.transactionId.toNumber();

            await sendConfirmations(wallet, transactionId, [owner2, owner3, owner4, owner5]);

            const executionEvents = await eventFired(wallet, 'Execution');
            (executionEvents[0].args.transactionId).should.be.bignumber.equal(transactionId);

            const additionEvents = await eventFired(wallet, 'OwnerAddition');
            (additionEvents[0].args.owner).should.equal(owner6);
        });

        it('#removeOwner should remove owner (with confirmations)', async () => {
            const removeOwnerData = wallet.contract.removeOwner.getData(owner5);
            const removeSubmitResult = await wallet.submitTransaction(wallet.address, 0, removeOwnerData, { from: owner1 });
            const submitionEvents = removeSubmitResult.logs.filter(l => (
                l.event === 'Submission' && removeSubmitResult.tx === l.transactionHash
            ));
            const transactionId = submitionEvents[0].args.transactionId.toNumber();

            await sendConfirmations(wallet, transactionId, [owner2, owner3, owner4, owner5]);
            
            const executionEvents = await eventFired(wallet, 'Execution');
            (executionEvents[0].args.transactionId).should.be.bignumber.equal(transactionId);

            const removalEvents = await eventFired(wallet, 'OwnerRemoval');
            (removalEvents[0].args.owner).should.equal(owner5);
        });

        it('#removeOwner should automatically change required value if owners.length become < required', async () => {
            const changeRequirementData = wallet.contract.changeRequirement.getData(5);// current count of owners
            const submitResult = await wallet.submitTransaction(wallet.address, 0, changeRequirementData, { from: owner1 });
            let submitionEvents = submitResult.logs.filter(l => (
                l.event === 'Submission' && submitResult.tx === l.transactionHash
            ));
            let transactionId = submitionEvents[0].args.transactionId.toNumber();            
            await sendConfirmations(wallet, transactionId, [owner2, owner3, owner4, owner5]);

            const removeOwnerData = wallet.contract.removeOwner.getData(owner5);
            const removeSubmitResult = await wallet.submitTransaction(wallet.address, 0, removeOwnerData, { from: owner1 });
            submitionEvents = removeSubmitResult.logs.filter(l => (
                l.event === 'Submission' && removeSubmitResult.tx === l.transactionHash
            ));
            transactionId = submitionEvents[0].args.transactionId.toNumber();
            await sendConfirmations(wallet, transactionId, [owner2, owner3, owner4, owner5]);
            
            const removalEvents = await eventFired(wallet, 'OwnerRemoval');
            (removalEvents[0].args.owner).should.equal(owner5);

            const required = await wallet.required();
            (required).should.be.bignumber.equal(4);// 5 - 1
        });

        it('#replaceOwner should replace owner (with confirmations)', async () => {
            const replaceOwnerData = wallet.contract.replaceOwner.getData(owner5, owner8);
            const replaceSubmitResult = await wallet.submitTransaction(wallet.address, 0, replaceOwnerData, { from: owner1 });
            const submitionEvents = replaceSubmitResult.logs.filter(l => (
                l.event === 'Submission' && replaceSubmitResult.tx === l.transactionHash
            ));
            const transactionId = submitionEvents[0].args.transactionId.toNumber();

            await sendConfirmations(wallet, transactionId, [owner2, owner3, owner4]);
            
            const executionEvents = await eventFired(wallet, 'Execution');
            (executionEvents[0].args.transactionId).should.be.bignumber.equal(transactionId);

            const removalEvents = await eventFired(wallet, 'OwnerRemoval');
            (removalEvents[0].args.owner).should.equal(owner5);

            const additionEvents = await eventFired(wallet, 'OwnerAddition');
            (additionEvents[0].args.owner).should.equal(owner8);
        });
    });

    describe('Requiremet management', () => {

        it('#changeRequirement should change "requirement" (with confirmations)', async () => {
            const requiredToSet = 4;

            const requiredInitial = await wallet.required();
            (requiredInitial).should.be.bignumber.equal(3);

            const changeRequirementData = wallet.contract.changeRequirement.getData(requiredToSet);
            const submitResult = await wallet.submitTransaction(wallet.address, 0, changeRequirementData, { from: owner1 });
            const submitionEvents = submitResult.logs.filter(l => (
                l.event === 'Submission' && submitResult.tx === l.transactionHash
            ));
            const transactionId = submitionEvents[0].args.transactionId.toNumber();
            
            await sendConfirmations(wallet, transactionId, [owner2, owner3, owner4]);

            const executionEvents = await eventFired(wallet, 'Execution');
            (executionEvents[0].args.transactionId).should.be.bignumber.equal(transactionId);

            const requirementEvents = await eventFired(wallet, 'RequirementChange');
            (requirementEvents[0].args.required).should.be.bignumber.equal(4);

            const requiredFinal = await wallet.required();
            (requiredFinal).should.be.bignumber.equal(requiredToSet);
        });
    });
});
