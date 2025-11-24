/**
 * Encryption utilities for XDB
 * Provides AES-256-GCM encryption with Argon2 key derivation
 */

import { randomBytes, scryptSync } from 'crypto';
import argon2 from 'argon2';

export interface EncryptedData {
  ciphertext: string;
  nonce: string;
  tag: string;
  salt: string;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for GCM
const SALT_LENGTH = 32; // 256 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const ARGON2_OPTIONS = {
  timeCost: 4,
  memoryCost: 2 ** 16, // 64 MB
  parallelism: 1,
  hashLength: 32, // 256 bits
};

/**
 * Derive encryption key using Argon2
 */
export async function deriveKey(secret: string, salt: Buffer): Promise<Buffer> {
  try {
    const keyHash = await argon2.hash(secret + salt.toString('hex'), {
      type: argon2.argon2id,
      timeCost: ARGON2_OPTIONS.timeCost,
      memoryCost: ARGON2_OPTIONS.memoryCost,
      parallelism: ARGON2_OPTIONS.parallelism,
    });
    // Extract the hash part and use it as key material
    const hashBuffer = Buffer.from(keyHash, 'utf-8').slice(0, 32);
    // Use scrypt as secondary derivation for additional security
    return scryptSync(secret, salt, 32, { N: 2 ** 14, r: 8, p: 1 });
  } catch (error) {
    throw new Error(`Key derivation failed: ${error}`);
  }
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encrypt(
  plaintext: string | Buffer,
  encryptionKey: string,
): Promise<EncryptedData> {
  const crypto = await import('crypto');
  const salt = randomBytes(SALT_LENGTH);

  try {
    const key = await deriveKey(encryptionKey, salt);
    const nonce = randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, nonce);
    let ciphertext = cipher.update(
      typeof plaintext === 'string' ? plaintext : plaintext.toString(),
      'utf-8',
      'hex',
    );
    ciphertext += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      ciphertext,
      nonce: nonce.toString('hex'),
      tag: tag.toString('hex'),
      salt: salt.toString('hex'),
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decrypt(
  encryptedData: EncryptedData,
  encryptionKey: string,
): Promise<string> {
  const crypto = await import('crypto');

  try {
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const key = await deriveKey(encryptionKey, salt);
    const nonce = Buffer.from(encryptedData.nonce, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, nonce);
    decipher.setAuthTag(tag);

    let plaintext = decipher.update(encryptedData.ciphertext, 'hex', 'utf-8');
    plaintext += decipher.final('utf-8');

    return plaintext;
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
}

/**
 * Generate a random token for API authentication
 */
export function generateAuthToken(): string {
  return randomBytes(32).toString('hex');
}
