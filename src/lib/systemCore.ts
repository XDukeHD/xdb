/**
 * System database (system.xdbCore) management
 * Stores encrypted backup metadata, passwords, and restoration logs
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { SystemXdbCore, SystemBackupRecord } from './backupTypes';
import { getSystemXdbCorePath } from './backupUtils';

/**
 * Encrypt data using AES-256-GCM
 */
function encryptData(data: string, encryptionKey: string): { encrypted: string; iv: string; authTag: string } {
  const keyBuffer = Buffer.from(encryptionKey, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex characters)');
  }

  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
function decryptData(
  encrypted: string,
  iv: string,
  authTag: string,
  encryptionKey: string,
): string {
  const keyBuffer = Buffer.from(encryptionKey, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex characters)');
  }

  const decipher = createDecipheriv('aes-256-gcm', keyBuffer, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Initialize or load system database
 */
export async function initializeSystemCore(
  dataDir: string,
  encryptionKey: string,
  maxBackups: number = 5,
): Promise<SystemXdbCore> {
  const corePath = getSystemXdbCorePath(dataDir);

  if (!existsSync(corePath)) {
    // Create new system core
    const core: SystemXdbCore = {
      format: 'xdbCore_v1',
      backups: [],
      restorations: [],
      maxBackups,
      lastBackupId: undefined,
      lastRestorationId: undefined,
    };

    await saveSystemCore(dataDir, core, encryptionKey);
    return core;
  }

  // Load existing
  return loadSystemCore(dataDir, encryptionKey);
}

/**
 * Load system core from disk (decrypted)
 */
export async function loadSystemCore(dataDir: string, encryptionKey: string): Promise<SystemXdbCore> {
  const corePath = getSystemXdbCorePath(dataDir);

  if (!existsSync(corePath)) {
    throw new Error('System core not initialized');
  }

  const fileContent = await readFile(corePath, 'utf8');

  // Parse the encrypted wrapper format
  let wrapper: { format: string; version: string; encrypted: string; iv: string; authTag: string };
  try {
    wrapper = JSON.parse(fileContent);
  } catch {
    throw new Error('System core corrupted: invalid JSON wrapper');
  }

  if (wrapper.format !== 'xdbCore_encrypted_v1') {
    throw new Error('System core corrupted: invalid format');
  }

  // Decrypt the core data
  let decrypted: string;
  try {
    decrypted = decryptData(wrapper.encrypted, wrapper.iv, wrapper.authTag, encryptionKey);
  } catch (error) {
    throw new Error(`System core decryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Parse decrypted JSON
  let core: SystemXdbCore;
  try {
    core = JSON.parse(decrypted);
  } catch {
    throw new Error('System core corrupted: invalid core JSON');
  }

  if (core.format !== 'xdbCore_v1') {
    throw new Error('System core corrupted: invalid core format version');
  }

  return core;
}

/**
 * Save system core to disk (encrypted)
 */
export async function saveSystemCore(
  dataDir: string,
  core: SystemXdbCore,
  encryptionKey: string,
): Promise<void> {
  const corePath = getSystemXdbCorePath(dataDir);

  // Ensure directory exists
  const dir = corePath.substring(0, corePath.lastIndexOf('/'));
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  // Serialize core to JSON
  const coreJson = JSON.stringify(core);

  // Encrypt
  const { encrypted, iv, authTag } = encryptData(coreJson, encryptionKey);

  // Create wrapper
  const wrapper = {
    format: 'xdbCore_encrypted_v1',
    version: '1.0.0',
    encrypted,
    iv,
    authTag,
  };

  // Write to disk
  await writeFile(corePath, JSON.stringify(wrapper, null, 2), 'utf8');
}

/**
 * Add backup to system core
 */
export async function addBackupToCore(
  dataDir: string,
  encryptionKey: string,
  backup: SystemBackupRecord,
): Promise<void> {
  const core = await loadSystemCore(dataDir, encryptionKey);

  // Add new backup
  core.backups.push(backup);
  core.lastBackupId = backup.backupId;

  // Enforce max backups
  if (core.backups.length > core.maxBackups) {
    const removed = core.backups.shift();
    if (removed) {
      console.log(`Removed old backup: ${removed.backupId}`);
    }
  }

  await saveSystemCore(dataDir, core, encryptionKey);
}

/**
 * Get backup record
 */
export async function getBackupRecord(
  dataDir: string,
  encryptionKey: string,
  backupId: string,
): Promise<SystemBackupRecord | undefined> {
  const core = await loadSystemCore(dataDir, encryptionKey);
  return core.backups.find(b => b.backupId === backupId);
}

/**
 * List all backups
 */
export async function listBackups(
  dataDir: string,
  encryptionKey: string,
): Promise<SystemBackupRecord[]> {
  const core = await loadSystemCore(dataDir, encryptionKey);
  return core.backups;
}

/**
 * Record restoration event
 */
export async function recordRestoration(
  dataDir: string,
  encryptionKey: string,
  backupId: string,
  status: 'success' | 'partial' | 'failed',
  failureLog?: string,
): Promise<void> {
  const core = await loadSystemCore(dataDir, encryptionKey);

  const restorationId = `restoration_${Date.now()}_${randomBytes(4).toString('hex')}`;

  core.restorations.push({
    backupId,
    restoredAt: new Date().toISOString(),
    status,
    failureLog,
  });

  core.lastRestorationId = restorationId;

  await saveSystemCore(dataDir, core, encryptionKey);
}

/**
 * Export raw system core file (for manual migration)
 */
export async function exportSystemCore(dataDir: string): Promise<Buffer> {
  const corePath = getSystemXdbCorePath(dataDir);

  if (!existsSync(corePath)) {
    throw new Error('System core not found');
  }

  return readFile(corePath);
}
