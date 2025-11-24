/**
 * SQL Query types and interfaces for XDB
 */

export interface Column {
  name: string;
  type: string; // 'TEXT', 'INTEGER', 'REAL', 'BLOB'
  primaryKey?: boolean;
  notNull?: boolean;
  default?: string;
}

export interface Index {
  name: string;
  tableName: string;
  columns: string[];
  unique?: boolean;
}

export interface Table {
  name: string;
  columns: Column[];
  indexes: Index[];
  primaryKey?: string;
  data?: Row[];
}

export interface Database {
  name: string;
  tables: { [key: string]: Table };
  metadata: {
    createdAt: string;
    lastModified: string;
  };
}

export interface Row {
  [key: string]: string | number | boolean | null | Buffer;
}

export interface QueryResult {
  rows?: Row[];
  rowsAffected?: number;
  insertId?: number;
}

export interface ParsedQuery {
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'DROP' | 'ALTER' | 'BEGIN' | 'COMMIT' | 'ROLLBACK';
  statement: string;
}

/**
 * Parse SQL query to determine type
 */
export function parseQueryType(sql: string): ParsedQuery {
  const normalized = sql.trim().toUpperCase();

  if (normalized.startsWith('SELECT')) {
    return { type: 'SELECT', statement: sql };
  } else if (normalized.startsWith('INSERT')) {
    return { type: 'INSERT', statement: sql };
  } else if (normalized.startsWith('UPDATE')) {
    return { type: 'UPDATE', statement: sql };
  } else if (normalized.startsWith('DELETE')) {
    return { type: 'DELETE', statement: sql };
  } else if (normalized.startsWith('CREATE')) {
    return { type: 'CREATE', statement: sql };
  } else if (normalized.startsWith('DROP')) {
    return { type: 'DROP', statement: sql };
  } else if (normalized.startsWith('ALTER')) {
    return { type: 'ALTER', statement: sql };
  } else if (normalized.startsWith('BEGIN')) {
    return { type: 'BEGIN', statement: sql };
  } else if (normalized.startsWith('COMMIT')) {
    return { type: 'COMMIT', statement: sql };
  } else if (normalized.startsWith('ROLLBACK')) {
    return { type: 'ROLLBACK', statement: sql };
  }

  throw new Error(`Unknown query type: ${sql.substring(0, 50)}`);
}

/**
 * Extract table name from CREATE TABLE statement
 */
export function extractTableNameFromCreate(sql: string): string {
  const match = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?/i);
  if (!match) {
    throw new Error('Invalid CREATE TABLE statement');
  }
  return match[1];
}

/**
 * Extract table name from DROP TABLE statement
 */
export function extractTableNameFromDrop(sql: string): string {
  const match = sql.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?[`"']?(\w+)[`"']?/i);
  if (!match) {
    throw new Error('Invalid DROP TABLE statement');
  }
  return match[1];
}

/**
 * Extract columns from CREATE TABLE statement
 */
export function parseCreateTableStatement(sql: string): {
  tableName: string;
  columns: Column[];
  primaryKey?: string;
} {
  const tableNameMatch = sql.match(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(/i,
  );
  if (!tableNameMatch) {
    throw new Error('Invalid CREATE TABLE statement');
  }

  const tableName = tableNameMatch[1];

  // Extract column definitions
  const columnsMatch = sql.match(/\((.*)\)$/i);
  if (!columnsMatch) {
    throw new Error('Invalid column definitions');
  }

  const columnDefs = columnsMatch[1];
  const columns: Column[] = [];
  let primaryKey: string | undefined;

  // Split by comma, but be careful with nested parentheses
  const parts = columnDefs.split(',').map((p) => p.trim());

  for (const part of parts) {
    if (part.toUpperCase().startsWith('PRIMARY KEY')) {
      const pkMatch = part.match(/PRIMARY\s+KEY\s*\(\s*[`"']?(\w+)[`"']?\s*\)/i);
      if (pkMatch) {
        primaryKey = pkMatch[1];
      }
    } else if (part.toUpperCase().startsWith('CONSTRAINT')) {
      // Skip constraint lines for now
      continue;
    } else {
      // Parse column definition
      const colMatch = part.match(/[`"']?(\w+)[`"']?\s+(\w+)(.*)$/i);
      if (colMatch) {
        const name = colMatch[1];
        const type = colMatch[2].toUpperCase();
        const modifiers = colMatch[3].toUpperCase();

        const column: Column = {
          name,
          type,
          primaryKey: modifiers.includes('PRIMARY KEY'),
          notNull: modifiers.includes('NOT NULL'),
        };

        if (modifiers.includes('DEFAULT')) {
          const defaultMatch = modifiers.match(/DEFAULT\s+(.+?)(?:\s+|$)/);
          if (defaultMatch) {
            column.default = defaultMatch[1].trim();
          }
        }

        if (column.primaryKey && !primaryKey) {
          primaryKey = name;
        }

        columns.push(column);
      }
    }
  }

  return { tableName, columns, primaryKey };
}
