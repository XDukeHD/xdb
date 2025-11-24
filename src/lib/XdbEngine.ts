/**
 * XdbEngine - Main database engine managing databases, tables, and queries
 */

import { Database, Table, Row, QueryResult, parseQueryType, extractTableNameFromDrop, parseCreateTableStatement } from './types';
import { XdbQueryRunner } from './XdbQueryRunner';

export class XdbEngine {
  private databases: Map<string, Database>;
  private maxDatabaseSize: number; // in bytes

  constructor(maxDatabaseSize: number = 100 * 1024 * 1024) {
    // Default 100MB
    this.databases = new Map();
    this.maxDatabaseSize = maxDatabaseSize;
  }

  /**
   * Load databases from serialized data
   */
  loadFromJson(json: string): void {
    try {
      const data = JSON.parse(json);

      if (data && typeof data === 'object') {
        for (const [dbName, dbData] of Object.entries(data)) {
          if (typeof dbData === 'object' && dbData !== null) {
            const db = dbData as Database;
            this.databases.set(dbName, db);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to load database: ${error}`);
    }
  }

  /**
   * Export databases to JSON
   */
  exportToJson(): string {
    const data: { [key: string]: Database } = {};

    for (const [name, db] of this.databases) {
      data[name] = db;
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Get serialized size
   */
  getSerializedSize(): number {
    return Buffer.byteLength(this.exportToJson(), 'utf-8');
  }

  /**
   * Check if adding content would exceed size limit
   */
  wouldExceedLimit(additionalSize: number): boolean {
    return this.getSerializedSize() + additionalSize > this.maxDatabaseSize;
  }

  /**
   * List all databases
   */
  listDatabases(): string[] {
    return Array.from(this.databases.keys());
  }

  /**
   * Check if database exists
   */
  databaseExists(name: string): boolean {
    return this.databases.has(name);
  }

  /**
   * Create a new database
   */
  createDatabase(name: string): void {
    if (this.databases.has(name)) {
      throw new Error(`Database '${name}' already exists`);
    }

    const database: Database = {
      name,
      tables: {},
      metadata: {
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    };

    this.databases.set(name, database);
  }

  /**
   * Delete a database
   */
  deleteDatabase(name: string): void {
    if (!this.databases.has(name)) {
      throw new Error(`Database '${name}' does not exist`);
    }

    this.databases.delete(name);
  }

  /**
   * Get database
   */
  getDatabase(name: string): Database {
    const db = this.databases.get(name);
    if (!db) {
      throw new Error(`Database '${name}' does not exist`);
    }
    return db;
  }

  /**
   * Create a table from CREATE TABLE SQL
   */
  createTable(databaseName: string, sql: string): void {
    const db = this.getDatabase(databaseName);

    const { tableName, columns, primaryKey } = parseCreateTableStatement(sql);

    if (db.tables[tableName]) {
      throw new Error(`Table '${tableName}' already exists`);
    }

    const table: Table = {
      name: tableName,
      columns,
      indexes: [],
      primaryKey,
      data: [],
    };

    db.tables[tableName] = table;
    db.metadata.lastModified = new Date().toISOString();
  }

  /**
   * Drop a table
   */
  dropTable(databaseName: string, tableName: string): void {
    const db = this.getDatabase(databaseName);

    if (!db.tables[tableName]) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    delete db.tables[tableName];
    db.metadata.lastModified = new Date().toISOString();
  }

  /**
   * List tables in a database
   */
  listTables(databaseName: string): string[] {
    const db = this.getDatabase(databaseName);
    return Object.keys(db.tables);
  }

  /**
   * Get table schema
   */
  getTableSchema(databaseName: string, tableName: string): Table {
    const db = this.getDatabase(databaseName);
    const table = db.tables[tableName];

    if (!table) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    return table;
  }

  /**
   * Execute a query on a database
   */
  executeQuery(databaseName: string, sql: string): QueryResult {
    const db = this.getDatabase(databaseName);
    const queryType = parseQueryType(sql);

    if (queryType.type === 'SELECT') {
      return this.executeSelect(db, sql);
    } else if (queryType.type === 'INSERT') {
      return this.executeInsert(db, sql);
    } else if (queryType.type === 'UPDATE') {
      return this.executeUpdate(db, sql);
    } else if (queryType.type === 'DELETE') {
      return this.executeDelete(db, sql);
    } else if (queryType.type === 'CREATE') {
      this.createTable(databaseName, sql);
      return { rowsAffected: 0 };
    } else if (queryType.type === 'DROP') {
      const tableName = extractTableNameFromDrop(sql);
      this.dropTable(databaseName, tableName);
      return { rowsAffected: 0 };
    } else {
      throw new Error(`Query type '${queryType.type}' is not yet supported`);
    }
  }

  /**
   * Execute SELECT query
   */
  private executeSelect(db: Database, sql: string): QueryResult {
    const runner = new XdbQueryRunner(db);
    return runner.executeSelect(sql);
  }

  /**
   * Execute INSERT query
   */
  private executeInsert(db: Database, sql: string): QueryResult {
    const runner = new XdbQueryRunner(db);
    return runner.executeInsert(sql);
  }

  /**
   * Execute UPDATE query
   */
  private executeUpdate(db: Database, sql: string): QueryResult {
    const runner = new XdbQueryRunner(db);
    return runner.executeUpdate(sql);
  }

  /**
   * Execute DELETE query
   */
  private executeDelete(db: Database, sql: string): QueryResult {
    const runner = new XdbQueryRunner(db);
    return runner.executeDelete(sql);
  }

  /**
   * Add an index to a table
   */
  addIndex(
    databaseName: string,
    tableName: string,
    indexName: string,
    columns: string[],
    unique = false,
  ): void {
    const db = this.getDatabase(databaseName);
    const table = db.tables[tableName];

    if (!table) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    table.indexes.push({
      name: indexName,
      tableName,
      columns,
      unique,
    });

    db.metadata.lastModified = new Date().toISOString();
  }

  /**
   * Get table data (internal use)
   */
  getTableData(databaseName: string, tableName: string): Row[] {
    const db = this.getDatabase(databaseName);
    const table = db.tables[tableName];

    if (!table) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    return table.data || [];
  }

  /**
   * Import database from JSON
   */
  importDatabase(name: string, data: string): void {
    try {
      const parsed = JSON.parse(data) as Database;
      this.databases.set(name, parsed);
    } catch (error) {
      throw new Error(`Failed to import database: ${error}`);
    }
  }
}
