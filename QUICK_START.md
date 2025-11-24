# XDB Quick Start Guide

Get up and running with XDB in 5 minutes.

## Prerequisites

- Node.js 18+ and npm 9+
- A text editor or IDE
- Terminal/command line

## Installation

### 1. Clone or Download XDB

```bash
# Clone repository
git clone https://github.com/yourname/xdb.git
cd xdb

# Or if you have the files already
cd /path/to/xdb
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- `next` - Web framework
- `typescript` - Type safety
- `argon2` - Key derivation
- `jest` - Testing framework

### 3. Configure Environment

```bash
# Copy example configuration
cp .env.example .env.local

# Edit with your values (or use defaults for development)
# Default .env.local already has test values
```

### 4. Start Development Server

```bash
npm run dev
```

Output:
```
> xdb@1.0.0 dev
> next dev

▲ Next.js 16.0.3
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in 2.1s
```

## Your First API Call

### 1. Test Authentication

```bash
# Extract your AUTH_TOKEN from .env.local
TOKEN="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Test the API
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/xdb/databases
```

Expected response:
```json
{
  "status": "ok",
  "data": {
    "databases": []
  },
  "elapsed_seconds": 0.023
}
```

### 2. Create a Database

```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "demo"}' \
  http://localhost:3000/api/xdb/databases
```

Response:
```json
{
  "status": "ok",
  "data": {
    "message": "Database created successfully",
    "database": {
      "name": "demo",
      "tables": []
    }
  },
  "elapsed_seconds": 0.045
}
```

### 3. Create a Table

```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "columns": [
      {"name": "id", "type": "INTEGER", "primaryKey": true, "notNull": true},
      {"name": "name", "type": "TEXT", "notNull": true},
      {"name": "email", "type": "TEXT"}
    ]
  }' \
  http://localhost:3000/api/xdb/databases/demo/users
```

### 4. Insert Data

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "insert",
    "rows": [
      {"id": 1, "name": "Alice", "email": "alice@example.com"},
      {"id": 2, "name": "Bob", "email": "bob@example.com"},
      {"id": 3, "name": "Charlie", "email": "charlie@example.com"}
    ]
  }' \
  http://localhost:3000/api/xdb/databases/demo/users
```

### 5. Query Data

```bash
# Get all users
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users"}' \
  http://localhost:3000/api/xdb/databases/demo
```

Response:
```json
{
  "status": "ok",
  "data": {
    "rows": [
      {"id": 1, "name": "Alice", "email": "alice@example.com"},
      {"id": 2, "name": "Bob", "email": "bob@example.com"},
      {"id": 3, "name": "Charlie", "email": "charlie@example.com"}
    ],
    "rowsAffected": 3
  },
  "elapsed_seconds": 0.032
}
```

### 6. Filter with WHERE

```bash
# Get users with ID > 1
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users WHERE id > 1"}' \
  http://localhost:3000/api/xdb/databases/demo
```

Response:
```json
{
  "status": "ok",
  "data": {
    "rows": [
      {"id": 2, "name": "Bob", "email": "bob@example.com"},
      {"id": 3, "name": "Charlie", "email": "charlie@example.com"}
    ],
    "rowsAffected": 2
  },
  "elapsed_seconds": 0.028
}
```

## Using JavaScript/Node.js

Create `test.js`:

```javascript
const TOKEN = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const API = 'http://localhost:3000/api/xdb';

async function api(method, path, body) {
  const url = `${API}${path}`;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(url, opts);
  return res.json();
}

async function main() {
  // List databases
  console.log('1. List databases:');
  let result = await api('GET', '/databases');
  console.log(result.data.databases);
  
  // Create database
  console.log('\n2. Create database:');
  result = await api('PUT', '/databases', {name: 'app'});
  console.log(result.data.message);
  
  // Create table
  console.log('\n3. Create table:');
  result = await api('PUT', '/databases/app/users', {
    columns: [
      {name: 'id', type: 'INTEGER', primaryKey: true, notNull: true},
      {name: 'name', type: 'TEXT', notNull: true}
    ]
  });
  console.log(result.data.message);
  
  // Insert data
  console.log('\n4. Insert data:');
  result = await api('POST', '/databases/app/users', {
    operation: 'insert',
    rows: [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}]
  });
  console.log(`Inserted ${result.data.rowsAffected} rows`);
  
  // Query
  console.log('\n5. Query:');
  result = await api('POST', '/databases/app', {
    query: 'SELECT * FROM users WHERE id = 1'
  });
  console.log(result.data.rows);
}

main().catch(console.error);
```

Run it:

```bash
node test.js
```

## Using Python

Create `test.py`:

