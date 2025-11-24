# XDB Documentation Index

Complete documentation for the XDB file-based database system.

## Quick Links

### Getting Started
- **[QUICK_START.md](./QUICK_START.md)** - Start here! 5-minute quick start guide
- **[README.md](./README.md)** - Complete project overview and features

### Using XDB
- **[API_REFERENCE.md](./API_REFERENCE.md)** - Complete API documentation with examples
- **[examples/usage.js](./examples/usage.js)** - 19-step working example code

### Deployment
- **[DEPLOYING_TO_VERCEL.md](./DEPLOYING_TO_VERCEL.md)** - Step-by-step Vercel deployment guide

### Technical Details
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design
- **[PROJECT_COMPLETION_SUMMARY.md](./PROJECT_COMPLETION_SUMMARY.md)** - What was built and statistics

---

## Documentation Overview

### Level 1: Getting Started (15 minutes)

**New to XDB?** Start here:

1. Read **[QUICK_START.md](./QUICK_START.md)** (15 min)
   - Installation and setup
   - Your first API calls
   - Basic operations
   - Common queries

2. Run the development server:
   ```bash
   npm install
   npm run dev
   ```

3. Test with provided examples

### Level 2: Using XDB (30 minutes)

**Ready to build?** Read these:

1. **[API_REFERENCE.md](./API_REFERENCE.md)** (30 min)
   - All endpoints documented
   - Request/response formats
   - SQL examples
   - Error codes
   - Language-specific examples

2. **[examples/usage.js](./examples/usage.js)**
   - Complete working example
   - All major operations
   - Ready to run

### Level 3: Deployment (1 hour)

**Ready for production?** Follow this:

1. **[DEPLOYING_TO_VERCEL.md](./DEPLOYING_TO_VERCEL.md)** (1 hour)
   - Prerequisites
   - Step-by-step deployment
   - Environment configuration
   - Custom domain setup
   - Troubleshooting

### Level 4: Technical Deep Dive (2 hours)

**Need to understand internals?** Read these:

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** (1.5 hours)
   - Project structure
   - Class hierarchy
   - Data flow
   - Encryption details
   - SQL execution process
   - Performance characteristics

2. **Source code** (30 min)
   - Read TypeScript files in `src/lib/`
   - Review test file: `src/__tests__/xdb.test.ts`
   - Check API routes: `src/app/api/xdb/`

### Reference: Project Summary (15 minutes)

**Need an overview?** Read this:

- **[PROJECT_COMPLETION_SUMMARY.md](./PROJECT_COMPLETION_SUMMARY.md)**
  - What was built
  - Feature matrix
  - Statistics
  - Known limitations

---

## File Structure

```
xdb/
├── Documentation/
│   ├── QUICK_START.md                    # ← Start here!
│   ├── README.md                         # Full overview
│   ├── API_REFERENCE.md                  # API documentation
│   ├── ARCHITECTURE.md                   # Technical details
│   ├── DEPLOYING_TO_VERCEL.md            # Deployment guide
│   ├── PROJECT_COMPLETION_SUMMARY.md     # Project overview
│   └── DOCUMENTATION_INDEX.md            # This file
│
├── Source Code/
│   ├── src/lib/
│   │   ├── crypto.ts                     # Encryption system
│   │   ├── types.ts                      # Type definitions
│   │   ├── XdbQueryRunner.ts             # SQL executor
│   │   ├── XdbEngine.ts                  # Database engine
│   │   ├── XdbFile.ts                    # File I/O
│   │   ├── XdbPersistence.ts             # Persistence layer
│   │   ├── middleware.ts                 # Authentication
│   │   └── xdbInstance.ts                # Global singleton
│   │
│   ├── src/app/api/xdb/
│   │   ├── route.ts                      # GET /api/xdb
│   │   ├── databases/route.ts            # GET/PUT /api/xdb/databases
│   │   └── databases/[dbName]/           # Database operations
│   │       ├── route.ts                  # GET/PUT/POST/DELETE
│   │       └── [tableName]/route.ts      # Table operations
│   │
│   ├── src/__tests__/
│   │   └── xdb.test.ts                   # Unit tests (22 tests)
│   │
│   ├── examples/
│   │   └── usage.js                      # Working example
│
├── Configuration/
│   ├── .env.local                        # Development config
│   ├── .env.example                      # Configuration template
│   ├── jest.config.js                    # Test configuration
│   ├── next.config.ts                    # Next.js config
│   ├── tsconfig.json                     # TypeScript config
│   └── package.json                      # Dependencies
```

