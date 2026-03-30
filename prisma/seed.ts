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
  console.log(
    'Private Key saved to database:',
    keyPair.privateKey ? 'Yes' : 'No',
  );
  console.log('Registry ID:', registry.id);
  
  console.log("-----------Adding the sms service provider-----------")

  const smsProvider = await prisma.smsProvider.create({
    data: {
      name: 'SMS Provider',
      value: {
        url: '',
        body: {
          to: '{%address%}',
          from: 'TheAlert',
          text: '{%message.content%}',
          token: "ghjkl;'adssfgtyd",
        },
      },
    },
  });

  console.log('Created/Updated SMS Provider:');
  console.log('UUID:', smsProvider.uuid);
  console.log('Name:', smsProvider.name);


   await prisma.settings.upsert({
    where: { name: 'account' },
    update: {},
    create: {
      name: 'account',
      value: {
        //need update the private key used for contract deployment
        privateKey: '404b135088bc4046t8ae06c939e3aa2c3ea0fdc0d8c9109926fa5cb7184ec08f',
      },
      dataType: 'OBJECT',
      requiredFields: ['privateKey'],
      isReadOnly: false,
      isPrivate: true,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
