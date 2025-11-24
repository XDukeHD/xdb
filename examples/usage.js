#!/usr/bin/env node

/**
 * Example script demonstrating XDB API usage
 * Run with: node examples/usage.js
 */

const TOKEN = 'test-token-development-only-123456789abcdefghij';
const API = 'http://localhost:3000/api/xdb';

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function request(method, endpoint, body = null) {
  const options = {
    method,
    headers,
  };

  if (body) {
    if (method === 'GET') {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Type'] = 'text/plain';
    } else {
      if (typeof body === 'string') {
        options.body = body;
        options.headers['Content-Type'] = 'text/plain';
      } else {
        options.body = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
      }
    }
  }

  console.log(`\n${method} ${endpoint}`);
  if (body && typeof body === 'string') {
    console.log(`Body: ${body.substring(0, 100)}...`);
  }

  try {
    const response = await fetch(`${API}${endpoint}`, options);
    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

async function main() {
  console.log('=== XDB API Usage Examples ===\n');

  try {
    // 1. List databases
    console.log('\n--- 1. List Databases ---');
    await request('GET', '/databases');

    // 2. Create database
    console.log('\n--- 2. Create Database ---');
    await request('PUT', '/databases', { name: 'shopdb' });

    // 3. Create table
    console.log('\n--- 3. Create Table ---');
    const createTableSQL = `CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  age INTEGER
)`;
    await request('PUT', '/databases/shopdb/users', createTableSQL);

    // 4. List tables
    console.log('\n--- 4. List Tables ---');
    await request('GET', '/databases/shopdb');

    // 5. Get table schema
    console.log('\n--- 5. Get Table Schema ---');
    await request('GET', '/databases/shopdb/users');

    // 6. Insert data
    console.log('\n--- 6. Insert Data ---');
    await request('POST', '/databases/shopdb/users', 
      "INSERT INTO users (id, name, email, age) VALUES (1, 'Alice Johnson', 'alice@example.com', 30)");

    await request('POST', '/databases/shopdb/users',
      "INSERT INTO users (id, name, email, age) VALUES (2, 'Bob Smith', 'bob@example.com', 25)");

    await request('POST', '/databases/shopdb/users',
      "INSERT INTO users (id, name, email, age) VALUES (3, 'Charlie Brown', 'charlie@example.com', 35)");

    // 7. Select all
    console.log('\n--- 7. Select All ---');
    await request('GET', '/databases/shopdb/users', 'SELECT * FROM users');

    // 8. Select with WHERE
    console.log('\n--- 8. Select with WHERE ---');
    await request('GET', '/databases/shopdb/users', 'SELECT * FROM users WHERE age > 26');

    // 9. Select specific columns
    console.log('\n--- 9. Select Specific Columns ---');
    await request('GET', '/databases/shopdb/users', 'SELECT name, email FROM users');

    // 10. Update data
    console.log('\n--- 10. Update Data ---');
    await request('POST', '/databases/shopdb/users',
      "UPDATE users SET age = 31 WHERE id = 1");

    // 11. Verify update
    console.log('\n--- 11. Verify Update ---');
    await request('GET', '/databases/shopdb/users', 'SELECT * FROM users WHERE id = 1');

    // 12. Delete data
    console.log('\n--- 12. Delete Data ---');
    await request('POST', '/databases/shopdb/users',
      'DELETE FROM users WHERE age < 30');

    // 13. Verify delete
    console.log('\n--- 13. Verify Delete ---');
    await request('GET', '/databases/shopdb/users', 'SELECT * FROM users');

    // 14. Create another table
    console.log('\n--- 14. Create Products Table ---');
    const createProductsSQL = `CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL,
  quantity INTEGER
)`;
    await request('PUT', '/databases/shopdb/products', createProductsSQL);

    // 15. Insert products
    console.log('\n--- 15. Insert Products ---');
    await request('POST', '/databases/shopdb/products',
      "INSERT INTO products (id, name, price, quantity) VALUES (1, 'Laptop', 999.99, 5)");

    await request('POST', '/databases/shopdb/products',
      "INSERT INTO products (id, name, price, quantity) VALUES (2, 'Mouse', 29.99, 50)");

    // 16. List all tables
    console.log('\n--- 16. List All Tables ---');
    await request('GET', '/databases/shopdb');

    // 17. Drop table
    console.log('\n--- 17. Drop Table ---');
    await request('DELETE', '/databases/shopdb/products');

    // 18. Verify table deleted
    console.log('\n--- 18. Verify Table Deleted ---');
    await request('GET', '/databases/shopdb');

    // 19. List all databases
    console.log('\n--- 19. List All Databases ---');
    await request('GET', '/databases');

    console.log('\n=== All examples completed successfully! ===\n');
  } catch (error) {
    console.error('Example failed:', error);
    process.exit(1);
  }
}

main();
