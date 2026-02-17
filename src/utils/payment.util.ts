import { ethers } from 'ethers';
import { randomBytes } from 'crypto';

/**
 * Interface for payment permit parameters
 */
export interface PaymentPermitParams {
  amount: string; // Amount in tokens (e.g., "1", "10")
  tokenAddress: string; // ERC20 token contract address
  rpc: string; // RPC URL for the network
  gatewayAddress: string; // Required: gateway contract address
  privateKey?: string; // Optional: defaults to process.env.PRIVATE_KEY
  deadlineHours?: number; // Optional: defaults to 1 hour
  paymentId?: string; // Optional: will be generated if not provided
}

/**
 * Generate ERC20 Permit signature and execute payWithPermit transaction
 * 
 * @param params - Payment permit parameters
 * @returns Transaction hash
 * 
 * @example
 * ```ts
 * const txHash = await generatePermitAndPay({
 *   amount: "10",
 *   tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
 *   rpc: "https://sepolia.base.org/rpc"
 * });
 * ```
 */
export async function generatePermitAndPay(
  params: PaymentPermitParams,
): Promise<string> {
  const {
    amount,
    tokenAddress,
    rpc,
    gatewayAddress,
    privateKey = process.env.PRIVATE_KEY || '',
    deadlineHours = parseInt(process.env.DEADLINE_HOURS || '1', 10),
    paymentId = ethers.hexlify(randomBytes(32)),
  } = params;

  // Validate required parameters
  if (!privateKey || privateKey === '') {
    throw new Error('PRIVATE_KEY is required (provide via params or env)');
  }

  if (!tokenAddress || !tokenAddress.startsWith('0x')) {
    throw new Error('tokenAddress must be a valid Ethereum address');
  }

  if (!gatewayAddress || !gatewayAddress.startsWith('0x')) {
    throw new Error('gatewayAddress is required and must be a valid Ethereum address');
  }

  // User wallet
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(privateKey, provider);

  // ERC20 Permit token details
  const value = ethers.parseUnits(amount, 1); // Amount in tokens (assuming 18 decimals)
  const deadline = Math.floor(Date.now() / 1000) + deadlineHours * 3600; // deadlineHours from now

  // Get token's name and nonce
  const ERC20PermitAbi = [
    'function name() view returns (string)',
    'function nonces(address owner) view returns (uint256)',
    'function DOMAIN_SEPARATOR() view returns (bytes32)',
  ];

  const token = new ethers.Contract(tokenAddress, ERC20PermitAbi, provider);

  const name = await token.name();
  const nonce = await token.nonces(wallet.address);
  const network = await provider.getNetwork();

  // EIP-712 domain
  const domain = {
    name,
    version: '1',
    chainId: Number(network.chainId),
    verifyingContract: tokenAddress,
  };

  // Permit types
  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  // Message
  const message = {
    owner: wallet.address,
    spender: gatewayAddress,
    value,
    nonce,
    deadline,
  };

  // Sign typed data
  const signature = await wallet.signTypedData(domain, types, message);
  const sig = ethers.Signature.from(signature);

  // Call payWithPermit on the contract
  const gatewayAbi = [
    'function payWithPermit(address token, uint256 amount, bytes32 paymentId, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external',
  ];

  const gateway = new ethers.Contract(gatewayAddress, gatewayAbi, wallet);

  const tx = await gateway.payWithPermit(
    tokenAddress,
    value,
    paymentId,
    deadline,
    sig.v,
    sig.r,
    sig.s,
  );

  console.log('Transaction sent:', tx.hash);
  console.log('Waiting for confirmation...');

  const receipt = await tx.wait();

  if (receipt.status !== 1) {
    throw new Error('Transaction failed');
  }

  return receipt.hash;
}

