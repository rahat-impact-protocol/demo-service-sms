import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { decryptFromService } from '../utils/crypto.util';
import { gatewayAbi } from './gatewayAbi';

export const erc20TokenAbi = [
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'nonces',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  // Needed for token.balanceOf(...)
  {
    constant: true,
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
] as const;

/**
 * Interceptor to decrypt encrypted payment in request body
 *
 * Reads the registry private key from the database and decrypts
 * the `payment` field in the request body using ECIES decryption.
 * Logs the decrypted payment JSON and attaches it to the request.
 *
 * Expected request body format:
 * {
 *   payment: "0x..."  // Encrypted hex string
 *   // ... other fields
 * }
 *
 * After decryption, request.body.payment is replaced with the decrypted object.
 */
@Injectable()
export class DecryptPaymentInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    if (!body) {
      throw new BadRequestException('Request body is required');
    }

    const encryptedPayment = body.payment;
    if (!encryptedPayment || typeof encryptedPayment !== 'string') {
      throw new BadRequestException(
        'Payment field is required (encrypted hex string)',
      );
    }

    try {
      const decryptedPayment = await this.getDecryptedPayload(encryptedPayment);

      request.body.payment = decryptedPayment;

      const rpcUrl = process.env.RPC_URL || process.env.RPC || '';

      const payer = request.body.payment.payer;

      const tokenAddress =
        (request.body?.tokenAddress as string | undefined) ||
        (request.body?.payment?.tokenAddress as string | undefined);

      const amountStr =
        (request.body?.amount as string | undefined) ||
        (request.body?.payment?.amount as string | undefined);

      if (!payer) {
        throw new BadRequestException('payer is required in request body');
      }
      if (!tokenAddress) {
        throw new BadRequestException(
          'tokenAddress is required in request body',
        );
      }
      if (!amountStr) {
        throw new BadRequestException('amount is required in request body');
      }
      if (!rpcUrl) {
        throw new InternalServerErrorException(
          'RPC_URL (or RPC) env var is required for balance checks',
        );
      }

      const minBalance = await this.parseAmountToBaseUnits(
        rpcUrl,
        tokenAddress,
        amountStr,
      );

      const { ok, balance } = await this.checkTokenBalance({
        rpcUrl,
        tokenAddress,
        ownerAddress: payer,
        minBalance,
      });

      if (!ok) {
        console.log('Insufficient token balance', {
          payer,
          tokenAddress,
          balance: balance.toString(),
          required: minBalance.toString(),
        });
        throw new BadRequestException('Insufficient token balance');
      }

      // After verifying sufficient balance, call the gateway contract with payWithPermit
      await this.callGatewayPayWithPermit({
        rpcUrl,
        tokenAddress,
        amount: minBalance,
        // Hardcoded paymentId for now as requested
        paymentId:
          '0x9fa4adbf9cb5e059e6a5a4ccdcd1df29f9975bc3b0b06af46e95e77693be6bf1',
        payer,
        v: request.body.payment.v,
        r: request.body.payment.r,
        s: request.body.payment.s,
        deadline: request.body.payment.deadline,
      });

      return next.handle();
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to decrypt payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Fetches registry private key, decrypts the encrypted payment hex, and returns the payload object.
   * @throws BadRequestException if decrypted value is not a valid JSON object
   * @throws InternalServerErrorException if registry or private key is missing
   */
  private async getDecryptedPayload(
    encryptedPayment: string,
  ): Promise<Record<string, unknown>> {
    const registry = await this.prisma.registry.findUnique({
      where: { id: 'main' },
    });

    if (!registry) {
      throw new InternalServerErrorException('Registry not found');
    }

    const privateKey = registry.privateKey;
    if (!privateKey) {
      throw new InternalServerErrorException(
        'Registry private key not found. Cannot decrypt payment.',
      );
    }

    const decrypted = decryptFromService(privateKey, encryptedPayment);

    if (typeof decrypted !== 'object' || decrypted === null) {
      throw new BadRequestException(
        'Decrypted payment must be a valid JSON object',
      );
    }

    return decrypted as Record<string, unknown>;
  }

  private async parseAmountToBaseUnits(
    rpcUrl: string,
    tokenAddress: string,
    amount: string,
  ): Promise<bigint> {
    // If it's already an integer-like string, treat it as base units.
    if (/^\d+$/.test(amount)) {
      return BigInt(amount);
    }

    // Otherwise treat it as token units and convert using token decimals.
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const token = new ethers.Contract(tokenAddress, erc20TokenAbi, provider);
    const decimals = (await token.decimals()) as number;
    return ethers.parseUnits(amount, decimals);
  }

  /**
   * Call the gateway contract's payWithPermit function after balance checks.
   */
  private async callGatewayPayWithPermit(params: {
    rpcUrl: string;
    tokenAddress: string;
    amount: bigint; // base units
    paymentId: string;
    payer: string;
    v: number;
    r: string;
    s: string;
    deadline: number | string | bigint;
  }): Promise<void> {
    const {
      rpcUrl,
      tokenAddress,
      amount,
      paymentId,
      payer,
      v,
      r,
      s,
      deadline,
    } = params;

    const gatewayAddressEnv =
      process.env.GATEWAY_ADDRESS ||
      '0x063Dc5BeB3c0957F484449A25933Ef9bB863EdDF';

    if (!gatewayAddressEnv || !gatewayAddressEnv.startsWith('0x')) {
      throw new InternalServerErrorException(
        'GATEWAY_ADDRESS env var is required and must be a valid address',
      );
    }

    const registry = await this.prisma.registry.findUnique({
      where: { id: 'main' },
    });

    if (!registry) {
      throw new InternalServerErrorException('Registry not found');
    }
    if (!registry.privateKey) {
      throw new InternalServerErrorException(
        'Registry private key not found. Cannot call gateway contract.',
      );
    }
    if (!registry.publicKey) {
      throw new InternalServerErrorException(
        'Registry public key not found. Cannot derive spender address.',
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(registry.privateKey, provider);

    const gateway = new ethers.Contract(gatewayAddressEnv, gatewayAbi, wallet);

    const deadlineBn = BigInt(deadline.toString());

    const tx = await gateway.payWithPermit(
      tokenAddress,
      amount,
      paymentId,
      deadlineBn,
      v,
      r,
      s,
      payer,
      wallet.address,
    );

    console.log('Gateway payWithPermit tx sent:', tx.hash);
    const receipt = await tx.wait();
    if (receipt.status !== 1n && receipt.status !== 1) {
      throw new InternalServerErrorException(
        'Gateway payWithPermit transaction failed',
      );
    }
  }

  /**
   * Check ERC20 token balance for an owner address.
   *
   * Uses `registry.privateKey` only to construct a Wallet instance (per your requirement),
   * but reads balance via a read-only provider call.
   */
  private async checkTokenBalance(params: {
    rpcUrl: string;
    tokenAddress: string;
    ownerAddress: string;
    minBalance?: bigint; // in base units
  }): Promise<{ ok: boolean; balance: bigint }> {
    const { rpcUrl, tokenAddress, ownerAddress, minBalance } = params;

    if (!rpcUrl) {
      throw new BadRequestException('rpcUrl is required');
    }
    if (!tokenAddress || !tokenAddress.startsWith('0x')) {
      throw new BadRequestException('tokenAddress must be a valid address');
    }
    if (!ownerAddress || !ownerAddress.startsWith('0x')) {
      throw new BadRequestException('ownerAddress must be a valid address');
    }

    const registry = await this.prisma.registry.findUnique({
      where: { id: 'main' },
    });
    if (!registry) {
      throw new InternalServerErrorException('Registry not found');
    }
    if (!registry.privateKey) {
      throw new InternalServerErrorException(
        'Registry private key not found. Cannot check token balance.',
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    // Construct wallet as requested (not required for balanceOf read)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const wallet = new ethers.Wallet(registry.privateKey, provider);

    const token = new ethers.Contract(tokenAddress, erc20TokenAbi, provider);

    const balance = (await token.balanceOf(ownerAddress)) as bigint;
    const ok = typeof minBalance === 'bigint' ? balance >= minBalance : true;
    return { ok, balance };
  }
}
