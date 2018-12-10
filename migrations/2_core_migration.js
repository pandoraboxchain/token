const { checkBalance } = require('./helpers/utils');
const Pan = artifacts.require('Pan');

module.exports = (deployer, network, accounts) => {
    
    return deployer
        .then(_ => deployer.deploy(Pan, 5000000))
        .then(_ => checkBalance(web3, accounts[0]))
        .then(balance => {
            
            console.log('#'.repeat(40));
            console.log('Final balance:', web3.fromWei(balance, 'ether'));
            console.log('#'.repeat(40));

        })
        .catch(console.error);
};
