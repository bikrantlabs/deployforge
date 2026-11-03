import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

/**
 * IV = Initialization Vector: They are random values feeded into encryption process so that
 * encrypting the same data with same key never produces the same result.
 */
const IV_LENGTH = 12; // random bytes created for every encryption
const TAG_LENGTH = 16; // tamper-detection bytes that AES-GCM adds

/**
 *
 * @param key 32-byte secret used for encryption
 * @param data  the original data to be encrypted
 * @param label a name tag attached to encryption. E.g. "project-key|{projectId}". Decrypting only works
 * if the same label is provided.
 */
export function encryptBytes(
  masterKey: Buffer,
  data: Buffer,
  label: string,
): Buffer {
  const iv = randomBytes(IV_LENGTH);

  // AAD means Additional Authenticated Data
  // it's the data which we authenticate against, but not encrypt.
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  cipher.setAAD(Buffer.from(label));

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, tag]);
}

/**
 * Reverses encryptBytes: turns stored bytes back into the original data.
 * Throws an error if the key is wrong, the label doesn't match,
 * or the stored bytes were modified.
 */
export function decryptBytes(
  key: Buffer,
  stored: Buffer,
  label: string,
): Buffer {
  // Split the stored blob back into its three parts.
  const iv = stored.subarray(0, IV_LENGTH);
  const tag = stored.subarray(stored.length - TAG_LENGTH);
  const encrypted = stored.subarray(IV_LENGTH, stored.length - TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(label));
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
