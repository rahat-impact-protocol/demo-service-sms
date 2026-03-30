import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { decryptFromService } from '../utils/crypto.util';

/**
 * Interceptor to decrypt encrypted payload in request body
 * 
 * Reads the registry private key from the database and decrypts
 * the `payload` field in the request body using ECIES decryption.
 * 
 * Expected request body format:
 * {
 *   target: { ... },  // Optional target information
 *   payload: "0x..."  // Encrypted hex string
 * }
 * 
 * After decryption, the request body will be replaced with:
 * {
 *   target: { ... },  // Preserved from original
 *   ...decryptedPayload  // Decrypted payload fields spread into body
 * }
 */
@Injectable()
export class DecryptPayloadInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    // Validate request body structure
    if (!body) {
      throw new BadRequestException('Request body is required');
    }

     // Get application private key from settings table
    const accountSettings = await this.prisma.settings.findUnique({
      where: {name:'account'},
    });

    if (!accountSettings) {
      throw new InternalServerErrorException('Account settings not found');
    }

    const privateKey = (accountSettings.value as any)?.privateKey;
    if (!privateKey) {
      throw new InternalServerErrorException(
        'Account private key not found in settings. Cannot decrypt payload.',
      );
    }

    try {
      // Decrypt the payload
      const decryptedPayload = decryptFromService(
        privateKey,
        body.message,
      );

      // Validate decrypted payload is an object
      if (typeof decryptedPayload !== 'object' || decryptedPayload === null) {
        throw new BadRequestException(
          'Decrypted payload must be a valid JSON object',
        );
      }

      // Replace only the payload field with decrypted data, keep target intact
      request.body = decryptedPayload;

      return next.handle();
    } catch (error) {
      console.log('error', error);
      // Handle decryption errors
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to decrypt payload: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

