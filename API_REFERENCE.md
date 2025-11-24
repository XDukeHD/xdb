# XDB API Reference

Complete API documentation for all xDB endpoints.

## Base URL

```
Production: https://xdb.example.com/api/xdb
Development: http://localhost:3000/api/xdb
```

## Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer {AUTH_TOKEN}
```

**Example:**

```bash
TOKEN="your-secure-token-here"
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/xdb/databases"
```

## Response Format

All responses follow this format:

### Success Response (200 OK)

```json
{
  "status": "ok",
  "data": {
    // ... response data varies by endpoint
  },
  "elapsed_seconds": 0.045
}
```

### Error Response (4xx/5xx)

```json
{
  "status": "error",
  "error": "Detailed error message",
  "elapsed_seconds": 0.012
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200  | OK - Request succeeded |
| 201  | Created - Resource created successfully |
| 204  | No Content - Request succeeded (no data) |
| 400  | Bad Request - Invalid parameters |
| 401  | Unauthorized - Missing/invalid auth token |
| 404  | Not Found - Database/table doesn't exist |
| 409  | Conflict - Resource already exists |
| 413  | Payload Too Large - Database size limit exceeded |
| 500  | Internal Server Error - Server error |

---

## Endpoints

### Database Management

#### GET /api/xdb/databases

List all databases.

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/xdb/databases"
```

**Response:**

```json
{
  "status": "ok",
  "data": {
    "databases": [
      {
        "name": "users_db",
        "tables": ["users", "profiles"],
        "createdAt": "2024-01-15T10:30:00Z",
        "size_bytes": 1024,
        "table_count": 2
      },
      {
        "name": "products_db",
        "tables": ["products", "inventory"],
        "createdAt": "2024-01-14T09:15:00Z",
        "size_bytes": 2048,
        "table_count": 2
      }
    ]
  },
  "elapsed_seconds": 0.023
}
```

---

#### PUT /api/xdb/databases

Create a new database.

**Request:**

```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "my_database"}' \
  "http://localhost:3000/api/xdb/databases"
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | Database name (alphanumeric, underscore, hyphen only) |

**Response:**

```json
{
  "status": "ok",
  "data": {
    "message": "Database created successfully",
    "database": {
      "name": "my_database",
      "tables": [],
      "createdAt": "2024-01-15T10:35:00Z",
      "size_bytes": 256
    }
  },
  "elapsed_seconds": 0.032
}
```

**Errors:**

```json
{
  "status": "error",
  "error": "Database 'my_database' already exists",
  "elapsed_seconds": 0.010
}
```

---

#### GET /api/xdb/databases/{dbName}

Get database details and schema.

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/xdb/databases/my_database"
```

**Response:**

```json
{
  "status": "ok",
  "data": {
    "database": {
      "name": "my_database",
      "tables": [
        {
          "name": "users",
          "columns": [
            {
              "name": "id",
              "type": "INTEGER",
              "primaryKey": true,
              "notNull": true
            },
            {
              "name": "email",
              "type": "TEXT",
              "primaryKey": false,
              "notNull": true
            }
          ],
          "rowCount": 5,
          "indexes": []
        }
      ]
    }
  },
  "elapsed_seconds": 0.018
}
```

---

#### PUT /api/xdb/databases/{dbName}

Rename a database.

**Request:**

```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rename": "my_database_v2"}' \
  "http://localhost:3000/api/xdb/databases/my_database"
```

**Response:**

```json
{
  "status": "ok",
  "data": {
    "message": "Database renamed successfully"
  },
  "elapsed_seconds": 0.025
}
```

---

#### POST /api/xdb/databases/{dbName}

Execute SQL query on database.

**Request:**

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users WHERE id > 5"}' \
  "http://localhost:3000/api/xdb/databases/my_database"
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| query | string | Yes | SQL query to execute |
| format | string | No | Response format: 'json' (default) or 'csv' |

**Response:**

```json
{
  "status": "ok",
  "data": {
    "rows": [
      { "id": 6, "email": "alice@example.com" },
      { "id": 7, "email": "bob@example.com" }
    ],
    "rowsAffected": 2,
    "query_type": "SELECT"
  },
  "elapsed_seconds": 0.034
}
```

---

#### DELETE /api/xdb/databases/{dbName}

Delete a database.

**Request:**

```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/xdb/databases/my_database"
```

**Response:**

```json
{
  "status": "ok",
  "data": {
    "message": "Database deleted successfully",
    "name": "my_database"
  },
  "elapsed_seconds": 0.015
}
```

---

### Table Operations

#### GET /api/xdb/databases/{dbName}/{tableName}

Get table data with optional filtering.

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/xdb/databases/my_database/users?limit=10&offset=0"
```

