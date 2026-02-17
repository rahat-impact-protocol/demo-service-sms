import { UseInterceptors } from '@nestjs/common';
import { PaymentIntentInterceptor } from '../interceptors/payment-intent.interceptor';

/**
 * Decorator to apply payment intent interceptor
 * 
 * This is a convenience decorator that applies the PaymentIntentInterceptor
 * Use @RequirePaymentIntent() instead for configuration
 */
export const PaymentIntent = () => UseInterceptors(PaymentIntentInterceptor);

