import 'dotenv/config';
import { JSONFile, Low } from '@commonify/lowdb';
import { createPublicClient, createTestClient, formatEther, Hex, http, parseEther } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { getBalance } from 'viem/actions';
import { toSafeSmartAccount } from 'permissionless/accounts';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { entryPoint07Address } from 'viem/account-abstraction';
import { foundry } from 'viem/chains';
import { createSmartAccountClient } from 'permissionless';

const RPC_TRANSPORT = http('http://localhost:8545');
const PAYMASTER_TRANSPORT = http('http://localhost:3000');
const BUNDLER_TRANSPORT = http('http://localhost:4337');

const publicClient = createPublicClient({
  chain: foundry,
  transport: RPC_TRANSPORT,
});

const paymasterClient = createPimlicoClient({
  transport: PAYMASTER_TRANSPORT,
  entryPoint: {
    address: entryPoint07Address,
    version: '0.7',
  },
});

// Funds a SA account with a specified amount of ETH for testing purposes.
const fundSAAccount = async (saAddress: `0x${string}`, amount: bigint) => {
  const anvilClient = createTestClient({
    transport: RPC_TRANSPORT,
    mode: 'anvil',
    chain: foundry,
  });
  await anvilClient.setBalance({
    address: saAddress,
    value: amount,
  });

  const balance = await getBalance(publicClient, { address: saAddress });
  console.log(`Funding ${formatEther(amount)} ETH for SA ${saAddress}, balance is now ${formatEther(balance)}`);
};

/**
 * Initializes a smart account using specific configurations and persists necessary data into a local cache file.
 *
 * This async function performs the following steps:
 * - Reads from a local `.cache.json` file to retrieve account-related data. It uses the LowDB library for file operations.
 * - Generates a new private key if not present in the cache and derives an EOA (Externally Owned Account) from the private key using ethers.js utilities.
 * - Creates a Safe Smart Account using the provided EOA and entry point details.
 * - If account-related data such as the smart contract wallet (SCW) address, EOA address, and private key aren't already cached, stores them into the cache file for persistent usage.
 * - Builds and returns a Smart Account Client with bindings to bundler, paymaster, and chain utilities to allow interaction with the smart contract wallet.
 *
 */
const initSmartAccountClient = async () => {
  const cache = new Low<{ scwAddress: Hex; address: Hex; pk: Hex }>(new JSONFile(`${process.cwd()}/.cache.json`));
  await cache.read();

  const privKeyHex = cache.data?.pk ?? (generatePrivateKey() as Hex);

  // Generate EOA from private key using ethers.js
  const owner = privateKeyToAccount(privKeyHex);

  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    owners: [owner],
    entryPoint: {
      address: entryPoint07Address,
      version: '0.7',
    }, // global entrypoint
    version: '1.4.1',
  });

  const smartAccount = safeAccount.address;
  console.log('EOA Wallet:', owner.address);
  console.log('Smart Account (SA):', smartAccount);

  console.log('EOA balance:', formatEther(await getBalance(publicClient, { address: owner.address })));
  console.log(' SA balance:', formatEther(await getBalance(publicClient, { address: smartAccount })));

  if (!cache.data) {
    cache.data = {
      scwAddress: smartAccount,
      address: owner.address,
      pk: privKeyHex,
    };
    await cache.write();
  }

  return createSmartAccountClient({
    account: safeAccount,
    chain: foundry,
    paymaster: paymasterClient,
    bundlerTransport: BUNDLER_TRANSPORT,
    userOperation: {
      estimateFeesPerGas: async () => (await paymasterClient.getUserOperationGasPrice()).fast,
    },
  });
};

const sendETHFromSmartAccount = async (smartAccountClient: any, toAddress: string, amount: bigint) => {
  console.log('Sending ETH from SA to', toAddress, 'with amount', formatEther(amount));
  const hash = await smartAccountClient.sendTransaction({
    calls: [
      {
        to: toAddress,
        value: amount,
      },
    ],
  });
  console.log('Tx hash:', hash);
};

const processScript = async () => {
  const smartAccountClient = await initSmartAccountClient();
  const saAddress = smartAccountClient.account.address;

  const to = '0x000000000000000000000000000000000000dead';
  const amount = parseEther('0.001');
  await fundSAAccount(saAddress, amount);
  await sendETHFromSmartAccount(smartAccountClient, to, amount);

  console.log(`SA ${saAddress} balance now is`, formatEther(await getBalance(publicClient, { address: saAddress })));
  console.log(`TO ${to} balance now is`, formatEther(await getBalance(publicClient, { address: to })));
};

processScript()
  .then(() => {
    console.log('DONE');
    process.exit(0);
  })
  .catch((error) => console.error(error));

/**
 * EOA Wallet: 0x3D7d317105b372F50f4771Cce48D78bbC0069C3C
 * Smart Account (SA): 0x86FA7E72E8D06D36c768Bd6176c45CCd22020e25
 * EOA balance: 0
 *  SA balance: 0
 * Funding 0.001 ETH for SA 0x86FA7E72E8D06D36c768Bd6176c45CCd22020e25, balance is now 0.001
 * Sending ETH from SA to 0x000000000000000000000000000000000000dead with amount 0.001
 * Tx hash: 0x3dee0dde2d846e117a87fffbdced142936a9f7f63477426a1ddd955e5d0677df
 * SA 0x86FA7E72E8D06D36c768Bd6176c45CCd22020e25 balance now is 0
 * TO 0x000000000000000000000000000000000000dead balance now is 0.001
 * DONE
 */
