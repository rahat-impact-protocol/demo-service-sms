import { PrivateKey } from 'eciesjs';
import { encrypt as eciesEncrypt, decrypt as eciesDecrypt } from 'eciesjs';

/**
 * Ethereum key pair structure (secp256k1)
 */
export interface KeyPair {
  privateKey: string; // Hex encoded private key (with 0x prefix)
  publicKey: string; // Hex encoded public key (with 0x prefix)
}

/**
 * Generate Ethereum-style keypair (secp256k1) using eciesjs
 * 
 * @returns KeyPair with hex encoded keys (0x prefix)
 */
export function generateServiceKeyPair(): KeyPair {
  const privateKey = new PrivateKey();
  const publicKey = privateKey.publicKey;

  return {
    privateKey: '0x' + privateKey.toHex(),
    publicKey: '0x' + publicKey.toHex(),
  };
}

/**
 * Encrypt payload using receiver's Ethereum public key (ECIES)
 * 
 * @param receiverPublicKey - Hex encoded Ethereum public key (with or without 0x prefix)
 * @param payload - The data to encrypt (object will be JSON stringified)
 * @returns Hex encoded encrypted data (with 0x prefix)
 */
export function encryptForService(
  receiverPublicKey: string,
  payload: object | string | Buffer,
): string {
  // Convert payload to buffer
  const data = Buffer.isBuffer(payload)
    ? payload
    : typeof payload === 'string'
      ? Buffer.from(payload, 'utf8')
      : Buffer.from(JSON.stringify(payload), 'utf8');

  // Remove 0x prefix if present and convert to buffer
  const pub = Buffer.from(receiverPublicKey.replace(/^0x/, ''), 'hex');

  // Encrypt using ECIES
  const encrypted = eciesEncrypt(pub, data);

  // Return as hex string with 0x prefix  
  return '0x' + Buffer.from(encrypted).toString('hex');
}

/**
 * Decrypt payload using receiver's Ethereum private key (ECIES)
 * 
 * @param receiverPrivateKey - Hex encoded Ethereum private key (with or without 0x prefix)
 * @param encryptedHex - Hex encoded encrypted data (with or without 0x prefix)
 * @returns Decrypted payload as object (parsed from JSON)
 */
export function decryptFromService(
  receiverPrivateKey: string,
  encryptedHex: string,
): any {
  // Remove 0x prefix if present and convert to buffer
  const priv = Buffer.from(receiverPrivateKey.replace(/^0x/, ''), 'hex');
  const encrypted = Buffer.from(encryptedHex.replace(/^0x/, ''), 'hex');

  // Decrypt using ECIES
  const decrypted = eciesDecrypt(priv, encrypted);

  // Parse JSON and return
  return JSON.parse(Buffer.from(decrypted).toString('utf8'));
}

/**
 * Decrypt payload and return as Buffer
 * 
 * @param receiverPrivateKey - Hex encoded Ethereum private key (with or without 0x prefix)
 * @param encryptedHex - Hex encoded encrypted data (with or without 0x prefix)
 * @returns Decrypted payload as Buffer
 */
export function decryptFromServiceAsBuffer(
  receiverPrivateKey: string,
  encryptedHex: string,
): Buffer {
  const priv = Buffer.from(receiverPrivateKey.replace(/^0x/, ''), 'hex');
  const encrypted = Buffer.from(encryptedHex.replace(/^0x/, ''), 'hex');

  return Buffer.from(eciesDecrypt(priv, encrypted));
}

/**
 * Decrypt payload and return as string (UTF-8)
 * 
 * @param receiverPrivateKey - Hex encoded Ethereum private key (with or without 0x prefix)
 * @param encryptedHex - Hex encoded encrypted data (with or without 0x prefix)
 * @returns Decrypted payload as string
 */
export function decryptFromServiceAsString(
  receiverPrivateKey: string,
  encryptedHex: string,
): string {
  return decryptFromServiceAsBuffer(receiverPrivateKey, encryptedHex).toString('utf8');
}
