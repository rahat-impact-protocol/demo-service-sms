import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import {
  PAYMENT_INTENT_CONFIG_KEY,
  PaymentIntentConfig,
} from '../decorators/require-payment-intent.decorator';
import { generatePermitAndPay } from '../utils/payment.util';

/**
 * Interceptor to handle payment intent flow
 * 
 * Flow:
 * 1. Calls /payment/intent API to get payment details (paymentId, tokenAddress, amount, chainId)
 * 2. Executes payment using generatePermitAndPay with the paymentId
 * 3. Verifies payment via /payment/verify API
 * 4. Logs the verification response
 */
@Injectable()
export class PaymentIntentInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // Get payment intent config from route metadata
    const config = this.reflector.get<PaymentIntentConfig>(
      PAYMENT_INTENT_CONFIG_KEY,
      context.getHandler(),
    );

    // If no config, skip payment validation
    if (!config) {
      return next.handle();
    }

    const paymentApiUrl = config.paymentApiUrl || 'http://localhost:8891';

    try {
      // Step 1: Get payment intent
      console.log('Step 1: Getting payment intent...');
      const intentResponse = await fetch(`${paymentApiUrl}/payment/intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenAddress: config.tokenAddress,
          amount: config.amount,
        }),
      });

      if (!intentResponse.ok) {
        throw new HttpException(
          `Failed to get payment intent: ${intentResponse.statusText}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const intentData = await intentResponse.json();
      console.log('Payment intent received:', intentData);

      const { paymentId, tokenAddress, amount, chainId } = intentData;

      if (!paymentId || !tokenAddress || !amount || !chainId) {
        throw new HttpException(
          'Invalid payment intent response',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Step 2: Execute payment using generatePermitAndPay
      console.log('Step 2: Executing payment...');
      
      // Determine RPC URL from chainId if not provided
      const rpc = config.rpc || this.getRpcUrlFromChainId(chainId);

      console.log('RPC:', rpc);
      console.log('Gateway Address:', config.gatewayAddress);
      console.log('Payment ID:', paymentId);
      console.log('Amount:', amount);
      console.log('Token Address:', tokenAddress);
      
      const transactionHash = await generatePermitAndPay({
        amount,
        tokenAddress,
        rpc,
        gatewayAddress: config.gatewayAddress,
        paymentId,
      });

      console.log('Payment transaction hash:', transactionHash);

      // Step 3: Verify payment
      console.log('Step 3: Verifying payment...');
      const verifyResponse = await fetch(`${paymentApiUrl}/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId,
          txHash: transactionHash,
        }),
      });

      if (!verifyResponse.ok) {
        throw new HttpException(
          `Payment verification failed: ${verifyResponse.statusText}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const verifyData = await verifyResponse.json();
      console.log('Payment verification response:', verifyData);

      // Payment successful, proceed to handler
      return next.handle();
    } catch (error) {
      console.error('Payment intent error:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get RPC URL from chain ID
   */
  private getRpcUrlFromChainId(chainId: number): string {
    // Map common chain IDs to RPC URLs
    const chainIdToRpc: Record<number, string> = {
      84532: 'https://base-sepolia.g.alchemy.com/v2/9U6ZNgBvVAhsXX6Klq4YN4wNLhW8CfJr', // Base Sepolia
      8453: 'https://mainnet.base.org', // Base Mainnet
      11155111: 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID', // Sepolia
      // Add more as needed
    };

    const rpc = chainIdToRpc[chainId];
    if (!rpc) {
      throw new Error(`No RPC URL configured for chain ID ${chainId}`);
    }

    return rpc;
  }
}

