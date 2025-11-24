/**
 * GET /api/xdb/system/export-core - Export backup metadata index
 * Query parameter: act=dw for download
 * Returns a JSON file with list of all backups for reference
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

import { authenticate, createErrorResponse, disableCORS } from '@/lib/middleware';

const DATA_DIR = process.env.XDB_DATA_DIR || '/tmp/xdb';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate
    const auth = authenticate(request);
    if (!auth.authenticated) {
      return auth.error!;
    }

    const action = request.nextUrl.searchParams.get('act');

    if (action !== 'dw') {
      return disableCORS(createErrorResponse('Invalid action. Use ?act=dw for download', 400));
    }

    // List all backups and their metadata
    const backupsDir = join(DATA_DIR, '.backups');
    const backupIndex: Array<{
      backupId: string;
      createdAt?: string;
      fileCount?: number;
      totalSize?: number;
    }> = [];

    if (existsSync(backupsDir)) {
      const files = readdirSync(backupsDir);
      for (const file of files) {
        // Only process .zip files
        if (file.endsWith('.zip')) {
          const backupId = file.replace('.zip', '');
          const metadata: {
            backupId: string;
            createdAt?: string;
            fileCount?: number;
            totalSize?: number;
          } = { backupId };

          // Try to extract metadata from backup ID (format: timestamp_randomString)
          try {
            const timestamp = parseInt(backupId.split('_')[0], 10);
            if (!isNaN(timestamp)) {
              metadata.createdAt = new Date(timestamp).toISOString();
            }
          } catch {
            // Ignore parse errors
          }

          backupIndex.push(metadata);
        }
      }
    }

    // Create JSON response data
    const indexData = {
      exportedAt: new Date().toISOString(),
      backupCount: backupIndex.length,
      backups: backupIndex.sort((a, b) => {
        // Sort by backup ID in descending order (most recent first)
        return (b.backupId || '').localeCompare(a.backupId || '');
      }),
    };

    const jsonBuffer = Buffer.from(JSON.stringify(indexData, null, 2), 'utf-8');

    // Return as file download
    const response = new NextResponse(jsonBuffer as BufferSource, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="backup-index.json"',
        'Content-Length': jsonBuffer.length.toString(),
      },
    });

    return disableCORS(response);
  } catch (error) {
    console.error('Backup index export error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 500),
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return disableCORS(new NextResponse(null, { status: 204 }));
}
