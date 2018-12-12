const { checkBalance } = require('./helpers/utils');
const Pan = artifacts.require('Pan');
const MultiSigWallet = artifacts.require('MultiSigWallet');

module.exports = (deployer, network, accounts) => {

    let pan;
    let wallet;
        
    return deployer
        .then(_ => deployer.deploy(Pan, 0))
        .then(_ => Pan.deployed())
        .then(instance => {
            pan = instance;
            return deployer.deploy(MultiSigWallet, [accounts[0]], 1);
        })
        .then(_ => MultiSigWallet.deployed())
        .then(instance => {
            wallet = instance;
            return pan.addMinter(wallet.address, { from: accounts[0] });
        })
        .then(_ => pan.renounceMinter({ from: accounts[0] }))
        .then(_ => wallet.send(web3.toWei(5, 'ether'), { from: accounts[0] }))
        .then(_ => {
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
