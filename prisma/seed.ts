import { PrismaClient } from '@prisma/client';
import { generateServiceKeyPair } from '../src/utils/crypto.util';

const prisma = new PrismaClient();

async function main() {
  // Generate Ethereum-style keypair (secp256k1) using eciesjs
  const keyPair = generateServiceKeyPair();

  const registry = await prisma.registry.upsert({
    where: { id: 'main' },
    update: {
      baseUrl: 'http://localhost:8890',
      publicKey: keyPair.publicKey, // Hex encoded Ethereum public key (0x prefix)
      privateKey: keyPair.privateKey, // Hex encoded Ethereum private key (0x prefix)
    } as any,
    create: {
      id: 'main',
      baseUrl: 'http://localhost:8890',
      publicKey: keyPair.publicKey, // Hex encoded Ethereum public key (0x prefix)
      privateKey: keyPair.privateKey, // Hex encoded Ethereum private key (0x prefix)
    } as any,
  });

  console.log('Created/Updated registry with Ethereum keypair (secp256k1):');
  console.log('Public Key:', keyPair.publicKey);
  console.log('Private Key saved to database:', keyPair.privateKey ? 'Yes' : 'No');
  console.log('Registry ID:', registry.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
