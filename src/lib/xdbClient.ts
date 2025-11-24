/**
 * Client-side xDB API wrapper
 * All functions accept a token parameter and attach it as Bearer authentication
 */

const API_BASE = '/api/xdb';

interface ApiResponse<T = unknown> {
  status: 'ok' | 'error';
  data?: T;
  error?: string;
  elapsed_seconds?: number;
}

interface QueryResult {
  rows?: Array<Record<string, unknown>>;
  rowsAffected?: number;
  insertId?: number;
}

interface DatabaseInfo {
  name: string;
  tables: string[];
  size?: number;
  created?: string;
}

interface TableInfo {
  name: string;
  columns: ColumnDefinition[];
  rowCount: number;
}

interface ColumnDefinition {
  name: string;
  type: string;
  primaryKey?: boolean;
  notNull?: boolean;
  defaultValue?: string | number | boolean | null;
}

async function apiCall<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (data.status !== 'ok') {
    throw new Error(data.error || 'API request failed');
  }

  return data.data as T;
}

export const xdbClient = {
  // Database operations
  async listDatabases(token: string): Promise<{ databases: string[] | DatabaseInfo[] }> {
    return apiCall('/databases', token);
  },

  async createDatabase(token: string, dbName: string): Promise<{ message: string }> {
    return apiCall(`/databases/${dbName}`, token, { method: 'PUT' });
  },

  async deleteDatabase(token: string, dbName: string): Promise<{ message: string }> {
    return apiCall(`/databases/${dbName}`, token, { method: 'DELETE' });
  },

  async getDatabaseInfo(token: string, dbName: string): Promise<{ tables: string[] }> {
    return apiCall(`/databases/${dbName}`, token);
  },

  // Table operations
  async createTable(token: string, dbName: string, sql: string): Promise<{ message: string }> {
    return apiCall(`/databases/${dbName}`, token, {
      method: 'PUT',
      body: sql,
    });
  },

  async dropTable(token: string, dbName: string, tableName: string): Promise<QueryResult> {
    return apiCall(`/databases/${dbName}`, token, {
      method: 'POST',
      body: `DROP TABLE ${tableName}`,
    });
  },

  // Query operations
  async executeQuery(token: string, dbName: string, query: string): Promise<QueryResult> {
    // All queries (SELECT, INSERT, UPDATE, DELETE, etc.) use POST with JSON body
    return apiCall(`/databases/${dbName}`, token, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },

  async selectAll(token: string, dbName: string, tableName: string): Promise<QueryResult> {
    return this.executeQuery(token, dbName, `SELECT * FROM ${tableName}`);
  },

  async insertRow(
    token: string,
    dbName: string,
    tableName: string,
    data: Record<string, unknown>
  ): Promise<QueryResult> {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data)
      .map(v => {
        if (v === null) return 'NULL';
        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
        return String(v);
      })
      .join(', ');
    return this.executeQuery(token, dbName, `INSERT INTO ${tableName} (${columns}) VALUES (${values})`);
  },

  async updateRow(
    token: string,
    dbName: string,
    tableName: string,
    data: Record<string, unknown>,
    where: string
  ): Promise<QueryResult> {
    const sets = Object.entries(data)
      .map(([key, value]) => {
        if (value === null) return `${key} = NULL`;
        if (typeof value === 'string') return `${key} = '${value.replace(/'/g, "''")}'`;
        return `${key} = ${value}`;
      })
      .join(', ');
    return this.executeQuery(token, dbName, `UPDATE ${tableName} SET ${sets} WHERE ${where}`);
  },

  async deleteRow(
    token: string,
    dbName: string,
    tableName: string,
    where: string
  ): Promise<QueryResult> {
    return this.executeQuery(token, dbName, `DELETE FROM ${tableName} WHERE ${where}`);
  },
};

export type { QueryResult, DatabaseInfo, TableInfo, ColumnDefinition };
