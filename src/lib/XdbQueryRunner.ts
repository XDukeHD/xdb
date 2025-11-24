/**
 * XdbQueryRunner - Executes SQL queries on in-memory database
 * Supports SELECT, INSERT, UPDATE, DELETE with WHERE clauses
 */

import { Database, Row, QueryResult } from './types';

export class XdbQueryRunner {
  private database: Database;
  private transactionLog: Array<{
    type: string;
    table: string;
    query: string;
    timestamp: number;
  }>;

  constructor(database: Database) {
    this.database = database;
    this.transactionLog = [];
  }

  /**
   * Execute a SELECT query
   */
  executeSelect(sql: string): QueryResult {
    // Simple SELECT parser - supports basic WHERE clauses
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);

    if (!selectMatch) {
      throw new Error('Invalid SELECT statement');
    }

    const selectClause = selectMatch[1].trim();
    const tableName = selectMatch[2];
    const whereClause = selectMatch[3];
    const orderByClause = selectMatch[4];
    const limitClause = selectMatch[5];

    const table = this.database.tables[tableName];
    if (!table) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    let rows = [...(this.database.tables[tableName].data as Row[])];

    // Apply WHERE clause
    if (whereClause) {
      rows = this.applyWhere(rows, whereClause);
    }

    // Apply ORDER BY
    if (orderByClause) {
      rows = this.applyOrderBy(rows, orderByClause);
    }

    // Apply LIMIT
    if (limitClause) {
      rows = rows.slice(0, parseInt(limitClause, 10));
    }

    // Apply SELECT projection
    if (selectClause === '*') {
      return { rows };
    }

    const selectedColumns = selectClause.split(',').map((col) => col.trim());
    const projectedRows = rows.map((row) => {
      const newRow: Row = {};
      for (const col of selectedColumns) {
        if (col in row) {
          newRow[col] = row[col];
        }
      }
      return newRow;
    });

