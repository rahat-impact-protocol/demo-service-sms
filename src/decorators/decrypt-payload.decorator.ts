import { UseInterceptors } from '@nestjs/common';
import { DecryptPayloadInterceptor } from '../interceptors/decrypt-payload.interceptor';

/**
 * Decorator to decrypt encrypted payload in request body
 * 
 * This decorator applies the DecryptPayloadInterceptor to the route handler.
 * The interceptor will:
 * 1. Get the registry private key from the database
 * 2. Decrypt the `payload` field from the request body
 * 3. Replace the encrypted hex string with the decrypted object
 * 
 * Usage:
 * @Post('endpoint')
 * @DecryptPayload()
 * async handler(@Body() dto: YourDto) {
 *   // dto.payload now contains the decrypted payload
 * }
 */
export const DecryptPayload = () => UseInterceptors(DecryptPayloadInterceptor);

