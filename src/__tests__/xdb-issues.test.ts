/**
 * Tests for XDB bug fixes:
 * 1. Primary key uniqueness enforcement
 * 2. WHERE clause filtering in SELECT queries
 */

import { XdbEngine } from '../lib/XdbEngine';

describe('XDB Bug Fixes', () => {
  let engine: XdbEngine;

  beforeEach(() => {
    engine = new XdbEngine();
  });

  describe('Primary Key Uniqueness Enforcement', () => {
    it('should reject duplicate values in PRIMARY KEY columns', () => {
      // Create database
      engine.createDatabase('testdb');

      // Create table with PRIMARY KEY
      engine.createTable(
        'testdb',
        'CREATE TABLE users (id INTEGER PRIMARY KEY NOT NULL, name TEXT)',
      );

      // Insert first row
      const result1 = engine.executeQuery(
        'testdb',
        "INSERT INTO users (id, name) VALUES (1, 'Alice')",
      );
      expect(result1.rowsAffected).toBe(1);

      // Try to insert duplicate primary key - should fail
      expect(() => {
        engine.executeQuery('testdb', "INSERT INTO users (id, name) VALUES (1, 'Bob')");
      }).toThrow(/PRIMARY KEY|duplicate|unique/i);
    });

    it('should allow different values in PRIMARY KEY column', () => {
      engine.createDatabase('testdb');
      engine.createTable(
        'testdb',
        'CREATE TABLE users (id INTEGER PRIMARY KEY NOT NULL, name TEXT)',
      );

      const result1 = engine.executeQuery(
        'testdb',
        "INSERT INTO users (id, name) VALUES (1, 'Alice')",
      );
      expect(result1.rowsAffected).toBe(1);

      const result2 = engine.executeQuery(
        'testdb',
        "INSERT INTO users (id, name) VALUES (2, 'Bob')",
      );
      expect(result2.rowsAffected).toBe(1);

      // Verify both rows exist
      const select = engine.executeQuery('testdb', 'SELECT * FROM users');
      expect(select.rows).toHaveLength(2);
    });
  });

  describe('WHERE Clause Filtering in SELECT', () => {
    beforeEach(() => {
      engine.createDatabase('testdb');
      engine.createTable(
        'testdb',
        'CREATE TABLE teste (id INTEGER, nome TEXT)',
      );

      // Insert test data
      engine.executeQuery('testdb', "INSERT INTO teste (id, nome) VALUES (1, 'Goku')");
      engine.executeQuery('testdb', "INSERT INTO teste (id, nome) VALUES (2, 'Vegeta')");
      engine.executeQuery('testdb', "INSERT INTO teste (id, nome) VALUES (3, 'Goku')");
      engine.executeQuery('testdb', "INSERT INTO teste (id, nome) VALUES (4, 'Gohan')");
    });

    it('should filter SELECT results by TEXT column equality', () => {
      const result = engine.executeQuery(
        'testdb',
        "SELECT * FROM teste WHERE nome = 'Goku'",
      );

      // Should only return Goku rows (not all rows)
      expect(result.rows).toHaveLength(2);
      expect(result.rows?.every((row) => row.nome === 'Goku')).toBe(true);
    });

    it('should filter SELECT results by INTEGER column comparison', () => {
      const result = engine.executeQuery('testdb', 'SELECT * FROM teste WHERE id > 2');

      // Should only return rows with id 3 and 4
      expect(result.rows).toHaveLength(2);
      expect(result.rows?.every((row) => (row.id as number) > 2)).toBe(true);
    });

    it('should return empty result set when WHERE matches no rows', () => {
      const result = engine.executeQuery(
        'testdb',
        "SELECT * FROM teste WHERE nome = 'NonExistent'",
      );

      expect(result.rows).toHaveLength(0);
    });

    it('should return all rows when WHERE matches all rows', () => {
      const result = engine.executeQuery(
        'testdb',
        "SELECT * FROM teste WHERE id > 0",
      );

      expect(result.rows).toHaveLength(4);
    });

    it('should support WHERE with AND operator', () => {
      const result = engine.executeQuery(
        'testdb',
        "SELECT * FROM teste WHERE id > 1 AND nome = 'Goku'",
      );

      // Should only return Goku with id > 1 (id = 3)
      expect(result.rows).toHaveLength(1);
      expect(result.rows?.[0].id).toBe(3);
      expect(result.rows?.[0].nome).toBe('Goku');
    });

    it('should support WHERE with OR operator', () => {
      const result = engine.executeQuery(
        'testdb',
        "SELECT * FROM teste WHERE nome = 'Goku' OR nome = 'Vegeta'",
      );

      // Should return both Goku and Vegeta rows
      expect(result.rows).toHaveLength(3);
      const names = result.rows?.map((r) => r.nome);
      expect(names).toContain('Goku');
      expect(names).toContain('Vegeta');
    });

    it('should support WHERE with LIKE operator', () => {
      const result = engine.executeQuery(
        'testdb',
        "SELECT * FROM teste WHERE nome LIKE 'Gok'",
      );

      // Should match Goku
      expect(result.rows).toHaveLength(2);
      expect(result.rows?.every((row) => (row.nome as string).includes('Gok'))).toBe(true);
    });

    it('should support WHERE with IN operator', () => {
      const result = engine.executeQuery(
        'testdb',
        "SELECT * FROM teste WHERE id IN (1, 3)",
      );

      // Should return rows with id 1 and 3
      expect(result.rows).toHaveLength(2);
      expect(result.rows?.map((r) => r.id)).toContain(1);
      expect(result.rows?.map((r) => r.id)).toContain(3);
    });

    it('should project specific columns correctly with WHERE', () => {
      const result = engine.executeQuery(
        'testdb',
        "SELECT id FROM teste WHERE nome = 'Goku'",
      );

      // Should return only id column for matching rows
      expect(result.rows).toHaveLength(2);
      expect(result.rows?.every((row) => 'id' in row && !('nome' in row))).toBe(true);
    });
  });

  describe('Combined: Primary Key + WHERE', () => {
    it('should enforce primary key and correctly filter with WHERE', () => {
      engine.createDatabase('testdb');
      engine.createTable(
        'testdb',
        'CREATE TABLE products (sku TEXT PRIMARY KEY NOT NULL, name TEXT, price REAL)',
      );

      // Insert products
      engine.executeQuery('testdb', "INSERT INTO products (sku, name, price) VALUES ('A001', 'Widget', 9.99)");
      engine.executeQuery('testdb', "INSERT INTO products (sku, name, price) VALUES ('B001', 'Gadget', 19.99)");
      engine.executeQuery('testdb', "INSERT INTO products (sku, name, price) VALUES ('C001', 'Doohickey', 14.99)");

      // Try duplicate SKU - should fail
      expect(() => {
        engine.executeQuery('testdb', "INSERT INTO products (sku, name, price) VALUES ('A001', 'Duplicate', 5.00)");
      }).toThrow(/PRIMARY KEY|duplicate|unique/i);

      // Query with WHERE - should return only matching rows
      const expensive = engine.executeQuery(
        'testdb',
        'SELECT * FROM products WHERE price > 15',
      );
      expect(expensive.rows).toHaveLength(1);
      expect(expensive.rows?.[0].sku).toBe('B001');
    });
  });
});