**Query Parameters:**

| Name | Type | Description |
|------|------|-------------|
| limit | number | Maximum rows to return (default: 100) |
| offset | number | Skip N rows (default: 0) |
| columns | string (comma-separated) | Only return specified columns |
| sort | string | Sort column (prefix with - for descending, e.g., "-id") |

**Response:**

```json
{
  "status": "ok",
  "data": {
    "table": "users",
    "rows": [
      { "id": 1, "email": "user1@example.com" },
      { "id": 2, "email": "user2@example.com" }
    ],
    "total": 2,
    "limit": 10,
    "offset": 0
  },
  "elapsed_seconds": 0.021
}
```

---

#### PUT /api/xdb/databases/{dbName}/{tableName}

Create a new table.

**Request:**

```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "columns": [
      { "name": "id", "type": "INTEGER", "primaryKey": true, "notNull": true },
      { "name": "name", "type": "TEXT", "notNull": true },
      { "name": "age", "type": "INTEGER" },
      { "name": "email", "type": "TEXT" }
    ]
  }' \
  "http://localhost:3000/api/xdb/databases/my_database/users"
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| columns | array | Yes | Column definitions |
| columns[].name | string | Yes | Column name |
| columns[].type | enum | Yes | Data type: INTEGER, TEXT, REAL, BLOB |
| columns[].primaryKey | boolean | No | Mark as primary key |
| columns[].notNull | boolean | No | Column cannot be null |
| columns[].default | any | No | Default value |

**Response:**

```json
{
  "status": "ok",
  "data": {
    "message": "Table created successfully",
    "table": {
      "name": "users",
      "columns": [
        {
          "name": "id",
          "type": "INTEGER",
          "primaryKey": true,
          "notNull": true
        },
        {
          "name": "name",
          "type": "TEXT",
          "notNull": true
        }
      ]
    }
  },
  "elapsed_seconds": 0.027
}
```

---

#### POST /api/xdb/databases/{dbName}/{tableName}

Insert or update rows.

**Request - INSERT:**

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "insert",
    "rows": [
      { "id": 1, "name": "Alice", "age": 30, "email": "alice@example.com" },
      { "id": 2, "name": "Bob", "age": 25, "email": "bob@example.com" }
    ]
  }' \
  "http://localhost:3000/api/xdb/databases/my_database/users"
```

**Request - UPDATE:**

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "update",
    "row": { "age": 31 },
    "where": "id = 1"
  }' \
  "http://localhost:3000/api/xdb/databases/my_database/users"
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| operation | enum | Yes | "insert", "update", or "delete" |
| rows | array | Conditional | Array of rows (INSERT) |
| row | object | Conditional | Row updates (UPDATE) |
| where | string | Conditional | WHERE clause (UPDATE/DELETE) |

**Response - INSERT:**

```json
{
  "status": "ok",
  "data": {
    "operation": "insert",
    "rowsAffected": 2,
    "insertIds": [1, 2]
  },
  "elapsed_seconds": 0.035
}
```

**Response - UPDATE:**

```json
{
  "status": "ok",
  "data": {
    "operation": "update",
    "rowsAffected": 1
  },
  "elapsed_seconds": 0.018
}
```

---

#### DELETE /api/xdb/databases/{dbName}/{tableName}

Delete rows from table or drop table.

**Request - DELETE ROWS:**

```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"where": "age < 18"}' \
  "http://localhost:3000/api/xdb/databases/my_database/users"
```

**Request - DROP TABLE:**

```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"drop": true}' \
  "http://localhost:3000/api/xdb/databases/my_database/users"
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| where | string | No | WHERE clause for selective delete |
| drop | boolean | No | If true, drop entire table |

**Response - DELETE ROWS:**

```json
{
  "status": "ok",
  "data": {
    "operation": "delete",
    "rowsAffected": 3
  },
  "elapsed_seconds": 0.022
}
```

**Response - DROP TABLE:**

```json
{
  "status": "ok",
  "data": {
    "message": "Table dropped successfully",
    "table": "users"
  },
  "elapsed_seconds": 0.015
}
```

---

## SQL Query Examples

### SELECT

```bash
# All columns
{"query": "SELECT * FROM users"}

