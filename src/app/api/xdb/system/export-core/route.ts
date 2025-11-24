/**
 * GET /api/xdb/system/export-core - Export encrypted system.xdbCore file
 * Query parameter: act=dw for download
 * Returns the raw encrypted system database for manual migration
 */

import { NextRequest, NextResponse } from 'next/server';

import { authenticate, createErrorResponse, disableCORS } from '@/lib/middleware';
import { exportSystemCore } from '@/lib/systemCore';

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

    // Export system core
    let data: Buffer;
    try {
      data = await exportSystemCore(process.env.XDB_DATA_DIR || '/tmp/xdb');
    } catch (error) {
      return disableCORS(
        createErrorResponse(
          error instanceof Error ? error.message : 'System core not found',
          404,
        ),
      );
    }

    // Return as file download
    const response = new NextResponse(data as BufferSource, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="system.xdbCore"',
        'Content-Length': data.length.toString(),
      },
    });

    return disableCORS(response);
  } catch (error) {
    console.error('System core export error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 500),
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return disableCORS(new NextResponse(null, { status: 204 }));
}
