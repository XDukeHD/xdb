/**
 * Backup system utility functions
 * Handles hashing, password generation, serialization, and file operations
 */

import { createHash, randomBytes } from 'crypto';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Generate SHA-256 checksum for a file
 */
export async function generateSha256(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Generate random password: 32 chars with uppercase, lowercase, digits
 */
export function generateBackupPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const allChars = uppercase + lowercase + digits;
  
  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  
  // Fill rest randomly
  for (let i = 3; i < 32; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Generate unique backup ID: timestamp + random suffix
 */
export function generateBackupId(): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  return `backup_${timestamp}_${random}`;
}

/**
 * Serialize backup overview to binary/text format (not encrypted)
 * Custom proprietary format for future extensibility
 */
export function serializeBackupOverview(data: {
  format: string;
  authKey: string;
  encryptionKey: string;
  createdAt: string;
  modifiedAt: string;
  engineVersion: string;
  systemVersion: string;
  files: Array<{ filename: string; size: number; checksum: string; compressed: boolean }>;
  totalFiles: number;
  totalSize: number;
  backupId: string;
}): string {
  // Custom format: JSON-based for easy future parsing
  // Structure: [header][data]
  // This allows for binary extensions in future versions
  
  const header = 'XDBINFO_V1\n';
  const payload = JSON.stringify(data, null, 2);
  const footer = '\nXDBINFO_END';
  
  return header + payload + footer;
}

/**
 * Deserialize backup overview from custom format
 */
export function deserializeBackupOverview(content: string): {
  format: string;
  authKey: string;
  encryptionKey: string;
  createdAt: string;
  modifiedAt: string;
  engineVersion: string;
  systemVersion: string;
  files: Array<{ filename: string; size: number; checksum: string; compressed: boolean }>;
  totalFiles: number;
  totalSize: number;
  backupId: string;
} {
  const lines = content.split('\n');
  
  if (lines[0] !== 'XDBINFO_V1') {
    throw new Error('Invalid backup overview format: missing header');
  }
  
  if (!lines[lines.length - 1].startsWith('XDBINFO_END')) {
    throw new Error('Invalid backup overview format: missing footer');
  }
  
  // Extract JSON payload (skip header and footer)
  const jsonContent = lines.slice(1, -1).join('\n');
  
  try {
    return JSON.parse(jsonContent);
  } catch (error) {
    throw new Error(`Invalid backup overview JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get the system backup database path
 */
export function getSystemXdbCorePath(dataDir: string): string {
  return join(dataDir, 'system.xdbCore');
}

/**
 * Get backup storage directory
 */
export function getBackupStoragePath(dataDir: string): string {
  return join(dataDir, '.backups');
}

/**
 * Get backup file path
 */
export function getBackupFilePath(dataDir: string, backupId: string): string {
  return join(getBackupStoragePath(dataDir), `${backupId}.zip`);
}

/**
 * Check if backup exists
 */
export async function backupExists(dataDir: string, backupId: string): Promise<boolean> {
  const path = getBackupFilePath(dataDir, backupId);
  return existsSync(path);
}
