/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
/**
 * AES-256-GCM Encryption with versioned key derivation.
 *
 * Format: v2:iv:tag:ciphertext (all hex-encoded)
 * Uses HKDF-derived key for cryptographic domain separation.
 */

import crypto from 'crypto';
import { deriveEncryptionKey } from './key-derivation.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getMasterKeyHex(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY not configured');
  return key;
}

function getDerivedKey(): Buffer {
  return deriveEncryptionKey(getMasterKeyHex());
}

/**
 * Encrypt a string using AES-256-GCM with HKDF-derived key.
 * Returns: v2:iv:tag:ciphertext (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `v2:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string encrypted with encrypt().
 */
export function decrypt(encrypted: string): string {
  const parts = encrypted.split(':');

  if (parts[0] !== 'v2' || parts.length !== 4) {
    throw new Error('Invalid encrypted format');
  }

  const key = getDerivedKey();
  const iv = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');
  const ciphertext = parts[3];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
