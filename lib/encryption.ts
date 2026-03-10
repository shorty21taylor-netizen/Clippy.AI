import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY environment variable is not set");
}

/**
 * Encrypts a plaintext string using AES-256.
 * Used for storing sensitive data like social account tokens.
 */
export function encrypt(plaintext: string): string {
  return CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY!).toString();
}

/**
 * Decrypts an AES-256 encrypted string.
 */
export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY!);
  return bytes.toString(CryptoJS.enc.Utf8);
}
