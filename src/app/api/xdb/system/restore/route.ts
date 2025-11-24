/**
 * PUT /api/xdb/system/restore - Restore databases from backup ZIP
 * Simplified, working implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import extractZip from 'extract-zip';

import { authenticate, createErrorResponse, createSuccessResponse, getElapsedSeconds, disableCORS } from '@/lib/middleware';
import { initializeXdb } from '@/lib/xdbInstance';
import { hashData } from '@/lib/backupManager';

const DATA_DIR = process.env.XDB_DATA_DIR || '/tmp/xdb';

interface ManifestFile {
  name: string;
  hash: string;
  size: number;
}

interface BackupManifest {
  backupId: string;
  createdAt: string;
  version: string;
  files: ManifestFile[];
  totalFiles: number;
  totalSize: number;
  authKey: string;
  encryptionKey: string;
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  let tempDir = '';

  try {
    // Authenticate
    const auth = authenticate(request);
    if (!auth.authenticated) {
      return auth.error!;
    }

    // Initialize XDB
    await initializeXdb();

    // Parse form data
    const formData = await request.formData();
    const backupFile = formData.get('backup') as File | null;

    if (!backupFile) {
      return disableCORS(createErrorResponse('Backup file is required', 400));
    }

    // Create temp directory for extraction
    tempDir = join(DATA_DIR, `.restore_${Date.now()}`);
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Write ZIP file to temp location
    const zipBuffer = Buffer.from(await backupFile.arrayBuffer());
    const zipPath = join(tempDir, 'backup.zip');
    await writeFile(zipPath, zipBuffer);

    // Extract ZIP
    const extractDir = join(tempDir, 'extracted');
    if (!existsSync(extractDir)) {
      await mkdir(extractDir, { recursive: true });
    }

    try {
      await extractZip(zipPath, { dir: extractDir });
    } catch (error) {
      return disableCORS(
        createErrorResponse(
          `Failed to extract ZIP: ${error instanceof Error ? error.message : String(error)}`,
          400,
        ),
      );
    }

    // Read manifest
    const manifestPath = join(extractDir, 'BACKUP_MANIFEST.json');
    if (!existsSync(manifestPath)) {
      return disableCORS(
        createErrorResponse('Backup manifest not found in ZIP', 400),
      );
    }

    let manifest: BackupManifest;
    try {
      const manifestContent = await readFile(manifestPath, 'utf8');
      manifest = JSON.parse(manifestContent);
    } catch (error) {
      return disableCORS(
        createErrorResponse(
          `Invalid backup manifest: ${error instanceof Error ? error.message : String(error)}`,
          400,
        ),
      );
    }

    // Collect files from extracted directory
    const filesToRestore: Array<{ name: string; data: Buffer; hash: string }> = [];
    const errors: Array<{ file: string; reason: string }> = [];

    for (const fileInfo of manifest.files) {
      const filePath = join(extractDir, fileInfo.name);

      if (!existsSync(filePath)) {
        errors.push({
          file: fileInfo.name,
          reason: 'File not found in archive',
        });
        continue;
      }

      try {
        const data = await readFile(filePath);
        const hash = hashData(data);

        // Verify hash
        if (hash !== fileInfo.hash) {
          errors.push({
            file: fileInfo.name,
            reason: `Checksum mismatch (expected ${fileInfo.hash}, got ${hash})`,
          });
          continue;
        }

        filesToRestore.push({
          name: fileInfo.name,
          data,
          hash,
        });
      } catch (error) {
        errors.push({
          file: fileInfo.name,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Restore files to DATA_DIR
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }

    let restoredCount = 0;
    const restoreErrors: Array<{ file: string; reason: string }> = [];

    for (const file of filesToRestore) {
      try {
        const destPath = join(DATA_DIR, file.name);
        await writeFile(destPath, file.data);
        restoredCount++;
      } catch (error) {
        restoreErrors.push({
          file: file.name,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Combine all errors
    const allErrors = [...errors, ...restoreErrors];
    const status = allErrors.length === 0 ? 'success' : restoredCount > 0 ? 'partial' : 'failed';

    // Clean up temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }

    return disableCORS(
      createSuccessResponse(
        {
          status,
          message:
            status === 'success'
              ? 'All databases restored successfully'
              : status === 'partial'
                ? `${restoredCount}/${manifest.totalFiles} databases restored`
                : 'Restoration failed',
          restoredCount,
          failedCount: allErrors.length,
          totalCount: manifest.totalFiles,
          failures: allErrors,
          timestamp: new Date().toISOString(),
        },
        getElapsedSeconds(startTime),
        status === 'success' ? 200 : status === 'partial' ? 207 : 400,
      ),
    );
  } catch (error) {
    // Clean up on error
    if (tempDir && existsSync(tempDir)) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }

    console.error('Restoration error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 500),
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return disableCORS(new NextResponse(null, { status: 204 }));
}
