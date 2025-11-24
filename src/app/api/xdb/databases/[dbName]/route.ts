/**
 * API routes for database management
 * GET /api/xdb/databases - List databases
 * PUT /api/xdb/databases/ - Create database
 * GET /api/xdb/databases/[dbName] - List tables or execute SELECT
 * PUT /api/xdb/databases/[dbName] - Create database (alias for /databases/)
 * POST /api/xdb/databases/[dbName] - Execute modifying query
 * DELETE /api/xdb/databases/[dbName] - Delete database
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, createErrorResponse, createSuccessResponse, getElapsedSeconds, disableCORS } from '@/lib/middleware';
import { initializeXdb, getXdbEngine, getXdbPersistence } from '@/lib/xdbInstance';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ dbName?: string }> },
): Promise<NextResponse> {
  const params = await context.params;
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

    const dbName = params.dbName;

    if (!dbName) {
      // List all databases
      const dbNames = await persistence.listDatabasesOnDisk();
      for (const name of dbNames) {
        if (!engine.databaseExists(name)) {
          await persistence.loadDatabase(name);
        }
      }
      const databases = engine.listDatabases();

      const response = createSuccessResponse(
        { databases },
        getElapsedSeconds(startTime),
      );
      return disableCORS(response);
    }

    // Load database if needed
    if (!engine.databaseExists(dbName)) {
      const exists = await persistence.databaseExistsOnDisk(dbName);
      if (!exists) {
        return disableCORS(
          createErrorResponse(`Database '${dbName}' does not exist`, 404),
        );
      }
      await persistence.loadDatabase(dbName);
    }

    // Get request body for SELECT query
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

    const query = body.trim();

    if (!query) {
      // List tables
      const tables = engine.listTables(dbName);
      const response = createSuccessResponse(
        { tables },
        getElapsedSeconds(startTime),
      );
      return disableCORS(response);
    }

    // Execute SELECT query
    return await handleQueryExecution(dbName, query, startTime);
  } catch (error) {
    console.error('GET database error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 400),
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ dbName?: string }> },
): Promise<NextResponse> {
  const params = await context.params;
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

    const dbName = params.dbName;

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

    // Get request body (optional - may be table creation)
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

    const query = body.trim();

    if (query.toUpperCase().startsWith('CREATE TABLE')) {
      // Create table in the database
      // First create the database if it doesn't exist
      if (!engine.databaseExists(dbName)) {
        engine.createDatabase(dbName);
      }

      engine.createTable(dbName, query);
      await persistence.saveDatabase(dbName);

      const response = createSuccessResponse(
        { message: `Table created in database '${dbName}'` },
        getElapsedSeconds(startTime),
        201,
      );
      return disableCORS(response);
    }

    // Create database
    engine.createDatabase(dbName);
    await persistence.saveDatabase(dbName);

    const response = createSuccessResponse(
      { message: `Database '${dbName}' created` },
      getElapsedSeconds(startTime),
      201,
    );
    return disableCORS(response);
  } catch (error) {
    console.error('PUT database error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 400),
    );
  }
}

async function handleQueryExecution(
  dbName: string,
  query: string,
  startTime: number,
): Promise<NextResponse> {
  const engine = getXdbEngine();
  const persistence = getXdbPersistence();

  // Load database if needed
  if (!engine.databaseExists(dbName)) {
    const exists = await persistence.databaseExistsOnDisk(dbName);
    if (!exists) {
      return disableCORS(
        createErrorResponse(`Database '${dbName}' does not exist`, 404),
      );
    }
    await persistence.loadDatabase(dbName);
  }

  // Execute query
  const result = engine.executeQuery(dbName, query);

  // Determine if this is a SELECT query
  const isSelect = query.trim().toUpperCase().startsWith('SELECT');

  // Save database after modification (only for non-SELECT queries)
  if (!isSelect) {
    await persistence.saveDatabase(dbName);
  }

  // Build response based on query type
  interface ResponseData {
    rows?: Record<string, unknown>[];
    rowsAffected?: number;
    insertId?: number;
  }

  let responseData: ResponseData = {};
  if (isSelect) {
    // For SELECT queries, return rows
    responseData = {
      rows: result.rows || [],
      rowsAffected: result.rows?.length || 0,
    };
  } else {
    // For INSERT/UPDATE/DELETE, return affected rows and insert ID
    responseData = {
      rowsAffected: result.rowsAffected || 0,
      insertId: result.insertId,
    };
  }

  const response = createSuccessResponse(
    responseData,
    getElapsedSeconds(startTime),
  );
  return disableCORS(response);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ dbName?: string }> },
): Promise<NextResponse> {
  const params = await context.params;
  const startTime = Date.now();

  try {
    // Authenticate
    const auth = authenticate(request);
    if (!auth.authenticated) {
      return auth.error!;
    }

    // Initialize XDB
    await initializeXdb();

    const dbName = params.dbName;

    if (!dbName) {
      return disableCORS(
        createErrorResponse('Database name is required', 400),
      );
    }

    // Get request body (SQL query)
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

    let query = '';
    try {
      // Try to parse as JSON (new API format)
      const jsonBody = JSON.parse(body);
      query = jsonBody.query || '';
    } catch {
      // Fall back to raw query string (legacy format)
      query = body.trim();
    }

    if (!query) {
      return disableCORS(
        createErrorResponse('SQL query is required in request body', 400),
      );
    }

    return await handleQueryExecution(dbName, query, startTime);
  } catch (error) {
    console.error('POST database error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 400),
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ dbName?: string }> },
): Promise<NextResponse> {
  const params = await context.params;
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

    const dbName = params.dbName;

    if (!dbName) {
      return disableCORS(
        createErrorResponse('Database name is required', 400),
      );
    }

    // Check if database exists
    if (!engine.databaseExists(dbName)) {
      const exists = await persistence.databaseExistsOnDisk(dbName);
      if (!exists) {
        return disableCORS(
          createErrorResponse(`Database '${dbName}' does not exist`, 404),
        );
      }
      await persistence.loadDatabase(dbName);
    }

    // Delete database
    engine.deleteDatabase(dbName);
    await persistence.deleteDatabase(dbName);

    const response = createSuccessResponse(
      { message: `Database '${dbName}' deleted` },
      getElapsedSeconds(startTime),
    );
    return disableCORS(response);
  } catch (error) {
    console.error('DELETE database error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 400),
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return disableCORS(new NextResponse(null, { status: 204 }));
}