---

## Quick Command Reference

### Development

```bash
# Installation
npm install

# Development server (localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

### Testing

```bash
# Run all tests once
npm test

# Watch mode (rerun on changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Utilities

```bash
# Type check
npx tsc --noEmit

# Format code (if configured)
npm run format

# Lint (if configured)
npm run lint
```

---

## API Overview

### Database Operations

```
GET    /api/xdb/databases                 List all databases
PUT    /api/xdb/databases                 Create database
GET    /api/xdb/databases/{dbName}        Get database info
PUT    /api/xdb/databases/{dbName}        Rename database
POST   /api/xdb/databases/{dbName}        Execute SQL query
DELETE /api/xdb/databases/{dbName}        Delete database
```

### Table Operations

```
PUT    /api/xdb/databases/{dbName}/{tableName}   Create table
GET    /api/xdb/databases/{dbName}/{tableName}   Get table data
POST   /api/xdb/databases/{dbName}/{tableName}   Insert/update rows
DELETE /api/xdb/databases/{dbName}/{tableName}   Delete rows/drop table
```

All endpoints require: `Authorization: Bearer {AUTH_TOKEN}`

See [API_REFERENCE.md](./API_REFERENCE.md) for complete details.

---

## SQL Support

### Supported Operations

- ✅ **SELECT** - With WHERE, ORDER BY, LIMIT
- ✅ **INSERT** - Single and batch rows
- ✅ **UPDATE** - With WHERE filtering
- ✅ **DELETE** - With optional WHERE
- ✅ **CREATE TABLE** - With columns and constraints
- ✅ **DROP TABLE** - Remove entire table

### WHERE Operators

- ✅ `=` `>` `<` `>=` `<=` `!=` `<>`
- ✅ `LIKE` for pattern matching
- ✅ `IN` for value lists
- ✅ `IS NULL` for null checks
- ✅ `AND` `OR` for logic

See [API_REFERENCE.md](./API_REFERENCE.md#where-clause-operators) for examples.

---

## Environment Configuration

### Required Variables

```env
AUTH_TOKEN = <64-char-hex-token>
XDB_ENCRYPTION_KEY = <64-char-hex-key>
```

### Optional Variables

```env
MAX_DATABASE_SIZE = 104857600        # Default: 100MB
XDB_DATA_DIR = /tmp/xdb              # Default: /tmp/xdb
```

### Generate Secure Values

```bash
# Encryption key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Auth token (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

See [DEPLOYING_TO_VERCEL.md](./DEPLOYING_TO_VERCEL.md#step-3-configure-environment-variables) for Vercel setup.

---

## Common Tasks

### Create a Database

```bash
TOKEN="your-token"
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "mydb"}' \
  http://localhost:3000/api/xdb/databases
```

### Create a Table

```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "columns": [
      {"name": "id", "type": "INTEGER", "primaryKey": true, "notNull": true},
      {"name": "name", "type": "TEXT", "notNull": true}
    ]
  }' \
  http://localhost:3000/api/xdb/databases/mydb/users
```

### Insert Data

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "insert",
    "rows": [
      {"id": 1, "name": "Alice"},
      {"id": 2, "name": "Bob"}
    ]
  }' \
  http://localhost:3000/api/xdb/databases/mydb/users
```

### Query Data

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users WHERE id > 1"}' \
  http://localhost:3000/api/xdb/databases/mydb
