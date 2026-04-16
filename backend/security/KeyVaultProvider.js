class KeyVaultProvider {
  constructor(vaultUrl) {
    this.cache = new Map();
    this.vaultUrl = vaultUrl;
    const { SecretClient } = require('@azure/keyvault-secrets');
    const { DefaultAzureCredential } = require('@azure/identity');
    this.client = new SecretClient(vaultUrl, new DefaultAzureCredential());
  }

  async getSecret(secretName) {
    // Check cache first
    if (this.cache.has(secretName)) {
      return this.cache.get(secretName);
    }

    try {
      const secret = await this.client.getSecret(secretName);
      // Cache for 1 hour
      this.cache.set(secretName, secret.value);
      setTimeout(() => this.cache.delete(secretName), 3600000);
      return secret.value;
    } catch (err) {
      throw new Error(`Failed to retrieve secret ${secretName}: ${err.message}`);
    }
  }

  async setSecret(secretName, secretValue) {
    try {
      await this.client.setSecret(secretName, secretValue);
      this.cache.set(secretName, secretValue);
      return { success: true };
    } catch (err) {
      throw new Error(`Failed to set secret ${secretName}: ${err.message}`);
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = KeyVaultProvider;