# Specific columns
{"query": "SELECT id, name FROM users"}

# With WHERE clause
{"query": "SELECT * FROM users WHERE age > 25"}

# With ORDER BY and LIMIT
{"query": "SELECT * FROM users ORDER BY name ASC LIMIT 10"}

# Complex WHERE
{"query": "SELECT * FROM users WHERE age > 25 AND email LIKE '%@example.com'"}
```

### INSERT

```bash
# Single row
{"query": "INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)"}

# Multiple rows
{"query": "INSERT INTO users (id, name) VALUES (2, 'Bob'), (3, 'Charlie')"}
```

### UPDATE

```bash
# Single column
{"query": "UPDATE users SET age = 31 WHERE id = 1"}

# Multiple columns
{"query": "UPDATE users SET age = 26, email = 'bob_new@example.com' WHERE id = 2"}

# All rows
{"query": "UPDATE users SET status = 'active'"}
```

### DELETE

```bash
# With WHERE clause
{"query": "DELETE FROM users WHERE age < 18"}

# All rows
{"query": "DELETE FROM users"}
```

### CREATE TABLE

```bash
{"query": "CREATE TABLE users (id INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, age INTEGER, email TEXT)"}
```

### DROP TABLE

```bash
{"query": "DROP TABLE users"}
```

---

## WHERE Clause Operators

Supported operators in WHERE clauses:

| Operator | Description | Example |
|----------|-------------|---------|
| = | Equal | `age = 25` |
| > | Greater than | `age > 25` |
| < | Less than | `age < 25` |
| >= | Greater or equal | `age >= 25` |
| <= | Less or equal | `age <= 25` |
| != | Not equal | `age != 25` |
| <> | Not equal | `age <> 25` |
| LIKE | Pattern matching | `email LIKE '%@example.com'` |
| IN | Value in list | `id IN (1, 2, 3)` |
| IS NULL | Is null | `phone IS NULL` |
| AND | Logical AND | `age > 25 AND city = 'NYC'` |
| OR | Logical OR | `age > 25 OR age < 18` |

---

## Constraints

XDB enforces the following SQL constraints:

### PRIMARY KEY

Ensures uniqueness of values in one or more columns.

**Behavior:**
- ✅ Prevents duplicate values in PRIMARY KEY columns
- ✅ Supports single-column and composite PRIMARY KEY
- ✅ Error thrown on INSERT of duplicate value
- ✅ NULL values are not allowed in PRIMARY KEY columns

**Example:**

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT,
  name TEXT
)
```

**Error on Duplicate:**

```json
{
  "status": "error",
  "error": "PRIMARY KEY constraint violation: Duplicate value for column(s) 'id'",
  "elapsed_seconds": 0.012
}
```

### NOT NULL

Ensures a column always has a value (cannot be NULL).

**Behavior:**
- ✅ Prevents NULL values when specified
- ✅ Error thrown on INSERT/UPDATE with NULL in NOT NULL column

