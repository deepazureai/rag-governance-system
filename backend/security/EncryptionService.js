const crypto = require('crypto');

class EncryptionService {
  constructor(encryptionKey = process.env.ENCRYPTION_KEY) {
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable not set');
    }
    this.encryptionKey = crypto.scryptSync(encryptionKey, 'salt', 32);
  }

  encrypt(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(ciphertext) {
    const parts = ciphertext.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = EncryptionService;
