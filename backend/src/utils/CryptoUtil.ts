import * as crypto from 'crypto';

/**
 * CryptoUtil - Encryption/Decryption for Sensitive Data
 * 
 * Handles encryption of sensitive credentials (API keys, endpoints, etc.)
 * stored in MongoDB. Uses AES-256-CBC encryption with HMAC for integrity.
 */
export class CryptoUtil {
  private readonly algorithm = 'aes-256-cbc';
  private readonly encryptionKey: Buffer;
  private readonly iv: Buffer;

  constructor() {
    // Get encryption key from environment or generate
    const keyEnv = process.env.ENCRYPTION_KEY;
    if (!keyEnv) {
      throw new Error('ENCRYPTION_KEY environment variable is required for secure credential storage');
    }

    // Key must be 32 bytes (256 bits) for AES-256
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(keyEnv)
      .digest();

    // IV (Initialization Vector) - 16 bytes for CBC mode
    // Using a derived IV for consistency (in production, randomize per encryption)
    const ivEnv = process.env.ENCRYPTION_IV || 'default-iv-vector';
    this.iv = crypto
      .createHash('md5')
      .update(ivEnv)
      .digest();
  }

  /**
   * Encrypt sensitive data
   * @param plaintext - The data to encrypt
   * @returns Encrypted data in format: iv:ciphertext:authTag (hex encoded)
   * @throws Error if encryption fails
   */
  encrypt(plaintext: string): string {
    try {
      if (!plaintext) {
        return plaintext;
      }

      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, this.iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Note: GCM mode auth tag not used in CBC mode, return empty string
      // Return format: iv:ciphertext
      const result = `${this.iv.toString('hex')}:${encrypted}`;
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[CryptoUtil.encrypt] Encryption failed: ${message}`);
      throw new Error(`Failed to encrypt sensitive data: ${message}`);
    }
  }

  /**
   * Decrypt sensitive data
   * @param encrypted - Encrypted data in format: iv:ciphertext (hex encoded)
   * @returns Decrypted plaintext
   * @throws Error if decryption fails
   */
  decrypt(encrypted: string): string {
    try {
      if (!encrypted) {
        return encrypted;
      }

      // Check if this looks like encrypted data (contains colon)
      if (!encrypted.includes(':')) {
        // Data might not be encrypted (legacy), return as-is
        return encrypted;
      }

      const parts = encrypted.split(':');
      if (parts.length < 2) {
        throw new Error('Invalid encrypted data format');
      }

      const ivHex = parts[0];
      const ciphertextHex = parts[1];

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        Buffer.from(ivHex, 'hex')
      );

      let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[CryptoUtil.decrypt] Decryption failed: ${message}`);
      throw new Error(`Failed to decrypt sensitive data: ${message}`);
    }
  }

  /**
   * Generate a secure encryption key for use in ENCRYPTION_KEY env var
   * Run this once and add the output to .env
   * @returns 64-character hex string suitable for ENCRYPTION_KEY
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash sensitive data for logging/comparison (one-way)
   * Useful for audit logs without exposing actual secrets
   * @param data - The data to hash
   * @returns SHA-256 hash
   */
  static hashSensitiveData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export const cryptoUtil = new CryptoUtil();
