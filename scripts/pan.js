/**
 * PAN token governance utility. 
 * Use this script truffleframework environment
 * 
 * @author Kostiantyn Smyrnov <kostysh@gmail.com>
 * @date 2018
 */

const parseArgv = require('./helpers/argv');
const Pan = artifacts.require('Pan');
const MultiSigWallet = artifacts.require('MultiSigWallet');

const ERROR_PARAMETERS_NOT_FOUND = 'Command parameters not found';
const ERROR_NO_ADDRESSES = 'Wallet and token addresses are required but not found';
const ERROR_ACTION_NOT_FOUND = 'Proper action is required as parameter';
const ERROR_SUBMISSION_FAILED = 'Submission failed';
const ERROR_TRANSACTION_ID_REQUIRED = "Transaction Id is required as parameter";

let addresses = {};
let pan;
let wallet;

try {
    addresses = require('./config.json');
} catch(err) {}

/**
 * Parse command parameters
 *
 * @param {Object} params
 * @returns {String[]}
 */
const parseParams = params => {

    if (!params.params || params.params === '') {
        throw new Error(ERROR_PARAMETERS_NOT_FOUND);
    }

    return params.params.split(',').map(p => {
        const template = /^number:/g;
        return p.match(template) ? parseInt(p.replace(template, '')) : p;
    });
}

/**
 * Submitting management
 *
 * @param {Object} params Command line parameters
 */
const processSubmit = async (params) => {
    const instance = params.target && params.target === 'token' ? pan : wallet;
    const cmdParams = parseParams(params);
    let callData;
    let result;
    let events;

    callData = instance.contract[params.cmd].getData.apply(instance, cmdParams);
    result = await wallet.submitTransaction(instance.address, 0, callData);
    events = result.logs.filter(l => (
        l.event === 'Submission' && result.tx === l.transactionHash
    ));

    if (events.length === 0) {
        throw new Error(ERROR_SUBMISSION_FAILED);
    }

    console.log(`\x1b[33m"${params.cmd}" transaction has been sent`, '\x1b[0m');
    console.log('Transaction hash:\x1b[32m', result.tx, '\x1b[0m');
    console.log('Transaction sender:\x1b[32m', result.receipt.from, '\x1b[0m');
    console.log('Transaction Id:\x1b[32m', events[0].args.transactionId.toNumber(), '\x1b[0m');
    console.log('Gas used:\x1b[32m', result.receipt.gasUsed, '\x1b[0m');

    events = result.logs.filter(l => (
        l.event === 'Execution' && result.tx === l.transactionHash
    ));
    let execStatus;

    if (events.length > 0 ) {
        execStatus = 'executed';
    } else {
        events = result.logs.filter(l => (
            l.event === 'ExecutionFailure' && result.tx === l.transactionHash
        ));

        if (events.length > 0) {
            execStatus = 'execution failed';
        } else {
            execStatus = 'unknown';
        }
    }

    console.log('Status:\x1b[32m', execStatus, '\x1b[0m');     
};

/**
 * Confirmation management
 *
 * @param {Object} params Command line parameters
 */
const processConfirm = async (params) => {

    if (!params.id || params.id === '') {
        throw new Error(ERROR_TRANSACTION_ID_REQUIRED);
    }

    const result = await wallet.confirmTransaction(params.id);
    const events = result.logs.filter(l => (
        l.event === 'Confirmation' && result.tx === l.transactionHash
    ));
    
    console.log(`\x1b[33m Confirmation transaction has been sent`, '\x1b[0m');
    console.log('Transaction hash:\x1b[32m', result.tx, '\x1b[0m');
    console.log('Transaction sender:\x1b[32m', result.receipt.from, '\x1b[0m');
    console.log('Transaction Id:\x1b[32m', events[0].args.transactionId.toNumber(), '\x1b[0m');
    console.log('Gas used:\x1b[32m', result.receipt.gasUsed, '\x1b[0m');
};

/**
 * Get requests management
 *
 * @param {Object} params Command line parameters
 */
const processGet = async (params) => {
    const instance = params.target && params.target === 'token' ? pan : wallet;
    const cmdParams = parseParams(params);
    let result = await instance[params.cmd].apply(instance, cmdParams);
    result = Array.isArray(result) ? result : [result];
    console.log(`\x1b[33m"${params.cmd}" request has been sent with parameters: [`, cmdParams.toString(), '] \x1b[0m');
    console.log('Request result:', result.map(r => r.precision && r.toNumber ? r.toNumber() : r));
};

/**
 * truffleframework script
 * @param {Function} callback
 */
module.exports = async (callback) => {

    try {

        const params = parseArgv(process.argv, 6);
        
        if (params.token && params.token != '') {
            addresses.token = params.token;
        }

        if (params.wallet && params.wallet != '') {
            addresses.wallet = params.wallet;
        }

        if (!addresses.token || addresses.token === '' || 
            !addresses.wallet || addresses.wallet === '') {

            throw new Error(ERROR_NO_ADDRESSES);
        }

        // Initialize contracts
        pan = Pan.at(addresses.token);
        wallet = MultiSigWallet.at(addresses.wallet);

        // Get total supply
        const totalSupply = await pan.totalSupply();

        console.log('\x1b[36m' + '='.repeat(80), '\x1b[0m');
        console.log('PAN address:\x1b[36m', addresses.token, '\x1b[0m');
        console.log('Wallet address:\x1b[36m', addresses.wallet , '\x1b[0m');
        console.log('PAN Total supply:\x1b[32m', totalSupply.toNumber(), '\x1b[0m');
        console.log('\x1b[36m' + '='.repeat(80), '\x1b[0m');

        switch (params.action) {
            case 'get':
                await processGet(params);
                break;

            case 'submit':
                await processSubmit(params);
                break;

            case 'confirm':
                await processConfirm(params);
                break;
            
            default:
                callback(new Error(ERROR_ACTION_NOT_FOUND));
        }

        console.log('\x1b[36m' + '='.repeat(80), '\x1b[0m');
        callback();
    } catch(err) {
        callback(err);
    }    
};
