const { checkBalance, checkGasPrice } = require('./helpers/utils');
const Migrations = artifacts.require('Migrations');

module.exports = (deployer, network, accounts) => {
    let initialBalance;

    return checkBalance(web3, accounts[0])
        .then(balance => {
            initialBalance = balance;
            return checkGasPrice(web3);
        })
        .then(gasPrice => {

            console.log('#'.repeat(40));
            console.log('Initial balance:', web3.fromWei(initialBalance, 'ether'));
            console.log('Gas price:', web3.fromWei(gasPrice, 'ether'));
            console.log('#'.repeat(40));

            return deployer.deploy(Migrations);
        })
        .catch(err => {
            console.log(err);
            throw err;
        });
};
