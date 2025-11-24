/**
 * API routes for table operations
 * GET /api/xdb/databases/[dbName]/[tableName] - Execute SELECT query
 * PUT /api/xdb/databases/[dbName]/[tableName] - Create table
 * POST /api/xdb/databases/[dbName]/[tableName] - Execute modifying query (INSERT, UPDATE, DELETE)
 * DELETE /api/xdb/databases/[dbName]/[tableName] - Drop table
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, createErrorResponse, createSuccessResponse, getElapsedSeconds, disableCORS } from '@/lib/middleware';
import { initializeXdb, getXdbEngine, getXdbPersistence } from '@/lib/xdbInstance';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ dbName?: string; tableName?: string }> },
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
    const tableName = params.tableName;

    if (!dbName) {
      return disableCORS(
        createErrorResponse('Database name is required', 400),
      );
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

    if (!tableName) {
      // List tables
      const tables = engine.listTables(dbName);
      const response = createSuccessResponse(
        { tables },
        getElapsedSeconds(startTime),
      );
      return disableCORS(response);
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
      // Return table schema
      const schema = engine.getTableSchema(dbName, tableName);
      const response = createSuccessResponse(
        { schema },
        getElapsedSeconds(startTime),
      );
      return disableCORS(response);
    }

    // Execute SELECT query
    const result = engine.executeQuery(dbName, query);

    const response = createSuccessResponse(
      result.rows || [],
      getElapsedSeconds(startTime),
    );
    return disableCORS(response);
  } catch (error) {
    console.error('GET table error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 400),
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ dbName?: string; tableName?: string }> },
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
    const tableName = params.tableName;

    if (!dbName || !tableName) {
      return disableCORS(
        createErrorResponse('Database and table names are required', 400),
      );
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

    // Get request body (CREATE TABLE SQL)
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
      return disableCORS(
        createErrorResponse('CREATE TABLE SQL is required in request body', 400),
      );
    }

    // Create table
    engine.createTable(dbName, query);
    await persistence.saveDatabase(dbName);

    const response = createSuccessResponse(
      { message: `Table '${tableName}' created in database '${dbName}'` },
      getElapsedSeconds(startTime),
      201,
    );
    return disableCORS(response);
  } catch (error) {
    console.error('PUT table error:', error);

    const errorMsg = error instanceof Error ? error.message : String(error);

    // Check for "already exists" error
    if (errorMsg.includes('already exists')) {
      return disableCORS(
        createErrorResponse(errorMsg, 409),
      );
    }

    return disableCORS(
      createErrorResponse(errorMsg, 400),
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ dbName?: string; tableName?: string }> },
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

    const query = body.trim();

    if (!query) {
      return disableCORS(
        createErrorResponse('SQL query is required in request body', 400),
      );
    }

    // Execute modifying query
    const result = engine.executeQuery(dbName, query);

    // Save database after modification
    await persistence.saveDatabase(dbName);

    const response = createSuccessResponse(
      {
        rowsAffected: result.rowsAffected || 0,
        insertId: result.insertId,
      },
      getElapsedSeconds(startTime),
    );
    return disableCORS(response);
  } catch (error) {
    console.error('POST table error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 400),
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ dbName?: string; tableName?: string }> },
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
    const tableName = params.tableName;

    if (!dbName || !tableName) {
      return disableCORS(
        createErrorResponse('Database and table names are required', 400),
      );
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

    // Drop table
    engine.dropTable(dbName, tableName);
    await persistence.saveDatabase(dbName);

    const response = createSuccessResponse(
      { message: `Table '${tableName}' dropped from database '${dbName}'` },
      getElapsedSeconds(startTime),
    );
    return disableCORS(response);
  } catch (error) {
    console.error('DELETE table error:', error);
    return disableCORS(
      createErrorResponse(error instanceof Error ? error.message : String(error), 400),
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return disableCORS(new NextResponse(null, { status: 204 }));
}
