import { UseInterceptors } from '@nestjs/common';
import { DecryptPaymentInterceptor } from '../interceptors/decrypt-payment.interceptor';

/**
 * Decorator to decrypt encrypted payment in request body
 *
 * Applies DecryptPaymentInterceptor which:
 * 1. Gets the registry private key from the database
 * 2. Decrypts the `payment` field from the request body
 * 3. Console.logs the decrypted payment JSON
 * 4. Replaces body.payment with the decrypted object
 *
 * Usage:
 * @Post('endpoint')
 * @DecryptPayment()
 * async handler(@Body() dto: YourDto) {
 *   // dto.payment now contains the decrypted payment object
 * }
 */
export const DecryptPayment = () => UseInterceptors(DecryptPaymentInterceptor);