```python
import requests
import json

TOKEN = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
API = 'http://localhost:3000/api/xdb'

headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

def api(method, path, body=None):
    url = f'{API}{path}'
    if method == 'GET':
        return requests.get(url, headers=headers).json()
    elif method == 'PUT':
        return requests.put(url, headers=headers, json=body).json()
    elif method == 'POST':
        return requests.post(url, headers=headers, json=body).json()
    elif method == 'DELETE':
        return requests.delete(url, headers=headers, json=body).json()

# List databases
print('1. List databases:')
result = api('GET', '/databases')
print(result['data']['databases'])

# Create database
print('\n2. Create database:')
result = api('PUT', '/databases', {'name': 'app'})
print(result['data']['message'])

# Create table
print('\n3. Create table:')
result = api('PUT', '/databases/app/users', {
    'columns': [
        {'name': 'id', 'type': 'INTEGER', 'primaryKey': True, 'notNull': True},
        {'name': 'name', 'type': 'TEXT', 'notNull': True}
    ]
})
print(result['data']['message'])

# Insert data
print('\n4. Insert data:')
result = api('POST', '/databases/app/users', {
    'operation': 'insert',
    'rows': [{'id': 1, 'name': 'Alice'}, {'id': 2, 'name': 'Bob'}]
})
print(f"Inserted {result['data']['rowsAffected']} rows")

# Query
print('\n5. Query:')
result = api('POST', '/databases/app', {
    'query': 'SELECT * FROM users WHERE id = 1'
})
print(result['data']['rows'])
```

Run it:

```bash
pip install requests
python test.py
```

## Running Tests

XDB includes 22 unit tests:

```bash
# Run all tests
npm test

# Watch mode (rerun on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Expected output:
```
PASS  src/__tests__/xdb.test.ts
  ✓ Database operations
  ✓ Table operations
  ✓ Query execution
  ...
  
Test Suites: 1 passed, 1 total
Tests: 22 passed, 22 total
```

## Common Operations

### Update Data

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "update",
    "row": {"name": "Alice Updated"},
    "where": "id = 1"
  }' \
  http://localhost:3000/api/xdb/databases/demo/users
```

### Delete Data

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "delete",
    "where": "id = 3"
  }' \
  http://localhost:3000/api/xdb/databases/demo/users
```

### Drop Table

```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"drop": true}' \
  http://localhost:3000/api/xdb/databases/demo/users
```

### Delete Database

```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/xdb/databases/demo
```

## SQL Queries

### SELECT

```sql
-- All columns
SELECT * FROM users

-- Specific columns
SELECT id, name FROM users

-- With WHERE
SELECT * FROM users WHERE id > 1

-- With ORDER BY and LIMIT
SELECT * FROM users ORDER BY name ASC LIMIT 10

-- Complex WHERE
SELECT * FROM users WHERE id > 1 AND email LIKE '%@example.com'
```

### WHERE Operators

```sql
= 	Equal:        WHERE age = 25
> 	Greater:      WHERE age > 25
< 	Less:         WHERE age < 25
>= 	Greater or equal: WHERE age >= 25
<= 	Less or equal: WHERE age <= 25
!= 	Not equal:    WHERE age != 25
<> 	Not equal:    WHERE age <> 25
LIKE 	Pattern:      WHERE email LIKE '%@example.com'
IN 	List:         WHERE id IN (1, 2, 3)
IS NULL 	Null check: WHERE phone IS NULL
AND 	Logical AND:  WHERE age > 25 AND city = 'NYC'
OR 	Logical OR:   WHERE age > 25 OR age < 18
```

## Deployment to Vercel

Once you're ready to deploy:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial XDB deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Visit https://vercel.com/import
   - Select your GitHub repository
   - Click "Import"

3. **Configure Environment Variables**
   - In Vercel Dashboard: Project Settings → Environment Variables
   - Add: `AUTH_TOKEN`, `XDB_ENCRYPTION_KEY`, `MAX_DATABASE_SIZE`, `XDB_DATA_DIR`

4. **Deploy**
   - Automatic deploy on push to main
   - Or manual: `vercel --prod`

See [DEPLOYING_TO_VERCEL.md](./DEPLOYING_TO_VERCEL.md) for detailed instructions.

## Documentation

- **API Reference**: See [API_REFERENCE.md](./API_REFERENCE.md)
- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Deployment**: See [DEPLOYING_TO_VERCEL.md](./DEPLOYING_TO_VERCEL.md)
- **README**: See [README.md](./README.md)

## Troubleshooting

### Port Already in Use

```bash
# Use different port
npm run dev -- -p 3001
```

### Clear Cache

```bash
# Remove Next.js cache
rm -rf .next
npm run dev
```

### Reset Data

```bash
# Clear all databases
rm -rf /tmp/xdb
npm run dev
```

## Next Steps

1. **Create your first database** - Follow the steps above
2. **Run the tests** - Verify everything works: `npm test`
3. **Read the API docs** - See [API_REFERENCE.md](./API_REFERENCE.md)
4. **Deploy to Vercel** - Follow [DEPLOYING_TO_VERCEL.md](./DEPLOYING_TO_VERCEL.md)
5. **Secure your keys** - Generate new tokens before production

## Getting Help

- Check the [README.md](./README.md) for comprehensive documentation
- Review [API_REFERENCE.md](./API_REFERENCE.md) for endpoint details
- See examples in `examples/usage.js`
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for internal details

## Command Reference

```bash
npm install           # Install dependencies
npm run dev          # Start dev server (port 3000)
npm run build        # Build for production
npm run start        # Start production server
npm test             # Run tests once
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run lint         # Check TypeScript
npx tsc --noEmit     # Type check
```

---

**Happy coding!** 🚀

For more information, see the full documentation in [README.md](./README.md).
