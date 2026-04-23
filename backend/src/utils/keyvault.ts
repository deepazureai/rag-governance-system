/**
 * KeyVault Utility
 * Handles credential encryption and storage for database connections
 * In production: uses Azure KeyVault or AWS Secrets Manager
 * In development: uses encrypted environment variables
 */

import crypto from 'crypto';

// For production, this would integrate with Azure KeyVault or AWS Secrets Manager
// For now, we use environment-based storage with encryption

export interface StoredCredential {
  credentialId: string;
  encryptedValue: string;
  encryptionMethod: 'aes-256-gcm' | 'env-ref';
  keyVaultReference?: string;
  createdAt: Date;
}

class KeyVaultManager {
  private encryptionKey: string;

  constructor() {
    // In production, load from secure KMS. For development, use env var
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'dev-key-change-in-production';
  }

  /**
   * Store database credentials securely
   * Returns reference that can be stored in database
   */
  storeCredential(credentialId: string, credentialValue: string): StoredCredential {
    try {
      // In production environment with KeyVault setup
      if (process.env.KEYVAULT_NAME) {
        return {
          credentialId,
          encryptedValue: credentialId,
          encryptionMethod: 'env-ref',
          keyVaultReference: `${process.env.KEYVAULT_NAME}/secrets/${credentialId}`,
          createdAt: new Date(),
        };
      }

      // Development: encrypt and store in environment variable
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.encryptionKey.padEnd(32, '\0')), crypto.randomBytes(16));
      let encrypted = cipher.update(credentialValue, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      const fullEncrypted = `${encrypted}:${authTag.toString('hex')}`;
      process.env[`CRED_${credentialId}`] = fullEncrypted;

      return {
        credentialId,
        encryptedValue: fullEncrypted,
        encryptionMethod: 'aes-256-gcm',
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('[KeyVault] Error storing credential:', error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt stored credentials
   */
  retrieveCredential(credentialId: string): string | null {
    try {
      const storedValue = process.env[`CRED_${credentialId}`];
      if (!storedValue) {
        console.warn(`[KeyVault] Credential not found: ${credentialId}`);
        return null;
      }

      // Decrypt the credential
      const [encrypted, authTagHex] = storedValue.split(':');
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(this.encryptionKey.padEnd(32, '\0')), Buffer.from(encrypted.slice(0, 32), 'hex'));
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('[KeyVault] Error retrieving credential:', error);
      return null;
    }
  }

  /**
   * Create credential reference for storage in database
   * This is what gets stored in DatabaseConnection.credentials.keyVaultReference
   */
  createCredentialReference(applicationId: string, credentialType: string): string {
    return `${applicationId}/${credentialType}/${Date.now()}`;
  }
}

export const keyVaultManager = new KeyVaultManager();
