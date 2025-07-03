import { randomBytes, createCipher, createDecipher, scryptSync } from 'crypto';
import { logger } from '@/lib/logger';

interface EncryptionResult {
  encryptedData: string;
  salt: string;
}

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-cbc';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 16;

  /**
   * Generate a secure key from a password and salt
   */
  private static generateKey(password: string, salt: Buffer): Buffer {
    return scryptSync(password, salt, this.KEY_LENGTH);
  }

  /**
   * Get the encryption password from environment or generate a default
   */
  private static getEncryptionPassword(): string {
    const password = process.env.ENCRYPTION_KEY || process.env.DATABASE_URL;
    if (!password) {
      logger.warn('No encryption key found in environment variables, using default');
      return 'default-encryption-key-please-change-in-production';
    }
    return password;
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(data: string): EncryptionResult {
    try {
      const password = this.getEncryptionPassword();
      const salt = randomBytes(this.SALT_LENGTH);
      const key = this.generateKey(password, salt);
      const iv = randomBytes(this.IV_LENGTH);
      
      const cipher = createCipher(this.ALGORITHM, key);
      cipher.setAutoPadding(true);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine IV and encrypted data
      const encryptedData = iv.toString('hex') + ':' + encrypted;
      
      return {
        encryptedData,
        salt: salt.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption failed', error as Error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string, salt: string): string {
    try {
      const password = this.getEncryptionPassword();
      const saltBuffer = Buffer.from(salt, 'hex');
      const key = this.generateKey(password, saltBuffer);
      
      const [ivHex, encrypted] = encryptedData.split(':');
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipher(this.ALGORITHM, key);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', error as Error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt AWS credentials
   */
  static encryptCredentials(credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  }): {
    encryptedAccessKey: string;
    encryptedSecretKey: string;
    encryptedSessionToken?: string;
    salt: string;
  } {
    const salt = randomBytes(this.SALT_LENGTH).toString('hex');
    
    const accessKeyResult = this.encrypt(credentials.accessKeyId);
    const secretKeyResult = this.encrypt(credentials.secretAccessKey);
    
    const result = {
      encryptedAccessKey: accessKeyResult.encryptedData,
      encryptedSecretKey: secretKeyResult.encryptedData,
      salt
    };

    if (credentials.sessionToken) {
      const sessionTokenResult = this.encrypt(credentials.sessionToken);
      (result as any).encryptedSessionToken = sessionTokenResult.encryptedData;
    }

    return result;
  }

  /**
   * Decrypt AWS credentials
   */
  static decryptCredentials(encryptedCredentials: {
    encryptedAccessKey: string;
    encryptedSecretKey: string;
    encryptedSessionToken?: string;
    salt: string;
  }): {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  } {
    const accessKeyId = this.decrypt(encryptedCredentials.encryptedAccessKey, encryptedCredentials.salt);
    const secretAccessKey = this.decrypt(encryptedCredentials.encryptedSecretKey, encryptedCredentials.salt);
    
    const result = {
      accessKeyId,
      secretAccessKey
    };

    if (encryptedCredentials.encryptedSessionToken) {
      (result as any).sessionToken = this.decrypt(encryptedCredentials.encryptedSessionToken, encryptedCredentials.salt);
    }

    return result;
  }
} 