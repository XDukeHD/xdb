/**
 * POST /api/xdb/system/backup - Create backup of all databases
 * Simplified, working implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

import { authenticate, createErrorResponse, createSuccessResponse, getElapsedSeconds, disableCORS } from '@/lib/middleware';
import { initializeXdb } from '@/lib/xdbInstance';
import {
  generateBackupId,
  generatePassword,
  collectDatabaseFiles,
  createBackupMetadata,
  getBackupDir,
  getBackupZipPath,
  storeBackupPassword,
} from '@/lib/backupManager';

const DATA_DIR = process.env.XDB_DATA_DIR || '/tmp/xdb';
const XDB_ENCRYPTION_KEY = process.env.XDB_ENCRYPTION_KEY || '';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authenticate
    const auth = authenticate(request);
    if (!auth.authenticated) {
      return auth.error!;
    }

    if (!XDB_ENCRYPTION_KEY || !AUTH_TOKEN) {
      return disableCORS(
        createErrorResponse('Server not properly configured', 500),
      );
    }

    // Initialize XDB
    await initializeXdb();

    // Ensure backup directory exists
    const backupDir = getBackupDir(DATA_DIR);
    if (!existsSync(backupDir)) {
      await mkdir(backupDir, { recursive: true });
    }

    // Collect all database files
    const dbFiles = await collectDatabaseFiles(DATA_DIR);

    // Generate backup ID and password
    const backupId = generateBackupId();
    const password = generatePassword();
    const now = new Date().toISOString();

    // Create metadata file (contains auth keys for restoration)
    const fileMetadata = dbFiles.map(f => ({
      name: f.name,
      hash: f.hash,
      size: f.data.length,
    }));

    await createBackupMetadata(DATA_DIR, backupId, AUTH_TOKEN, XDB_ENCRYPTION_KEY, fileMetadata);

    // Create ZIP file with all databases
    const zipPath = getBackupZipPath(DATA_DIR, backupId);
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Handle errors
    let archiveError: Error | null = null;
    output.on('error', (err: Error) => {
      archiveError = err;
    });
    archive.on('error', (err: Error) => {
      archiveError = err;
    });

    // Pipe to file
    archive.pipe(output);

    // Add all database files
    for (const file of dbFiles) {
      archive.append(file.data, { name: file.name });
    }

    // Add metadata file as manifest
    const manifestContent = JSON.stringify({
      backupId,
      createdAt: now,
      version: '1.0.0',
      files: fileMetadata,
      totalFiles: dbFiles.length,
      totalSize: dbFiles.reduce((sum, f) => sum + f.data.length, 0),
      authKey: AUTH_TOKEN,
      encryptionKey: XDB_ENCRYPTION_KEY,
    }, null, 2);

    archive.append(manifestContent, { name: 'BACKUP_MANIFEST.json' });

    // Finalize archive
    await archive.finalize();

    // Wait for stream to complete
    await new Promise<void>((resolve, reject) => {
      output.on('finish', () => resolve());
      output.on('error', reject);
      if (archiveError) reject(archiveError);
    });

    // Store password
    await storeBackupPassword(DATA_DIR, backupId, password);

    return disableCORS(
      createSuccessResponse(
        {
          backupId,
          downloadLink: `/api/xdb/system/backup/${backupId}?act=dw&pwd=${encodeURIComponent(password)}`,
          password,
          fileCount: dbFiles.length,
          totalSize: dbFiles.reduce((sum, f) => sum + f.data.length, 0),
          createdAt: now,
        },
        getElapsedSeconds(startTime),
        201,
      ),
    );
  } catch (error) {
    console.error('Backup error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 500),
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return disableCORS(new NextResponse(null, { status: 204 }));
}
