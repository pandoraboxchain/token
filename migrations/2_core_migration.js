const Pan = artifacts.require('Pan');

module.exports = (deployer, network, accounts) => {
    
    return deployer
        .then(_ => deployer.deploy(Pan))
        .catch(console.error);
};
