/**
 * API routes for database list and creation
 * GET /api/xdb/databases - List all databases
 * PUT /api/xdb/databases - Create a new database (with name in body)
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
    console.error('GET /api/xdb/databases error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 500),
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
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

    // Get request body
    let body = '';
    if (request.body) {
      const reader = request.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          body += new TextDecoder().decode(value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    const data = JSON.parse(body || '{}') as { name?: string };
    const dbName = data.name || '';

    if (!dbName) {
      return disableCORS(
        createErrorResponse('Database name is required', 400),
      );
    }

    // Check if database already exists
    const existsOnDisk = await persistence.databaseExistsOnDisk(dbName);
    if (existsOnDisk || engine.databaseExists(dbName)) {
      return disableCORS(
        createErrorResponse(`Database '${dbName}' already exists`, 409),
      );
    }

    // Create database
    engine.createDatabase(dbName);
    await persistence.saveDatabase(dbName);

    const response = createSuccessResponse(
      { message: `Database '${dbName}' created`, database: dbName },
      getElapsedSeconds(startTime),
      201,
    );
    return disableCORS(response);
  } catch (error) {
    console.error('PUT /api/xdb/databases error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 400),
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return disableCORS(new NextResponse(null, { status: 204 }));
}
