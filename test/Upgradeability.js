const BigNumber = web3.BigNumber;
require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .should();
const encodeCall = require('./helpers/encodeCall');
const assertRevert = require('./helpers/assertRevert');
const eventFired = require('./helpers/eventFired');

const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const Pan_V0 = artifacts.require('Pan');
const Pan_V1 = artifacts.require('PanV1');

contract('Upgradeability', ([_, proxyOwner, proxyOwner2, owner1, owner2, owner3, owner4, owner5]) => {

    let proxy;
    let pan;
    let impl_v0;
    let impl_v1;
    const tokensToMint = 5000000;

    beforeEach(async () => {
        proxy = await OwnedUpgradeabilityProxy.new({ from: proxyOwner });
        impl_v0 = await Pan_V0.new({ from: owner1 });

        const initializeData_v0 = impl_v0.contract.initializeMintable.getData(owner1);        
        await proxy.upgradeToAndCall(impl_v0.address, initializeData_v0, { from: proxyOwner });

        pan = await Pan_V0.at(proxy.address);
        await eventFired(proxy, 'Upgraded');

        await pan.mint(owner1, tokensToMint, { from: owner1 });
        const balanceOf = await pan.balanceOf(owner1);
        (balanceOf).should.be.bignumber.equal(tokensToMint);

        impl_v1 = await Pan_V1.new({ from: owner1 });
        const initializeData_v1 = impl_v1.contract.initializePausable.getData(owner1);
        await proxy.upgradeToAndCall(impl_v1.address, initializeData_v1, { from: proxyOwner });
        pan = await Pan_V1.at(proxy.address);
        await eventFired(proxy, 'Upgraded');
    });
    
    describe('UpgradeabilityProxy', () => {

        it('#implementation should return upgraded Pan contract', async() => {
            (await proxy.implementation()).should.equal(impl_v1.address);
        });
    });

    describe('OwnedUpgradeabilityProxy', () => {

        it('#upgradeTo should fail in case of trying to set same implementation', async () => {
            await assertRevert(proxy.upgradeTo(impl_v1.address, { from: proxyOwner }));
        });

        it('#upgradeTo should fail if implementation with zero address has been set', async () => {
            await assertRevert(proxy.upgradeTo(0x0, { from: proxyOwner }));
        });

        it('#upgradeToAndCall should fail in case of calling wrong method', async () => {
            const proxy = await OwnedUpgradeabilityProxy.new({ from: proxyOwner });
            const impl_v1 = await Pan_V1.new();
            const initializeData = encodeCall('wrongMethod', ['address'], [owner1]);
            await assertRevert(proxy.upgradeToAndCall(impl_v1.address, initializeData, { from: proxyOwner }));
        });

        it('#transferProxyOwnership should transfer ownership of proxy', async () => {
            (await proxy.proxyOwner()).should.equal(proxyOwner);
            await proxy.transferProxyOwnership(proxyOwner2, { from: proxyOwner });
            (await proxy.proxyOwner()).should.equal(proxyOwner2);
            await eventFired(proxy, 'ProxyOwnershipTransferred');
        });
        
        it('#transferProxyOwnership should fail if called by not an proxy owner', async () => {
            await assertRevert(proxy.transferProxyOwnership(proxyOwner2, { from: _ }));
        });

        it('#transferProxyOwnership should fail if new owner has zero address', async () => {
            await assertRevert(proxy.transferProxyOwnership(0x0, { from: proxyOwner }));
        });
    });

    describe('Pan_V1', () => {

        it('Balance should still the same after upgrade', async () => {
            const balanceOf = await pan.balanceOf(owner1);
            (balanceOf).should.be.bignumber.equal(tokensToMint);
        });

        it('#isPauser method should return true for the owner', async () => {
            (await pan.isPauser(owner1)).should.equal(true);
        });

        it('#initializePausable should fail if feature has been initialized before', async () => {
            await assertRevert(pan.initializePausable(owner1));
        });

        it('#pause & #unpause should change contract state to paused and otherwise', async () => {
            const pausedResult = await pan.pause({ from: owner1 });
            let event = pausedResult.logs.filter(l => (
                l.event === 'Paused' && pausedResult.tx === l.transactionHash
            ));
            (event[0].args.account).should.equal(owner1);
            let isPaused = await pan.paused();
            (isPaused).should.equal(true);

            const unpausedResult = await pan.unpause({ from: owner1 });
            event = unpausedResult.logs.filter(l => (
                l.event === 'Unpaused' && unpausedResult.tx === l.transactionHash
            ));
            (event[0].args.account).should.equal(owner1);
            isPaused = await pan.paused();
            (isPaused).should.equal(false);
        });

        it('#transfer should fail if contract in paused state and otherwise', async () => {
            await pan.pause({ from: owner1 });
            await assertRevert(pan.transfer(owner2, 10, { from: owner1 }));
            await pan.unpause({ from: owner1 });
            const tr = await pan.transfer(owner2, 10, { from: owner1 });
            const event = tr.logs.filter(l => (
                l.event === 'Transfer' && tr.tx === l.transactionHash
            ));
            (event[0].args.from).should.equal(owner1);
            (event[0].args.to).should.equal(owner2);
            (event[0].args.value).should.be.bignumber.equal(10);
        });

        it('#transferFrom should fail if contract in paused state and otherwise', async () => {
            await pan.approve(owner2, 10, { from: owner1 });
            await pan.pause({ from: owner1 });
            await assertRevert(pan.transferFrom(owner1, owner2, 5, { from: owner2 }));
            await pan.unpause({ from: owner1 });
            const tr = await pan.transferFrom(owner1, owner2, 5, { from: owner2 });
            const event = tr.logs.filter(l => (
                l.event === 'Transfer' && tr.tx === l.transactionHash
            ));
            (event[0].args.from).should.equal(owner1);
            (event[0].args.to).should.equal(owner2);
            (event[0].args.value).should.be.bignumber.equal(5);
        });

        it('#approve should fail if contract in paused state and otherwise', async () => {
            await pan.pause({ from: owner1 });
            await assertRevert(pan.approve(owner2, 10, { from: owner1 }));
            await pan.unpause({ from: owner1 });
            const tr = await pan.approve(owner2, 10, { from: owner1 });
            const event = tr.logs.filter(l => (
                l.event === 'Approval' && tr.tx === l.transactionHash
            ));
            (event[0].args.owner).should.equal(owner1);
            (event[0].args.spender).should.equal(owner2);
            (event[0].args.value).should.be.bignumber.equal(10);
        });

        it('#increaseAllowance should fail if contract in paused state and otherwise', async () => {
            await pan.pause({ from: owner1 });
            await assertRevert(pan.increaseAllowance(owner2, 10, { from: owner1 }));
            await pan.unpause({ from: owner1 });
            const tr = await pan.increaseAllowance(owner2, 10, { from: owner1 });
            const event = tr.logs.filter(l => (
                l.event === 'Approval' && tr.tx === l.transactionHash
            ));
            (event[0].args.owner).should.equal(owner1);
            (event[0].args.spender).should.equal(owner2);
            (event[0].args.value).should.be.bignumber.equal(10);
        });

        it('decreaseAllowance should fail if contract in paused state and otherwise', async () => {
            await pan.pause({ from: owner1 });
            await assertRevert(pan.decreaseAllowance(owner2, 10, { from: owner1 }));
            await pan.unpause({ from: owner1 });
            await pan.approve(owner2, 10, { from: owner1 });
            const tr = await pan.decreaseAllowance(owner2, 5, { from: owner1 });
            const event = tr.logs.filter(l => (
                l.event === 'Approval' && tr.tx === l.transactionHash
            ));
            (event[0].args.owner).should.equal(owner1);
            (event[0].args.spender).should.equal(owner2);
            (event[0].args.value).should.be.bignumber.equal(5);
        });
    });    
});
