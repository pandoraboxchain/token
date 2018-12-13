# MultiSigWallet and PAN token deployment notes
deployment and usage ([see migrations script](../migrations/2_core_migration.js)). Point your attention that all methods calls described below are asynchronous (code is simplified for better understanding)

#### All initial deployment steps can be done with migration and tested on local ganache instance

```sh
npx ganache-cli --gasLimit 0xfffffffffff --port=8545
npx truffle migrate --network ganache
```

#### For using truffle console

```sh
npx truffle console --network ganache
```

## MultiSigWallet deployment

```js
deployer.deploy(MultiSigWallet, [accounts[0]], 1);// specify your owners list and `required` value
...
let wallet = MultiSigWallet.deployed()
```

## Deposit some ether to the wallet
Wallet balance should not be empty because ether required for transactions executions.  

```js
wallet.send(web3.toWei(5, 'ether'), { from: accounts[0] });
```

## Upgradeability proxy deployment

```js
let proxy = deployer.deploy(OwnedUpgradeabilityProxy)
```

## Move ownership of Proxy to the MultiSig wallet 

```js
proxy.transferProxyOwnership(wallet.address, { from: accounts[0] })
```

## Tokent deployment

```js
deployer.deploy(Pan);
...
let pan = Pan.deployed();
```

## Apply token implementation to the proxy contract (miner role is a wallet)

```js
const initData_v0 = impl_v0.contract.initializeMintable.getData(wallet.address);
const proxyCallData_0 = proxy.contract.upgradeToAndCall.getData(impl_v0.address, initData_v0);
wallet.submitTransaction(proxy.address, 0, proxyCallData_0, { from: accounts[0] });
```

### `From this moment all token mining and transferring features can started thru multisig wallet only`


## Submit a first transaction and mint required amount of tokens

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
