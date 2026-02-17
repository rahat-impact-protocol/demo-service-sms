import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { PaymentIntentInterceptor } from '../interceptors/payment-intent.interceptor';

/**
 * Payment intent configuration metadata key
 */
export const PAYMENT_INTENT_CONFIG_KEY = 'payment-intent-config';

/**
 * Payment intent configuration interface
 */
export interface PaymentIntentConfig {
  tokenAddress: string; // ERC20 token contract address
  amount: string; // Amount in tokens (e.g., "1", "10")
  gatewayAddress: string; // Gateway contract address
  paymentApiUrl?: string; // Optional: defaults to http://localhost:8891
  rpc?: string; // Optional: RPC URL (will be determined from chainId if not provided)
}

/**
 * Decorator to require payment intent for a route
 * 
 * This decorator applies the PaymentIntentInterceptor which:
 * 1. Calls /payment/intent API to get payment details
 * 2. Executes the payment using generatePermitAndPay
 * 3. Verifies the payment via /payment/verify API
 * 
 * Usage:
 * @Get('endpoint')
 * @RequirePaymentIntent({
 *   tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
 *   amount: '1',
 *   gatewayAddress: '0xYourGatewayAddress'
 * })
 * async handler() {
 *   // Handler only executes if payment is successful
 * }
 */
export const RequirePaymentIntent = (config: PaymentIntentConfig) =>
  applyDecorators(
    UseInterceptors(PaymentIntentInterceptor),
    SetMetadata(PAYMENT_INTENT_CONFIG_KEY, config),
  );

