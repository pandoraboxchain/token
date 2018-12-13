const BigNumber = web3.BigNumber;
require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .should();
const assertRevert = require('./helpers/assertRevert');

const TestFeatureInitializable = artifacts.require('TestFeatureInitializable');

contract('FeatureInitializable', ([owner]) => {
    const ftString = 'test';
    let feature;

    beforeEach(async () => {
        feature = await TestFeatureInitializable.new({ from: owner });
    });

    describe('Initialization', () => {

        it('#setInitialised should set feature status to initialized', async () => {
            const initResult = await feature.setInitialised(web3.toHex(ftString), { from: owner });
            let event = initResult.logs.filter(l => (
                l.event === 'FeatureInitialized' && initResult.tx === l.transactionHash
            ));
            (web3.toUtf8(event[0].args.feature)).should.equal(ftString);
            (event[0].args.initializer).should.equal(owner);
        });

        it('#isFeatureInitialized show return a status of feature', async () => {
            await feature.setInitialised(web3.toHex(ftString), { from: owner });
            let ok = await feature.isInitialised(web3.toHex(ftString));
            (ok).should.equal(true);
            ok = await feature.isInitialised(web3.toHex('blablabla'));
            (ok).should.equal(false);
        });

        it('#onlyInitializedFeature modificator should terminate execution if feature not initialized', async () => {
            await feature.setInitialised(web3.toHex(ftString), { from: owner });
            const ok = await feature.testOnlyInitialized(web3.toHex(ftString));
            (ok).should.equal(true);
            await assertRevert(feature.testOnlyInitialized(web3.toHex('blablabla')));
        });

        it('#notInitializedFeature modificator should terminate execution if feature has been initialized before', async () => {
            await feature.setInitialised(web3.toHex(ftString), { from: owner });
            await assertRevert(feature.testNotInitialized(web3.toHex(ftString)));
            const ok = await feature.testNotInitialized(web3.toHex('blablabla'));
            (ok).should.equal(true);
        });
    });
});