```

See [QUICK_START.md](./QUICK_START.md) for more examples.

---

## Troubleshooting

### Port Already in Use

```bash
npm run dev -- -p 3001
```

### Tests Failing

```bash
npm test -- --clearCache
npm test
```

### Build Errors

```bash
npx tsc --noEmit        # Check TypeScript errors
npm install             # Ensure dependencies installed
npm run build           # Try building again
```

### API Not Responding

1. Check development server is running: `npm run dev`
2. Verify token in Authorization header
3. Check port is correct (default: 3000)
4. Review error response message

See [DEPLOYING_TO_VERCEL.md#troubleshooting](./DEPLOYING_TO_VERCEL.md#troubleshooting) for more.

---

## Feature Matrix

### SQL Operations

| Feature | Status | Reference |
|---------|--------|-----------|
| CREATE TABLE | ✅ | [API_REFERENCE.md](./API_REFERENCE.md#put-apixdbdatabasesdbnamtablename) |
| DROP TABLE | ✅ | [API_REFERENCE.md](./API_REFERENCE.md#delete-apixdbdatabasesdbnamtablename) |
| INSERT | ✅ | [API_REFERENCE.md](./API_REFERENCE.md#post-apixdbdatabasesdbnamtablename) |
| SELECT | ✅ | [API_REFERENCE.md](./API_REFERENCE.md#sql-queries) |
| UPDATE | ✅ | [API_REFERENCE.md](./API_REFERENCE.md#sql-queries) |
| DELETE | ✅ | [API_REFERENCE.md](./API_REFERENCE.md#sql-queries) |
| WHERE | ✅ | [API_REFERENCE.md](./API_REFERENCE.md#where-clause-operators) |
| ORDER BY | ✅ | [API_REFERENCE.md](./API_REFERENCE.md#sql-queries) |
| LIMIT | ✅ | [API_REFERENCE.md](./API_REFERENCE.md#sql-queries) |
| Transactions | ❌ | [ARCHITECTURE.md](./ARCHITECTURE.md#supported-operations) |
| JOIN | ❌ | [ARCHITECTURE.md](./ARCHITECTURE.md#supported-operations) |
| Aggregate | ❌ | [ARCHITECTURE.md](./ARCHITECTURE.md#supported-operations) |

### Security Features

| Feature | Status | Reference |
|---------|--------|-----------|
| Encryption | ✅ | [ARCHITECTURE.md](./ARCHITECTURE.md#encryption-architecture) |
| Authentication | ✅ | [API_REFERENCE.md](./API_REFERENCE.md#authentication) |
| HTTPS | ✅ | [DEPLOYING_TO_VERCEL.md](./DEPLOYING_TO_VERCEL.md) |
| Key Derivation | ✅ | [ARCHITECTURE.md](./ARCHITECTURE.md#key-derivation-argon2id--scrypt) |
| Auth Tag | ✅ | [ARCHITECTURE.md](./ARCHITECTURE.md#algorithm-aes-256-gcm) |
| Rate Limiting | ❌ | [DEPLOYING_TO_VERCEL.md](./DEPLOYING_TO_VERCEL.md#rate-limiting) |

---

## Support

### Documentation
- Start with [QUICK_START.md](./QUICK_START.md) for setup
- Check [API_REFERENCE.md](./API_REFERENCE.md) for endpoints
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- See [DEPLOYING_TO_VERCEL.md](./DEPLOYING_TO_VERCEL.md) for deployment

### Code
- Check [examples/usage.js](./examples/usage.js) for working code
- Review tests in [src/__tests__/xdb.test.ts](./src/__tests__/xdb.test.ts)
- Examine source in [src/lib/](./src/lib/) for implementation

### External Help
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

## Project Status

- ✅ **Development**: Complete
- ✅ **Testing**: 22/22 tests passing
- ✅ **Documentation**: Comprehensive
- ✅ **Deployment**: Ready for Vercel
- ✅ **Production**: Ready for use

**Version**: 1.0.0  
**Last Updated**: 2024-01-15

---

## Quick Navigation

| Need | Read |
|------|------|
| Quick overview | [README.md](./README.md) |
| Get started now | [QUICK_START.md](./QUICK_START.md) |
| Use the API | [API_REFERENCE.md](./API_REFERENCE.md) |
| Deploy to production | [DEPLOYING_TO_VERCEL.md](./DEPLOYING_TO_VERCEL.md) |
| Understand internals | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| See what was built | [PROJECT_COMPLETION_SUMMARY.md](./PROJECT_COMPLETION_SUMMARY.md) |
| Find documentation | [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) (this file) |

---

**Happy coding!** 🚀

Start with [QUICK_START.md](./QUICK_START.md) if you're new to XDB.
