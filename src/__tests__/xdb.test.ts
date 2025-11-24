/**
 * Unit tests for XDB core components
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { XdbEngine } from '@/lib/XdbEngine';
import { parseQueryType, parseCreateTableStatement } from '@/lib/types';

describe('XdbEngine', () => {
  let engine: XdbEngine;

  beforeEach(() => {
    engine = new XdbEngine();
  });

  it('should create a database', () => {
    engine.createDatabase('testdb');
    expect(engine.databaseExists('testdb')).toBe(true);
    expect(engine.listDatabases()).toContain('testdb');
  });

  it('should throw error when creating duplicate database', () => {
    engine.createDatabase('testdb');
    expect(() => engine.createDatabase('testdb')).toThrow('already exists');
  });

  it('should delete a database', () => {
    engine.createDatabase('testdb');
    engine.deleteDatabase('testdb');
    expect(engine.databaseExists('testdb')).toBe(false);
  });

  it('should create a table', () => {
    engine.createDatabase('testdb');
    const sql = 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)';
    engine.createTable('testdb', sql);

    const tables = engine.listTables('testdb');
    expect(tables).toContain('users');
  });

  it('should throw error when creating table in non-existent database', () => {
    const sql = 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)';
    expect(() => engine.createTable('nonexistent', sql)).toThrow('does not exist');
  });

  it('should export and import databases as JSON', () => {
    engine.createDatabase('testdb');
    const sql = 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)';
    engine.createTable('testdb', sql);

    const json = engine.exportToJson();
    const engine2 = new XdbEngine();
    engine2.loadFromJson(json);

    expect(engine2.databaseExists('testdb')).toBe(true);
    expect(engine2.listTables('testdb')).toContain('users');
  });
});

describe('XdbQueryRunner', () => {
  let engine: XdbEngine;

  beforeEach(() => {
    engine = new XdbEngine();
    engine.createDatabase('testdb');

    const sql = 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)';
    engine.createTable('testdb', sql);
  });

  it('should insert a row', () => {
    const sql = "INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)";
    const result = engine.executeQuery('testdb', sql);

    expect(result.rowsAffected).toBe(1);

    const table = engine.getTableData('testdb', 'users');
    expect(table).toHaveLength(1);
    expect(table[0].name).toBe('Alice');
  });

  it('should select all rows', () => {
    engine.executeQuery('testdb', "INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)");
    engine.executeQuery('testdb', "INSERT INTO users (id, name, age) VALUES (2, 'Bob', 25)");

    const result = engine.executeQuery('testdb', 'SELECT * FROM users');

    expect(result.rows).toHaveLength(2);
  });

  it('should select specific columns', () => {
    engine.executeQuery('testdb', "INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)");

    const result = engine.executeQuery('testdb', 'SELECT name FROM users');

    expect(result.rows).toHaveLength(1);
    expect(result.rows![0]).toHaveProperty('name');
    expect(result.rows![0]).not.toHaveProperty('age');
  });

  it('should select with WHERE clause', () => {
    engine.executeQuery('testdb', "INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)");
    engine.executeQuery('testdb', "INSERT INTO users (id, name, age) VALUES (2, 'Bob', 25)");

    const result = engine.executeQuery('testdb', 'SELECT * FROM users WHERE age > 26');

    expect(result.rows).toHaveLength(1);
    expect(result.rows![0].name).toBe('Alice');
  });

  it('should update rows', () => {
    engine.executeQuery('testdb', "INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)");

    const result = engine.executeQuery('testdb', "UPDATE users SET age = 31 WHERE id = 1");

    expect(result.rowsAffected).toBe(1);

    const table = engine.getTableData('testdb', 'users');
    expect(table[0].age).toBe(31);
  });

  it('should delete rows', () => {
    engine.executeQuery('testdb', "INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)");
    engine.executeQuery('testdb', "INSERT INTO users (id, name, age) VALUES (2, 'Bob', 25)");

    const result = engine.executeQuery('testdb', 'DELETE FROM users WHERE age < 30');

    expect(result.rowsAffected).toBe(1);

    const table = engine.getTableData('testdb', 'users');
    expect(table).toHaveLength(1);
  });

  it('should drop a table', () => {
    engine.dropTable('testdb', 'users');

    const tables = engine.listTables('testdb');
    expect(tables).not.toContain('users');
  });
});

describe('Query parsing', () => {
  it('should parse SELECT query type', () => {
    const result = parseQueryType('SELECT * FROM users');
    expect(result.type).toBe('SELECT');
  });

  it('should parse INSERT query type', () => {
    const result = parseQueryType("INSERT INTO users VALUES (1, 'Alice')");
    expect(result.type).toBe('INSERT');
  });

  it('should parse UPDATE query type', () => {
    const result = parseQueryType('UPDATE users SET name = "Bob"');
    expect(result.type).toBe('UPDATE');
  });

  it('should parse DELETE query type', () => {
    const result = parseQueryType('DELETE FROM users WHERE id = 1');
    expect(result.type).toBe('DELETE');
  });

  it('should parse CREATE query type', () => {
    const result = parseQueryType('CREATE TABLE users (id INTEGER)');
    expect(result.type).toBe('CREATE');
  });

  it('should parse DROP query type', () => {
    const result = parseQueryType('DROP TABLE users');
    expect(result.type).toBe('DROP');
  });
});

describe('CREATE TABLE parsing', () => {
  it('should parse simple CREATE TABLE', () => {
    const sql = 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)';
    const result = parseCreateTableStatement(sql);

    expect(result.tableName).toBe('users');
    expect(result.columns).toHaveLength(2);
    expect(result.columns[0].name).toBe('id');
    expect(result.columns[0].type).toBe('INTEGER');
    expect(result.primaryKey).toBe('id');
  });

  it('should parse CREATE TABLE with multiple columns', () => {
    const sql = 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER, email TEXT)';
    const result = parseCreateTableStatement(sql);

    expect(result.columns).toHaveLength(4);
  });

  it('should parse CREATE TABLE with NOT NULL constraint', () => {
    const sql = 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)';
    const result = parseCreateTableStatement(sql);

    expect(result.columns[1].notNull).toBe(true);
  });
});
