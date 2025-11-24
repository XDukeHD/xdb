/**
 * GET /api/xdb - Main entry point for database operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, createErrorResponse, createSuccessResponse, getElapsedSeconds, disableCORS } from '@/lib/middleware';
import { initializeXdb, getXdbEngine, getXdbPersistence } from '@/lib/xdbInstance';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authenticate
    const auth = authenticate(request);
    if (!auth.authenticated) {
      return auth.error!;
    }

    // Initialize XDB
    await initializeXdb();
    const engine = getXdbEngine();
    const persistence = getXdbPersistence();

    // Load all databases from disk
    const dbNames = await persistence.listDatabasesOnDisk();
    for (const name of dbNames) {
      if (!engine.databaseExists(name)) {
        await persistence.loadDatabase(name);
      }
    }

    // List databases
    const databases = engine.listDatabases();

    const response = createSuccessResponse(
      { databases },
      getElapsedSeconds(startTime),
    );

    return disableCORS(response);
  } catch (error) {
    console.error('GET /api/xdb error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 500),
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return disableCORS(new NextResponse(null, { status: 204 }));
}
