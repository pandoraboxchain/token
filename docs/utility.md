# PAN token governance utility
Command line utility for token and wallet management

## Truffle configuration

Currently used configuration is located in the file [../truffle.js](../truffle.js)
If you going to manage token in the test network or in the main network (not local) 
you should create in the root of repository folder file with the name `localkeys.js` 
with the following content.

```javascript
module.exports = {
    "key": "[your_ethereum_address_private_key]",
    "infura": "[your_infura_registered_api_token]"
};
```

This file name has been added to `.gitignore` configuration and file should not be committed to the public. 
Be this carefully with this!


## Utility configuration

Token and wallet addresses can be configured in two ways. 
The first one is `config.json` file which located here: [../scripts/config.json](../scripts/config.json)  
These addresses are the real addresses of entities in the Rinkeby test network.

```json
{
    "token": "0xcabc26f129c2473494c232864765c62d3cc05f8e",
    "wallet": "0x61e435c91c6a3d044a83a0812c71b1efa76fcc96"
}
```

The second way is command line parameters. You can use:

```sh
npx truffle exec ./scripts/pan.js --network [configured_network_name] token=0xcabc26f129c2473494c232864765c62d3cc05f8e wallet=0x61e435c91c6a3d044a83a0812c71b1efa76fcc96
```

## Using of the utility

### Calling of public methods of the token or a wallet (`action=get`)

```sh
npx truffle exec ./scripts/pan.js --network rinkeby action=get target=token cmd=balanceOf params=0x567Eb9E8D8A43C24c7bac4cb4b51ca806cFE8996
```

`cmd` option - is the method you want to call. You should write names of these methods identically as in the contract source.  

`target` option is dedicated to point on which methods you want to call. If you want to call token functions you shold set `token` as value of the `target` and `wallet` if you want to cal wallets functions.  

Functions parameters (`params` option) should be separated by coma (`,`)

Output will looks like:

```sh
================================================================================
PAN address: 0xcabc26f129c2473494c232864765c62d3cc05f8e
Wallet address: 0x61e435c91c6a3d044a83a0812c71b1efa76fcc96
PAN Total supply: 5e+24
================================================================================
"balanceOf" request has been sent with parameters: [ 0x567Eb9E8D8A43C24c7bac4cb4b51ca806cFE8996 ]
Request result: [ 199300000000003050000 ]
================================================================================
```

### Sending transaction (`action=submit`)

```sh
npx truffle exec ./scripts/pan.js --network rinkeby action=submit target=token cmd=transfer params=0x567Eb9E8D8A43C24c7bac4cb4b51ca806cFE8996,250000000000000000000
```
`target` option should be configured as described above.

Output will looks like:

```sh
================================================================================
PAN address: 0xcabc26f129c2473494c232864765c62d3cc05f8e
Wallet address: 0x61e435c91c6a3d044a83a0812c71b1efa76fcc96
PAN Total supply: 5e+24
================================================================================
"transfer" transaction has been sent
Transaction hash: 0x47b456e8d4069a434ddd715b9242c0bc777c76a6d02b246164cc56b957a96aea
Transaction sender: 0x567eb9e8d8a43c24c7bac4cb4b51ca806cfe8996
Transaction Id: 15
Gas used: 210703
Status: executed
================================================================================
```

### Sending transactions confirmations (`action=confirm`)

```sh
npx truffle exec ./scripts/pan.js --network rinkeby action=confirm id=12
```

Output will looks like:

```sh
================================================================================
PAN address: 0xcabc26f129c2473494c232864765c62d3cc05f8e
Wallet address: 0x61e435c91c6a3d044a83a0812c71b1efa76fcc96
PAN Total supply: 5e+24
================================================================================
Confirmation transaction has been sent
Transaction hash: 0x47b456e8d4069a434ddd715b9242c0bc777c76a6d02b246164cc56b957a96aea
Transaction sender: 0x567eb9e8d8a43c24c7bac4cb4b51ca806cfe8996
Transaction Id: 12
Gas used: 210703
================================================================================
```
