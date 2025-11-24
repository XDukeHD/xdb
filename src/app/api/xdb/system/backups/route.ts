/**
 * GET /api/xdb/system/backups - List all backups with download links
 * No authentication required (passwords are used instead)
 */

import { NextResponse } from 'next/server';
import { createSuccessResponse, getElapsedSeconds, disableCORS, createErrorResponse } from '@/lib/middleware';
import { listBackupsWithPasswords } from '@/lib/backupManager';

const DATA_DIR = process.env.XDB_DATA_DIR || '/tmp/xdb';

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const backups = await listBackupsWithPasswords(DATA_DIR);

    // Transform backups to include download links with passwords
    const backupsWithLinks = backups.map(backup => ({
      backupId: backup.backupId,
      password: backup.password,
      createdAt: backup.createdAt,
      fileSize: backup.fileSize,
      downloadLink: `/api/xdb/system/backup/${backup.backupId}?act=dw&pwd=${encodeURIComponent(backup.password)}`,
    }));

    return disableCORS(
      createSuccessResponse(
        {
          backups: backupsWithLinks,
          count: backupsWithLinks.length,
        },
        getElapsedSeconds(startTime),
        200,
      ),
    );
  } catch (error) {
    console.error('Backup listing error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 500),
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return disableCORS(new NextResponse(null, { status: 204 }));
}
