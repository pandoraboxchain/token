module.exports = (target) => new Promise((resolve, reject) => {

    target['allEvents']({fromBlock: 0}, (err, result) => {

        if (err) {
            return reject(err);
        }

        result.length > 0 ? resolve(result) : reject(new Error(`No events fired`));
    });
});
