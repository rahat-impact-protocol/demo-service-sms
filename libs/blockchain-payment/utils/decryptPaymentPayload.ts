import { decrypt as eciesDecrypt } from 'eciesjs';

export const decryptPayload = (receiverPrivateKey, encryptedHex) => {
  // Remove 0x prefix if present and convert to buffer
  const priv = Buffer.from(receiverPrivateKey.replace(/^0x/, ''), 'hex');
  const encrypted = Buffer.from(encryptedHex.replace(/^0x/, ''), 'hex');

  // Decrypt using ECIES
  const decrypted = eciesDecrypt(priv, encrypted);

  // Parse JSON and return
  return JSON.parse(decrypted.toString('utf8'));
};
