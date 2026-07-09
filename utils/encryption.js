const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const getEncryptionKey = () => {
  const key = process.env.FIELD_ENCRYPTION_KEY;
  if (!key) {
    console.warn('⚠️ WARNING: FIELD_ENCRYPTION_KEY is not defined in environment. Using fallback key for development/test purposes.');
    // 32-byte fallback key in hex format
    return Buffer.from('8f2495d46fcae33215286cd29a73e51a629f1234bce925ab8167cd9ef2b12345', 'hex');
  }

  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }

  return crypto.createHash('sha256').update(key).digest();
};

const KEY = getEncryptionKey();

/**
 * Encrypts raw text using AES-256-CBC
 * @param {string} text - Plaintext to encrypt
 * @returns {string} ivHex:ciphertextHex
 */
const encryptField = (text) => {
  if (!text) return text;
  
  // If it already looks encrypted, skip to avoid double encryption
  if (typeof text === 'string' && text.includes(':') && text.split(':')[0].length === 32) {
    return text;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts encrypted text using AES-256-CBC
 * @param {string} encryptedText - ivHex:ciphertextHex
 * @returns {string} Plaintext
 */
const decryptField = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== 'string' || !encryptedText.includes(':')) {
    return encryptedText;
  }
  
  try {
    const parts = encryptedText.split(':');
    // Ensure the first part has length of IV hex (32 characters for 16 bytes)
    if (parts[0].length !== 32) {
      return encryptedText;
    }

    const [ivHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Return raw if decryption fails (e.g. legacy unencrypted values)
    return encryptedText;
  }
};

module.exports = {
  encryptField,
  decryptField
};
