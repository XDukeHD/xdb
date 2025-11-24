/**
 * Global XDB instance manager for API routes
 */

import { XdbEngine } from './XdbEngine';
import { XdbPersistence } from './XdbPersistence';
import { tmpdir } from 'os';
import { join } from 'path';

let xdbEngine: XdbEngine | null = null;
let xdbPersistence: XdbPersistence | null = null;

/**
 * Initialize the global XDB instance
 */
export async function initializeXdb(): Promise<void> {
  if (xdbEngine) {
    return;
  }

  const maxDbSize =
    parseInt(process.env.MAX_DATABASE_SIZE || '104857600', 10); // Default 100MB
  const encryptionKey = process.env.XDB_ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('XDB_ENCRYPTION_KEY environment variable is not set');
  }

  xdbEngine = new XdbEngine(maxDbSize);

  const dataDir = process.env.XDB_DATA_DIR || join(tmpdir(), 'xdb');
  xdbPersistence = new XdbPersistence(xdbEngine, dataDir, encryptionKey, maxDbSize);

  await xdbPersistence.initialize();
}

/**
 * Get the global XDB engine instance
 */
export function getXdbEngine(): XdbEngine {
  if (!xdbEngine) {
    throw new Error('XDB engine not initialized');
  }
  return xdbEngine;
}

/**
 * Get the global XDB persistence instance
 */
export function getXdbPersistence(): XdbPersistence {
  if (!xdbPersistence) {
    throw new Error('XDB persistence not initialized');
  }
  return xdbPersistence;
}
