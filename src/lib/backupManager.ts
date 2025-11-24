/**
 * COMPLETE REWRITE - Backup and Restore System
 * Simplified, tested, and production-ready implementation
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { randomBytes, createHash } from 'crypto';

/**
 * Generate SHA-256 hash of data
 */
export function hashData(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate random 32-char alphanumeric password
 */
export function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 32; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

/**
 * Generate unique backup ID
 */
export function generateBackupId(): string {
  return `backup_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

/**
 * Backup metadata and file information
 */
export interface BackupData {
  backupId: string;
  createdAt: string;
  version: string;
  authKey: string;
  encryptionKey: string;
  files: Array<{
    name: string;
    hash: string;
    size: number;
  }>;
  totalFiles: number;
  totalSize: number;
}

/**
 * Read all .xdb files from directory
 */
export async function collectDatabaseFiles(dataDir: string): Promise<Array<{ path: string; name: string; data: Buffer; hash: string }>> {
  const files: Array<{ path: string; name: string; data: Buffer; hash: string }> = [];

  if (!existsSync(dataDir)) {
    return files;
  }

  const entries = await readdir(dataDir);
  for (const entry of entries) {
    if (entry.endsWith('.xdb') && !entry.startsWith('.')) {
      const path = join(dataDir, entry);
      const data = await readFile(path);
      const hash = hashData(data);
      files.push({
        path,
        name: entry,
        data,
        hash,
      });
    }
  }

  return files;
}

/**
 * Get paths
 */
export function getBackupDir(dataDir: string): string {
  return join(dataDir, '.backups');
}

export function getBackupZipPath(dataDir: string, backupId: string): string {
  return join(getBackupDir(dataDir), `${backupId}.zip`);
}

export function getBackupMetadataPath(dataDir: string, backupId: string): string {
  return join(getBackupDir(dataDir), `${backupId}.meta.json`);
}

export function getSystemCorePath(dataDir: string): string {
  return join(dataDir, 'system.xdbCore');
}

/**
 * Create backup metadata file (plain JSON, not encrypted)
 */
export async function createBackupMetadata(
  dataDir: string,
  backupId: string,
  authKey: string,
  encryptionKey: string,
  files: Array<{ name: string; hash: string; size: number }>,
): Promise<void> {
  const metadata: BackupData = {
    backupId,
    createdAt: new Date().toISOString(),
    version: '1.0.0',
    authKey,
    encryptionKey,
    files,
    totalFiles: files.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
  };

  const metaPath = getBackupMetadataPath(dataDir, backupId);
  await writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
}

/**
 * Load backup metadata
 */
export async function loadBackupMetadata(dataDir: string, backupId: string): Promise<BackupData> {
  const metaPath = getBackupMetadataPath(dataDir, backupId);
  const content = await readFile(metaPath, 'utf8');
  return JSON.parse(content);
}

/**
 * Get backup password (retrieve from passwords.json file)
 */
export async function getBackupPassword(dataDir: string, backupId: string): Promise<string | null> {
  const backupDir = getBackupDir(dataDir);
  const passwordsFile = join(backupDir, '.passwords.json');

  if (!existsSync(passwordsFile)) {
    return null;
  }

  try {
    const content = await readFile(passwordsFile, 'utf8');
    const passwords = JSON.parse(content) as Record<string, { password: string; createdAt: string }>;
    return passwords[backupId]?.password || null;
  } catch {
    return null;
  }
}

/**
 * List all backups
 */
export async function listBackups(dataDir: string): Promise<string[]> {
  const backupDir = getBackupDir(dataDir);
  if (!existsSync(backupDir)) {
    return [];
  }

  const entries = await readdir(backupDir);
  const backupIds = new Set<string>();

  for (const entry of entries) {
    if (entry.endsWith('.meta.json')) {
      const backupId = entry.replace('.meta.json', '');
      backupIds.add(backupId);
    }
  }

  return Array.from(backupIds).sort().reverse();
}

/**
 * Delete backup files
 */
export async function deleteBackup(dataDir: string, backupId: string): Promise<void> {
  const zipPath = getBackupZipPath(dataDir, backupId);
  const metaPath = getBackupMetadataPath(dataDir, backupId);

  if (existsSync(zipPath)) {
    rmSync(zipPath);
  }
  if (existsSync(metaPath)) {
    rmSync(metaPath);
  }
}

/**
 * Restore files from backup metadata
 */
export async function restoreFilesFromMetadata(
  dataDir: string,
  files: Array<{ name: string; data: Buffer; hash: string }>,
): Promise<{ success: number; failed: number; errors: Array<{ file: string; reason: string }> }> {
  const errors: Array<{ file: string; reason: string }> = [];
  let success = 0;
  let failed = 0;

  // Ensure directory exists
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }

  for (const file of files) {
    try {
      // Verify hash
      const hash = hashData(file.data);
      if (hash !== file.hash) {
        errors.push({
          file: file.name,
          reason: `Checksum mismatch: expected ${file.hash}, got ${hash}`,
        });
        failed++;
        continue;
      }

      // Write file
      const filePath = join(dataDir, file.name);
      await writeFile(filePath, file.data);
      success++;
    } catch (err) {
      errors.push({
        file: file.name,
        reason: err instanceof Error ? err.message : String(err),
      });
      failed++;
    }
  }

  return { success, failed, errors };
}

/**
 * Store backup password
 */
export async function storeBackupPassword(
  dataDir: string,
  backupId: string,
  password: string,
): Promise<void> {
  const backupDir = getBackupDir(dataDir);
  const passwordsFile = join(backupDir, '.passwords.json');

  let passwords: Record<string, { password: string; createdAt: string }> = {};

  // Read existing passwords
  if (existsSync(passwordsFile)) {
    try {
      const content = await readFile(passwordsFile, 'utf8');
      passwords = JSON.parse(content);
    } catch {
      passwords = {};
    }
  }

  // Add new password
  passwords[backupId] = {
    password,
    createdAt: new Date().toISOString(),
  };

  // Write back
  await writeFile(passwordsFile, JSON.stringify(passwords, null, 2));
}

/**
 * List all backups with their passwords
 */
export async function listBackupsWithPasswords(
  dataDir: string,
): Promise<
  Array<{
    backupId: string;
    password: string;
    createdAt: string;
    fileSize: number;
  }>
> {
  const backupDir = getBackupDir(dataDir);
  const passwordsFile = join(backupDir, '.passwords.json');

  if (!existsSync(backupDir)) {
    return [];
  }

  let passwords: Record<string, { password: string; createdAt: string }> = {};

  if (existsSync(passwordsFile)) {
    try {
      const content = await readFile(passwordsFile, 'utf8');
      passwords = JSON.parse(content);
    } catch {
      passwords = {};
    }
  }

  const backups: Array<{
    backupId: string;
    password: string;
    createdAt: string;
    fileSize: number;
  }> = [];

  const entries = await readdir(backupDir);
  for (const entry of entries) {
    if (entry.endsWith('.zip') && !entry.startsWith('.')) {
      const backupId = entry.replace('.zip', '');
      const zipPath = join(backupDir, entry);
      const stats = await readFile(zipPath).then(data => ({ size: data.length }));

      const passwordInfo = passwords[backupId];
      if (passwordInfo) {
        backups.push({
          backupId,
          password: passwordInfo.password,
          createdAt: passwordInfo.createdAt,
          fileSize: stats.size,
        });
      }
    }
  }

  // Sort by creation date descending (newest first)
  return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
