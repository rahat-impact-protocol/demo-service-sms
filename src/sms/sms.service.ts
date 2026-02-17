import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { encryptForService } from '../utils/crypto.util';

@Injectable()
export class SmsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecipientList(page: number = 1, skip: number = 10): Promise<any> {
    // Get registry info from database
    const registry = await this.prisma.registry.findUnique({
      where: { id: 'main' },
    });

    if (!registry) {
      throw new Error('Registry not found');
    }

    if (!registry.publicKey) {
      throw new Error('Registry public key not found');
    }

    // Prepare payload to encrypt
    const payloadData = {
      page,
      skip,
    };

    // Encrypt the payload
    const encryptedPayload = encryptForService(
      registry.publicKey,
      payloadData,
    );

    console.log('Encrypted payload', encryptedPayload);

    // Return encrypted payload
    return encryptedPayload;
  }
}
