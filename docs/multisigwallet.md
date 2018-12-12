# MultiSigWallet
deployment and usage (see migrations script). Point your attention that all methods calls described below are asynchronous (code is simplified for better understanding)

## Tokent deployment
Initially we have to deploy a Pan token with zero balance:
```js
deployer.deploy(Pan, 0);
...
let pan = Pan.deployed();
```

## MultiSigWallet deployment

```js
deployer.deploy(MultiSigWallet, [accounts[0]], 1);// specify your owners list and `required` value
...
let wallet = ultiSigWallet.deployed()
```

## Add wallet address as `minter` role to token contract

```js
pan.addMinter(wallet.address, { from: accounts[0] });
```

## Deposit some ether to the wallet
Wallet balance should not be empty because ether required for transactions executions.  

```js
wallet.send(web3.toWei(5, 'ether'), { from: accounts[0] });
```

## Renounce a initial `minter` from  the token

```js
pan.renounceMinter({ from: accounts[0] });
```

### `From this moment all token mining and transferring features can started thru multisig wallet only`


## Submit a first transaction and mint required a amount of tokens

```js
let transactionId = wallet.submitTransaction(pan.address, 0, pan.contract.mint.getData(wallet.address, 5000000), { from: accounts[0] });
```

Because this document is specified only one wallet owner then the transaction will be executed automatically. If owners count is more than 1 then a proper count of confirmation has to be sent.

```js
wallet.confirmTransaction(transactionId, { from: ownerAddress });
```

## Transfer amount of tokens to other address

```js
let transactionId = wallet.submitTransaction(pan.address, 0, pan.contract.transfer.getData(recipientAddress, 300), {from: wallet.address});
```
