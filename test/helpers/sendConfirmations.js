const confirm = async (wallet, transactionId, sender) => {
                
    const isExecuted = await wallet.isExecuted(transactionId);

    if (isExecuted) {
        // if we will try to confirm already executed transaction we will get the revert
        // so stop confirmations from here
        return true;
    }

    const confirmationResult = await wallet.confirmTransaction(transactionId, { from: sender });
    const events = confirmationResult.logs.filter(l => (
        l.event === 'Confirmation' && confirmationResult.tx === l.transactionHash
    ));                
    (events.length).should.equal(1);
    (events[0].args.sender).should.equal(sender);
    (events[0].args.transactionId).should.be.bignumber.equal(transactionId);
};

module.exports = async (wallet, transactionId, owners) => {

    for (let i=0; i<owners.length; i++) {
        // Send confirmations from owners
        await confirm(wallet, transactionId, owners[i]);
    }
};
