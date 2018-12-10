module.exports.checkBalance = (web3, account) => new Promise((resolve, reject) => {
    web3.eth.getBalance(account, (err, result) => {

        if (err) {
            return reject(err);
        }

        resolve(result.toNumber());
    });
});

module.exports.checkGasPrice = (web3) => new Promise((resolve, reject) => {
    web3.eth.getGasPrice((err, result) => {

        if (err) {
            return reject(err);
        }

        resolve(result.toNumber());
    });
});
