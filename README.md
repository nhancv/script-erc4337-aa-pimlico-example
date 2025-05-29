# DEVELOPMENT

## Setup AA Local Environment

https://github.com/nhancv/pimlicolabs-mock-aa-environment

## Setup client

```
git clone https://github.com/nhancv/script-erc4337-aa-pimlico-example.git
cd script-erc4337-aa-pimlico-example
yarn install
```

## Start client

```
yarn start
```

### Results:

```
Entry point: 0x0000000071727De22E5E9d8BAf0edAc6f37da032 (0.7)
Smart Account type: SafeSmartAccount
EOA Wallet: 0xd41C952747A2a7043aAa4a251636cF778AFC5D07
Smart Account (SA): 0x0ffA0256EA13Be360BfE69F9ce09841a6438aB7d
EOA balance: 0
 SA balance: 0
Funding 0.001 ETH for SA 0x0ffA0256EA13Be360BfE69F9ce09841a6438aB7d, balance is now 0.001
Sending ETH from SA to 0x000000000000000000000000000000000000dead with amount 0.001
Tx hash: 0x2511574a9190ea4945eaef99dfbe7466b6984675dc338209dbb1d8a7b5f25353
SA 0x0ffA0256EA13Be360BfE69F9ce09841a6438aB7d balance now is 0
TO 0x000000000000000000000000000000000000dead balance now is 0.001
DONE
```

## Docs

- Pimlico Tutorial 1: https://docs.pimlico.io/guides/tutorials/tutorial-1
- Safe Account: https://docs.pimlico.io/references/permissionless/how-to/accounts/use-safe-account
- Smart Account types: https://docs.pimlico.io/guides/how-to/accounts/comparison
