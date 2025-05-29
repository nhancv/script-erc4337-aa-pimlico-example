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

- Results:
  ```
  EOA Wallet: 0x3D7d317105b372F50f4771Cce48D78bbC0069C3C
  Smart Account (SA): 0x86FA7E72E8D06D36c768Bd6176c45CCd22020e25
  EOA balance: 0
  SA balance: 0
  Funding 0.001 ETH for SA 0x86FA7E72E8D06D36c768Bd6176c45CCd22020e25, balance is now 0.001
  Sending ETH from SA to 0x000000000000000000000000000000000000dead with amount 0.001
  Tx hash: 0x3dee0dde2d846e117a87fffbdced142936a9f7f63477426a1ddd955e5d0677df
  SA 0x86FA7E72E8D06D36c768Bd6176c45CCd22020e25 balance now is 0
  TO 0x000000000000000000000000000000000000dead balance now is 0.001
  ```

## Docs

- Pimlico Tutorial 1: https://docs.pimlico.io/guides/tutorials/tutorial-1
- Safe Account: https://docs.pimlico.io/references/permissionless/how-to/accounts/use-safe-account
