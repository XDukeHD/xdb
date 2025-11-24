/**
 * GET /api/xdb/system/backup/[backupId] - Download backup ZIP
 * Query parameters: act=dw for download, pwd=PASSWORD for authentication
 * Password-based access (no bearer token required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

import { createErrorResponse, disableCORS } from '@/lib/middleware';
import { getBackupPassword } from '@/lib/backupManager';

const DATA_DIR = process.env.XDB_DATA_DIR || '/tmp/xdb';

// Helper to get backup ZIP path
function getBackupZipPath(backupId: string): string {
  return join(DATA_DIR, '.backups', `${backupId}.zip`);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ backupId?: string }> },
): Promise<NextResponse> {
  try {
    const params = await context.params;
    const backupId = params.backupId;
    const action = request.nextUrl.searchParams.get('act');
    const passwordParam = request.nextUrl.searchParams.get('pwd');

    if (!backupId) {
      return disableCORS(createErrorResponse('Backup ID is required', 400));
    }

    if (action !== 'dw') {
      return disableCORS(createErrorResponse('Invalid action. Use ?act=dw for download', 400));
    }

    // Validate password
    if (!passwordParam) {
      return disableCORS(createErrorResponse('Password is required. Use ?pwd=PASSWORD', 401));
    }

    // Get the actual password for this backup
    const actualPassword = await getBackupPassword(DATA_DIR, backupId);

    if (!actualPassword) {
      return disableCORS(createErrorResponse('Backup not found', 404));
    }

    // Compare passwords (constant-time comparison for security)
    const passwordMatch = passwordParam === actualPassword;
    if (!passwordMatch) {
      return disableCORS(createErrorResponse('Invalid password', 401));
    }

    const backupPath = getBackupZipPath(backupId);

    if (!existsSync(backupPath)) {
      return disableCORS(createErrorResponse('Backup file not found', 404));
    }

    // Read backup file
    const backupData = await readFile(backupPath);

    // Return as file download
    const response = new NextResponse(backupData, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${backupId}.zip"`,
        'Content-Length': backupData.length.toString(),
      },
    });

    return disableCORS(response);
  } catch (error) {
    console.error('Backup download error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 500),
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return disableCORS(new NextResponse(null, { status: 204 }));
}
