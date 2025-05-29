import 'dotenv/config';
import { JSONFile, Low } from '@commonify/lowdb';
import { type Address, createPublicClient, createTestClient, formatEther, Hex, http, parseEther } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { getBalance } from 'viem/actions';
import { toSafeSmartAccount, toSimpleSmartAccount } from 'permissionless/accounts';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { entryPoint07Address, entryPoint08Address, SmartAccount } from 'viem/account-abstraction';
import { foundry } from 'viem/chains';
import { createSmartAccountClient } from 'permissionless';

const RPC_TRANSPORT = http('http://localhost:8545');
const PAYMASTER_TRANSPORT = http('http://localhost:3000');
const BUNDLER_TRANSPORT = http('http://localhost:4337');

const ENTRY_POINT_07: any = { address: entryPoint07Address, version: '0.7' };
const ENTRY_POINT_08: any = { address: entryPoint08Address, version: '0.8' };

const ENTRY_POINT = ENTRY_POINT_07;
const useSafeSmartAccountType = true;

console.log(`Entry point: ${ENTRY_POINT.address} (${ENTRY_POINT.version})`);
console.log(`Smart Account type: ${useSafeSmartAccountType ? 'SafeSmartAccount' : 'SimpleSmartAccount'}`);

const publicClient = createPublicClient({
  chain: foundry,
  transport: RPC_TRANSPORT,
});

const paymasterClient = createPimlicoClient({
  transport: PAYMASTER_TRANSPORT,
  entryPoint: ENTRY_POINT,
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
  const cache = new Low<{ saAddress: Hex; address: Hex; pk: Hex }>(new JSONFile(`${process.cwd()}/.cache.json`));
  await cache.read();

  const privKeyHex = cache.data?.pk ?? (generatePrivateKey() as Hex);

  // Generate EOA from a private key using ethers.js
  const owner = privateKeyToAccount(privKeyHex);

  let smartAccount: SmartAccount;
  if (useSafeSmartAccountType) {
    /**
     * Safe Smart Account supports EntryPoint to 0.7
     * https://docs.pimlico.io/guides/how-to/accounts/comparison#1-safe
     * - Support: ERC-7579, Passkeys, Multiple Signers
     * - Audited by Various
     * - Gas Efficiency: Creation (401848), Native transfer (115469), ERC20 transfer (105089), Total (622406)
     */
    if (ENTRY_POINT.version === '0.8') throw new Error('Safe Smart Account does not support 0.8');
    smartAccount = await toSafeSmartAccount({
      client: publicClient,
      owners: [owner],
      entryPoint: ENTRY_POINT,
      version: '1.4.1',
    });
  } else {
    /**
     * Simple Smart Account supports EntryPoint to 0.8
     * https://docs.pimlico.io/guides/how-to/accounts/comparison#4-simple-smart-account
     * - Audited by OpenZeppelin
     * - Gas Efficiency: Creation (383218), Native transfer (101319), ERC20 transfer (90907), Total (575444)
     */
    smartAccount = await toSimpleSmartAccount({
      client: publicClient,
      owner: owner,
      entryPoint: ENTRY_POINT_08,
    });
  }

  const saAddress = smartAccount.address;
  console.log('EOA Wallet:', owner.address);
  console.log('Smart Account (SA):', saAddress);

  console.log('EOA balance:', formatEther(await getBalance(publicClient, { address: owner.address })));
  console.log(' SA balance:', formatEther(await getBalance(publicClient, { address: saAddress })));

  if (!cache.data) {
    cache.data = {
      saAddress: saAddress,
      address: owner.address,
      pk: privKeyHex,
    };
    await cache.write();
  }

  return createSmartAccountClient({
    account: smartAccount,
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
