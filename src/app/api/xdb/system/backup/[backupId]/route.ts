/**
 * GET /api/xdb/system/backup/[backupId] - Download backup ZIP
 * Query parameter: act=dw for download
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

import { authenticate, createErrorResponse, disableCORS } from '@/lib/middleware';

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
    // Authenticate
    const auth = authenticate(request);
    if (!auth.authenticated) {
      return auth.error!;
    }

    const params = await context.params;
    const backupId = params.backupId;
    const action = request.nextUrl.searchParams.get('act');

    if (!backupId) {
      return disableCORS(createErrorResponse('Backup ID is required', 400));
    }

    if (action !== 'dw') {
      return disableCORS(createErrorResponse('Invalid action. Use ?act=dw for download', 400));
    }

    const backupPath = getBackupZipPath(backupId);

    if (!existsSync(backupPath)) {
      return disableCORS(createErrorResponse('Backup not found', 404));
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
