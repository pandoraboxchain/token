const BigNumber = web3.BigNumber;
require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .should();
const encodeCall = require('./helpers/encodeCall');
const assertRevert = require('./helpers/assertRevert');
const eventFired = require('./helpers/eventFired');
const getEvents = require('./helpers/getEvents');

const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const Pan_V0 = artifacts.require('Pan');
const Pan_V1 = artifacts.require('PanV1');
const MultiSigWallet = artifacts.require('MultiSigWallet');

contract('Upgradeability', ([_, owner1, owner2, owner3, owner4, owner5, owner6, owner7, owner8]) => {
    let wallet;
    let proxy;
    let pan;
    let impl_v0;
    let impl_v1;
    const tokensToMint = 5000000;

    before(async () => {

        // Deploy wallet and deposit some ether
        wallet = await MultiSigWallet.new([owner1], 1, { from: owner1 });
        await wallet.send(web3.toWei(10, 'ether'), { from: owner1 });

        // Deploy proxy and move ownership to the wallet
        proxy = await OwnedUpgradeabilityProxy.new({ from: owner1 });
        await proxy.transferProxyOwnership(wallet.address, { from: owner1 });
        
        // Deploy token contract
        impl_v0 = await Pan_V0.new({ from: owner1 });

        // Set proxy implementation to token contract (miner role is a wallet)
        const initData_v0 = impl_v0.contract.initializeMintable.getData(wallet.address);
        const proxyCallData_0 = proxy.contract.upgradeToAndCall.getData(impl_v0.address, initData_v0);
        await wallet.submitTransaction(proxy.address, 0, proxyCallData_0, { from: owner1 });
        await eventFired(proxy, 'Upgraded');

        pan = await Pan_V0.at(proxy.address);

        // Mint tokens (posible thru wallet only)
        const mintData = impl_v0.contract.mint.getData(wallet.address, tokensToMint);
        await wallet.submitTransaction(proxy.address, 0, mintData, { from: owner1 });

        // Check balance of tokens 
        let balanceOf = await pan.balanceOf(wallet.address);
        (balanceOf).should.be.bignumber.equal(tokensToMint);

        // Deploy new version of the token contract
        impl_v1 = await Pan_V1.new({ from: owner1 });

        const initData_v1 = impl_v1.contract.initializePausable.getData(wallet.address);
        const proxyCallData_1 = proxy.contract.upgradeToAndCall.getData(impl_v1.address, initData_v1);
        await wallet.submitTransaction(proxy.address, 0, proxyCallData_1, { from: owner1 });
        await eventFired(proxy, 'Upgraded');

        pan = await Pan_V1.at(proxy.address);

        // Check balance of tokens after upgrade (should not be changed)
        balanceOf = await pan.balanceOf(wallet.address);
        (balanceOf).should.be.bignumber.equal(tokensToMint);

        // Check implementation
        (await proxy.implementation()).should.equal(impl_v1.address);
    });
    
    describe('Pan_V1', () => {

        it('#isPauser method should return true for the owner', async () => {
            (await pan.isPauser(wallet.address)).should.equal(true);
        });

        it('#initializePausable should fail if feature has been initialized before', async () => {
            await assertRevert(pan.initializePausable(owner1));
        });

        it('#pause & #unpause should change contract state to paused and otherwise', async () => {
            let callData = impl_v1.contract.pause.getData();
            await wallet.submitTransaction(pan.address, 0, callData, { from: owner1 });
            let event = await eventFired(pan, 'Paused');
            (event[0].args.account).should.equal(wallet.address);

            let isPaused = await pan.paused();
            (isPaused).should.equal(true);

            callData = impl_v1.contract.unpause.getData();
            await wallet.submitTransaction(pan.address, 0, callData, { from: owner1 });
            event = await eventFired(pan, 'Unpaused');
            (event[0].args.account).should.equal(wallet.address);

            isPaused = await pan.paused();
            (isPaused).should.equal(false);
        });

        it('#transfer should fail if contract in paused state and otherwise', async () => {
            let callData = impl_v1.contract.pause.getData();
            await wallet.submitTransaction(pan.address, 0, callData, { from: owner1 });

            callData = impl_v1.contract.transfer.getData(owner2, 10);
            await wallet.submitTransaction(pan.address, 0, callData, { from: owner1 });
            let events = await eventFired(wallet, 'ExecutionFailure');
            (events.length).should.equal(1);

            callData = impl_v1.contract.unpause.getData();
            await wallet.submitTransaction(pan.address, 0, callData, { from: owner1 });

            callData = impl_v1.contract.transfer.getData(owner2, 10);
            await wallet.submitTransaction(pan.address, 0, callData, { from: owner1 });

            const balance = await pan.balanceOf(owner2);
            (balance).should.be.bignumber.equal(10);
            
            events = await eventFired(pan, 'Transfer');
            const event = events.sort((e1, e2) => e1.blockNumber < e2.blockNumber ? 1 : -1 )[0];
            (event.args.from).should.equal(wallet.address);
            (event.args.to).should.equal(owner2);
            (event.args.value).should.be.bignumber.equal(10);
        });

        // it('#transferFrom should fail if contract in paused state and otherwise', async () => {
        //     await pan.approve(owner2, 10, { from: owner1 });
        //     await pan.pause({ from: owner1 });
        //     await assertRevert(pan.transferFrom(owner1, owner2, 5, { from: owner2 }));
        //     await pan.unpause({ from: owner1 });
        //     const tr = await pan.transferFrom(owner1, owner2, 5, { from: owner2 });
        //     const event = tr.logs.filter(l => (
        //         l.event === 'Transfer' && tr.tx === l.transactionHash
        //     ));
        //     (event[0].args.from).should.equal(owner1);
        //     (event[0].args.to).should.equal(owner2);
        //     (event[0].args.value).should.be.bignumber.equal(5);
        // });

        // it('#approve should fail if contract in paused state and otherwise', async () => {
        //     await pan.pause({ from: owner1 });
        //     await assertRevert(pan.approve(owner2, 10, { from: owner1 }));
        //     await pan.unpause({ from: owner1 });
        //     const tr = await pan.approve(owner2, 10, { from: owner1 });
        //     const event = tr.logs.filter(l => (
        //         l.event === 'Approval' && tr.tx === l.transactionHash
        //     ));
        //     (event[0].args.owner).should.equal(owner1);
        //     (event[0].args.spender).should.equal(owner2);
        //     (event[0].args.value).should.be.bignumber.equal(10);
        // });

        // it('#increaseAllowance should fail if contract in paused state and otherwise', async () => {
        //     await pan.pause({ from: owner1 });
        //     await assertRevert(pan.increaseAllowance(owner2, 10, { from: owner1 }));
        //     await pan.unpause({ from: owner1 });
        //     const tr = await pan.increaseAllowance(owner2, 10, { from: owner1 });
        //     const event = tr.logs.filter(l => (
        //         l.event === 'Approval' && tr.tx === l.transactionHash
        //     ));
        //     (event[0].args.owner).should.equal(owner1);
        //     (event[0].args.spender).should.equal(owner2);
        //     (event[0].args.value).should.be.bignumber.equal(10);
        // });

        // it('decreaseAllowance should fail if contract in paused state and otherwise', async () => {
        //     await pan.pause({ from: owner1 });
        //     await assertRevert(pan.decreaseAllowance(owner2, 10, { from: owner1 }));
        //     await pan.unpause({ from: owner1 });
        //     await pan.approve(owner2, 10, { from: owner1 });
        //     const tr = await pan.decreaseAllowance(owner2, 5, { from: owner1 });
        //     const event = tr.logs.filter(l => (
        //         l.event === 'Approval' && tr.tx === l.transactionHash
        //     ));
        //     (event[0].args.owner).should.equal(owner1);
        //     (event[0].args.spender).should.equal(owner2);
        //     (event[0].args.value).should.be.bignumber.equal(5);
        // });
    });    
});
