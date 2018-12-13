const { checkBalance } = require('./helpers/utils');
const Pan = artifacts.require('Pan');
const MultiSigWallet = artifacts.require('MultiSigWallet');
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');

module.exports = (deployer, network, accounts) => {

    let pan;
    let wallet;
    let proxy;
        
    return deployer
        .then(_ => deployer.deploy(MultiSigWallet, [accounts[0]], 1))
        .then(_ => MultiSigWallet.deployed())
        .then(instance => {
            wallet = instance;
            return wallet.send(web3.toWei(5, 'ether'), { from: accounts[0] });
        })
        .then(_ => deployer.deploy(OwnedUpgradeabilityProxy))
        .then(_ => OwnedUpgradeabilityProxy.deployed())
        .then(instance => {
            proxy = instance;
            return proxy.transferProxyOwnership(wallet.address, { from: accounts[0] })
        })
        .then(_ => deployer.deploy(Pan))
        .then(_ => Pan.deployed())
        .then(instance => {
            pan = instance;
            const initData = pan.contract.initializeMintable.getData(wallet.address);
            const proxyCallData = proxy.contract.upgradeToAndCall.getData(pan.address, initData);            
            return wallet.submitTransaction(proxy.address, 0, proxyCallData, { from: accounts[0] });
        })
        .then(_ => {
            pan = Pan.at(proxy.address);
            const mintData = pan.contract.mint.getData(wallet.address, 5000000);
            return wallet.submitTransaction(pan.address, 0, mintData, { from: accounts[0] });
        })
        .then(_ => checkBalance(web3, accounts[0]))
        .then(balance => {
            
            console.log('#'.repeat(40));
            console.log('Final balance:', web3.fromWei(balance, 'ether'), 'ETH');
            console.log('#'.repeat(40));

        })
        .catch(console.error);
};