    return { rows: projectedRows };
  }

  /**
   * Execute an INSERT query
   */
  executeInsert(sql: string): QueryResult {
    const insertMatch = sql.match(
      /INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s+VALUES\s*\((.+?)\)$/i,
    );

    if (!insertMatch) {
      throw new Error('Invalid INSERT statement');
    }

    const tableName = insertMatch[1];
    const columnNames = insertMatch[2].split(',').map((c) => c.trim());
    const values = this.parseValues(insertMatch[3]);

    const table = this.database.tables[tableName];
    if (!table) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    if (columnNames.length !== values.length) {
      throw new Error('Column count does not match value count');
    }

    const row: Row = {};
    for (let i = 0; i < columnNames.length; i++) {
      const colName = columnNames[i];
      const value = values[i];

      const column = table.columns.find((c) => c.name === colName);
      if (!column) {
        throw new Error(`Column '${colName}' does not exist in table '${tableName}'`);
      }

      row[colName] = this.coerceValue(value, column.type);
    }

    // Initialize data array if needed
    if (!table.data) {
      table.data = [];
    }

    // Validate PRIMARY KEY constraint
    this.validatePrimaryKeyConstraint(table, row);

    table.data.push(row);
    this.logTransaction('INSERT', tableName, sql);

    return { rowsAffected: 1 };
  }

  /**
   * Validate PRIMARY KEY constraint - ensure no duplicate values exist
   */
  private validatePrimaryKeyConstraint(table: any, newRow: Row): void {
    // Find primary key column(s)
    const primaryKeyColumns = table.columns.filter((col: { primaryKey?: boolean }) => col.primaryKey);

    if (primaryKeyColumns.length === 0) {
      return; // No primary key defined
    }

    // Check for duplicate values in existing rows
    const existingRows = table.data || [];
    for (const existingRow of existingRows) {
      let isDuplicate = true;

      // Check if all primary key columns match
      for (const pkColumn of primaryKeyColumns) {
        if (existingRow[pkColumn.name] !== newRow[pkColumn.name]) {
          isDuplicate = false;
          break;
        }
      }

      if (isDuplicate) {
        // Found a row with duplicate primary key value(s)
        const pkColumnNames = primaryKeyColumns.map((col: { name: string }) => col.name).join(', ');
        throw new Error(
          `PRIMARY KEY constraint violation: Duplicate value for column(s) '${pkColumnNames}'`,
        );
      }
    }
  }

  /**
   * Execute an UPDATE query
   */
  executeUpdate(sql: string): QueryResult {
    const updateMatch = sql.match(
      /UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+?))?$/i,
    );

    if (!updateMatch) {
      throw new Error('Invalid UPDATE statement');
    }

    const tableName = updateMatch[1];
    const setClause = updateMatch[2];
    const whereClause = updateMatch[3];

    const table = this.database.tables[tableName];
    if (!table) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    // Parse SET clause
    const setAssignments = setClause.split(',').map((s) => {
      const [col, val] = s.split('=').map((p) => p.trim());
      return { column: col, value: this.parseValue(val) };
    });

    const allRows = table.data || [];
    let rowsAffected = 0;

    for (const row of allRows) {
      // Check if this row matches WHERE clause
      const matchesWhere = !whereClause || this.evaluateWhere(row, whereClause);

      if (matchesWhere) {
        // Update this row
        for (const assignment of setAssignments) {
          const column = table.columns.find((c) => c.name === assignment.column);
          if (column) {
            row[assignment.column] = this.coerceValue(assignment.value, column.type);
          }
        }
        rowsAffected++;
      }
    }

    this.logTransaction('UPDATE', tableName, sql);
    return { rowsAffected };
  }

  /**
   * Execute a DELETE query
   */
  executeDelete(sql: string): QueryResult {
    const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?$/i);

    if (!deleteMatch) {
      throw new Error('Invalid DELETE statement');
    }

    const tableName = deleteMatch[1];
    const whereClause = deleteMatch[2];

    const table = this.database.tables[tableName];
    if (!table) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    const oldLength = (table.data || []).length;
    if (whereClause) {
      table.data = this.applyWhere(table.data || [], whereClause, true);
    } else {
      table.data = [];
    }

    const rowsAffected = oldLength - (table.data || []).length;
    this.logTransaction('DELETE', tableName, sql);

    return { rowsAffected };
  }

  /**
   * Apply WHERE clause to rows
   */
  private applyWhere(
    rows: Row[],
    whereClause: string,
    invert = false,
  ): Row[] {
    return rows.filter((row) => {
      const result = this.evaluateWhere(row, whereClause);
      return invert ? !result : result;
    });
  }

  /**
   * Evaluate WHERE condition for a single row
   */
  private evaluateWhere(row: Row, whereClause: string): boolean {
    // Simple WHERE parser - supports =, >, <, >=, <=, !=, LIKE, IN, IS NULL
    const orParts = whereClause.split(/\s+OR\s+/i);

    return orParts.some((orPart) => {
      const andParts = orPart.split(/\s+AND\s+/i);
      return andParts.every((andPart) => this.evaluateCondition(row, andPart));
    });
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(row: Row, condition: string): boolean {
    // Handle =, >, <, >=, <=, !=, LIKE, IN, IS NULL
    const operators = ['>=', '<=', '!=', '<>', 'LIKE', 'IN', 'IS'];
    let op = '';
    let leftSide = '';
    let rightSide = '';

    for (const operator of operators) {
      const regex = new RegExp(`\\s+${operator}\\s+`);
      const match = condition.match(regex);
      if (match) {
        op = operator;
        const parts = condition.split(regex);
        leftSide = parts[0].trim();
        rightSide = parts[1].trim();
        break;
      }
    }

    if (!op) {
      const eqMatch = condition.match(/=(?!=)/);
      if (eqMatch) {
        const parts = condition.split('=');
        op = '=';
        leftSide = parts[0].trim();
        rightSide = parts.slice(1).join('=').trim();
      } else {
        // Try to match > or < first (before checking =)
        const gtMatch = condition.match(/\s*>\s*/);
        if (gtMatch) {
          const parts = condition.split(/\s*>\s*/);
          op = '>';
          leftSide = parts[0].trim();
          rightSide = parts[1].trim();
        } else {
          const ltMatch = condition.match(/\s*<\s*/);
          if (ltMatch) {
            const parts = condition.split(/\s*<\s*/);
            op = '<';
            leftSide = parts[0].trim();
            rightSide = parts[1].trim();
          }
        }
      }
    }

    if (!op || !leftSide) {
      throw new Error(`Invalid WHERE condition: ${condition}`);
    }

    const leftValue = row[leftSide];
    const rightValue = this.parseValue(rightSide);

    switch (op) {
      case '=':
        return leftValue === rightValue;
      case '>':
        return leftValue !== null && rightValue !== null && leftValue > rightValue;
      case '<':
        return leftValue !== null && rightValue !== null && leftValue < rightValue;
      case '>=':
        return leftValue !== null && rightValue !== null && leftValue >= rightValue;
      case '<=':
        return leftValue !== null && rightValue !== null && leftValue <= rightValue;
      case '!=':
      case '<>':
        return leftValue !== rightValue;
      case 'LIKE':
        return String(leftValue).includes(String(rightValue).replace(/%/g, ''));
      case 'IN':
        return this.parseArrayValue(rightValue).includes(leftValue as string | number);
      case 'IS':
        if (rightValue === 'NULL') {
          return leftValue === null;
        }
        return leftValue !== null;
      default:
        return false;
    }
  }

  /**
   * Apply ORDER BY clause
   */
  private applyOrderBy(rows: Row[], orderByClause: string): Row[] {
    const parts = orderByClause.split(',').map((p) => p.trim());

    return rows.sort((a, b) => {
      for (const part of parts) {
        const [column, direction] = part.split(/\s+/);
        const isDesc = direction?.toUpperCase() === 'DESC';

        const aVal = a[column];
        const bVal = b[column];

        if (aVal !== null && bVal !== null) {
          if (aVal < bVal) {
            return isDesc ? 1 : -1;
          }
          if (aVal > bVal) {
            return isDesc ? -1 : 1;
          }
        }
      }
      return 0;
    });
  }

  /**
   * Parse SQL values from a string
   */
  private parseValues(valuesStr: string): (string | number | boolean | null)[] {
    const values: (string | number | boolean | null)[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];

      if (char === "'" && valuesStr[i - 1] !== '\\') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(this.parseValue(current.trim()));
        current = '';
        continue;
      }

      current += char;
    }

    if (current) {
      values.push(this.parseValue(current.trim()));
    }

    return values;
  }

  /**
   * Parse a single SQL value
   */
  private parseValue(value: string): string | number | boolean | null {
    if (value.toUpperCase() === 'NULL') {
      return null;
    }

    if (value.toUpperCase() === 'TRUE') {
      return true;
    }

    if (value.toUpperCase() === 'FALSE') {
      return false;
    }

    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1).replace(/\\'/g, "'");
    }

    const num = Number(value);
    if (!isNaN(num) && value !== '') {
      return num;
    }

    return value;
  }

  /**
   * Parse array value for IN clause
   */
  private parseArrayValue(value: string | number | boolean | null): (string | number)[] {
    if (typeof value === 'string' && value.startsWith('(') && value.endsWith(')')) {
      const inner = value.slice(1, -1);
      return inner.split(',').map((v) => {
        const parsed = this.parseValue(v.trim());
        return typeof parsed === 'string' || typeof parsed === 'number' ? parsed : '';
      });
    }
    return [value as string | number];
  }

  /**
   * Coerce value to column type
   */
  private coerceValue(value: string | number | boolean | null, type: string): string | number | boolean | null {
    if (value === null) {
      return null;
    }

    switch (type.toUpperCase()) {
      case 'INTEGER':
        return Number(value);
      case 'REAL':
        return parseFloat(String(value));
      case 'TEXT':
        return String(value);
      case 'BLOB':
        return value;
      default:
        return value;
    }
  }

  /**
   * Log transaction for audit trail
   */
  private logTransaction(type: string, table: string, query: string): void {
    this.transactionLog.push({
      type,
      table,
      query,
      timestamp: Date.now(),
    });
  }

  /**
   * Get transaction log
   */
  getTransactionLog(): Array<{
    type: string;
    table: string;
    query: string;
    timestamp: number;
  }> {
    return this.transactionLog;
  }
}