**Example:**

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT
)
```

**Composite PRIMARY KEY:**

```sql
CREATE TABLE order_items (
  order_id INTEGER,
  item_id INTEGER,
  quantity INTEGER,
  PRIMARY KEY (order_id, item_id)
)
```

---

## Data Types

| Type | Description | Range/Examples |
|------|-------------|-----------------|
| INTEGER | 32-bit signed integer | -2,147,483,648 to 2,147,483,647 |
| REAL | 64-bit floating point | -1.7976931348623157e+308 to 1.7976931348623157e+308 |
| TEXT | UTF-8 string | Up to 2GB (limited by memory) |
| BLOB | Binary data | Up to 2GB (base64 encoded in JSON) |
| NULL | Null value | - |

---

## Error Handling

### Common Errors

**Missing Authentication:**

```json
{
  "status": "error",
  "error": "Missing or invalid Authorization header",
  "elapsed_seconds": 0.001
}
```

**Database Not Found:**

```json
{
  "status": "error",
  "error": "Database 'unknown_db' not found",
  "elapsed_seconds": 0.003
}
```

**Syntax Error:**

```json
{
  "status": "error",
  "error": "SQL syntax error: Unexpected token",
  "elapsed_seconds": 0.005
}
```

**Size Limit Exceeded:**

```json
{
  "status": "error",
  "error": "Database size would exceed limit of 100MB",
  "elapsed_seconds": 0.010
}
```

### Error Response Codes

| Error | HTTP Status | Cause |
|-------|-------------|-------|
| Missing auth | 401 | No Authorization header |
| Invalid token | 401 | Token doesn't match AUTH_TOKEN |
| Database not found | 404 | Database doesn't exist |
| Table not found | 404 | Table doesn't exist |
| Duplicate database | 409 | Database already exists |
| Duplicate table | 409 | Table already exists |
| SQL error | 400 | Invalid SQL syntax |
| Size limit | 413 | Payload too large |
| Server error | 500 | Unexpected error |

---

## Rate Limiting

Currently, XDB has no built-in rate limiting. For production, implement via:

1. **Vercel Rate Limiting** (See DEPLOYING_TO_VERCEL.md)
2. **Cloudflare Rate Limiting** (if using as reverse proxy)
3. **Custom middleware** in API routes

Recommended limits:
- 100 requests per minute per IP
- 1000 requests per hour per IP
- 10MB per request payload

---

## Best Practices

### 1. Authentication

- Store AUTH_TOKEN in environment variables
- Never commit tokens to version control
- Rotate tokens regularly
- Use HTTPS for all requests

### 2. Query Performance

- Use WHERE clauses to filter data
- Add LIMIT to prevent large transfers
- Use specific columns instead of SELECT *
- Avoid complex queries with many rows

### 3. Data Validation

- Validate input before sending
- Check column types match values
- Use NOT NULL for required fields
- Handle null values appropriately

### 4. Error Handling

- Check response status field
- Parse error messages for debugging
- Implement retry logic for 5xx errors
- Log failed requests

### 5. Security

- Always use HTTPS in production
- Validate and sanitize input
- Use parameterized queries (via WHERE clause syntax)
- Implement rate limiting
- Monitor API logs
- Rotate encryption keys periodically

---

## Examples by Language

### cURL

```bash
TOKEN="your-token"
API="http://localhost:3000/api/xdb"

# List databases
curl -H "Authorization: Bearer $TOKEN" "$API/databases"

# Create database
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"mydb"}' "$API/databases"

# Create table
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"columns":[{"name":"id","type":"INTEGER","primaryKey":true}]}' \
  "$API/databases/mydb/users"

# Insert data
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"operation":"insert","rows":[{"id":1}]}' \
  "$API/databases/mydb/users"

# Query data
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT * FROM users"}' \
  "$API/databases/mydb"
```

### JavaScript/Node.js

```javascript
const TOKEN = 'your-token';
const API = 'http://localhost:3000/api/xdb';

async function createDatabase(name) {
  const res = await fetch(`${API}/databases`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name })
  });
  return res.json();
}

async function query(dbName, sql) {
  const res = await fetch(`${API}/databases/${dbName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  return res.json();
}

// Usage
await createDatabase('mydb');
const result = await query('mydb', 'SELECT * FROM users');
console.log(result.data.rows);
```

### Python

```python
import requests

TOKEN = 'your-token'
API = 'http://localhost:3000/api/xdb'
headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

def create_database(name):
    res = requests.put(
        f'{API}/databases',
        headers=headers,
        json={'name': name}
    )
    return res.json()

def query(db_name, sql):
    res = requests.post(
        f'{API}/databases/{db_name}',
        headers=headers,
        json={'query': sql}
    )
    return res.json()

# Usage
create_database('mydb')
result = query('mydb', 'SELECT * FROM users')
print(result['data']['rows'])
```

---

## Version History

- **v1.0.0** (2024-01-15) - Initial release
  - CREATE TABLE, DROP TABLE
  - INSERT, SELECT, UPDATE, DELETE
  - Basic WHERE clauses
  - Bearer token authentication
  - AES-256-GCM encryption

---

## Support

- Issues: https://github.com/yourname/xdb/issues
- Documentation: See README.md
- Examples: See examples/usage.js
