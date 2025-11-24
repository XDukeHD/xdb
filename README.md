# xDB - A Database que responde a SQL feita na base da preguiça
## Fala, meus amigos que visitam meu GitHub! (Portuenglish Edition)

An... por algum motivo alguém está olhando meu GitHub? Whatever! (Com um sorriso sarcástico, claro).

Se você está olhando esse projeto, é porque algo te chamou a atenção, não? Bem, eu estava de boa aqui, fazendo um pequeno projetinho de CDN de filmes, e como sou sovina o suficiente para não pagar uma database MySQL, eu pensei: "Como eu uso uma DB no meu projeto de graça?".

E voilà! Conheça o xDB.

### Why Next.js?

Pelo simples fato de com um clique, eu posso dar deploy na Vercel e estar ready to use sem fazer nada. É claro que eu podia adaptar com vercel.config ou outros métodos but eu estava entediado de madrugada e queria fazer isso anyway.

E sim, foi, claro, feito usando IA. Afinal, eu não ia perder muito tempo em algo que um simples R$9,90 na UOL Host não resolveria minha vida com um MySQL. Mas foi divertido fazer isso, e é claro que vou usar para um Car#### daqui para a frente, porque eu não vou gastar money, e isso funciona bem para mim!

Eventualmente, eu vou atualizar ele para manter seu running (para mim, obviamente). A web interface para testes está péssima, mas usável, e é o que me importa.

Eu também fiz um NPM package para integrar facilmente com meus projetos. Aqui está o link: //TODO: COLOCAR LINK AQUI.

**And that's all!**

Se gostar dessa maluquice feita com AI, deixe uma star ali no topo. Não custa nada e seu dedo não vai cair. Antes que alguém me critique sobre usar IA: eu gosto de IA e sou enthusiast de IA. Sempre busco usá-la da melhor forma, até para me ajudar nos meus personal projects.

**A IA não é a villain, baby!**

Agora sim, fiquem com uma descrição do xDB, que por sinal está em inglês, porém nada que um google tradutor não resolve, né? quem mandou perder a ofensiva no Duolingo...

---
# xDB v1.1.0 Release Notes

## FeaturesFirst, run the development server:



- **SQL-Compatible API**: Support for SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, DROP TABLE operations```bash

- **Encrypted Storage**: AES-256-GCM encryption with Argon2 key derivationnpm run dev

- **Atomic Writes**: Write-ahead log pattern with atomic file replacement to prevent corruption# or

- **Authentication**: Bearer token authorization on all endpointsyarn dev

- **TypeScript**: Fully typed codebase# or

- **Comprehensive Tests**: Unit and integration tests includedpnpm dev

- **Vercel Ready**: Deployable directly to Vercel with environment configuration# or

- **No CORS Restrictions**: All endpoints support cross-origin requestsbun dev

- **Audit Trail**: Transaction logging for all operations```

- **Indexing Support**: Primary key and custom index support

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Quick Start

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

```bash

# Install dependenciesThis project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

npm install

## Learn More

# Create environment file

cp .env.example .env.localTo learn more about Next.js, take a look at the following resources:



# Generate encryption key (update .env.local)- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.



# Run development serverYou can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

npm run dev

## Deploy on Vercel

# Run tests

npm testThe easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

```

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Visit `http://localhost:3000/api/xdb/databases` with Authorization header to test.

## Environment Configuration

Create `.env.local`:

```env
# Required: 64-character hex string (32 bytes) for AES-256 encryption
XDB_ENCRYPTION_KEY=<generate-with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Required: Bearer token for API authentication
AUTH_TOKEN=<secure-random-token>

# Optional: Maximum database size in bytes (default: 104857600 = 100MB)
MAX_DATABASE_SIZE=104857600

# Optional: Data directory for .xdb files (default: /tmp/xdb)
XDB_DATA_DIR=/path/to/data
```

## API Endpoints

All endpoints require: `Authorization: Bearer <AUTH_TOKEN>`

### Database Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/xdb/databases` | List all databases |
| PUT | `/api/xdb/databases` | Create database (JSON body: `{name: "dbname"}`) |
| DELETE | `/api/xdb/databases/{dbName}` | Delete database |

### Table Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/xdb/databases/{dbName}` | List tables |
| PUT | `/api/xdb/databases/{dbName}/{tableName}` | Create table (SQL body) |
| DELETE | `/api/xdb/databases/{dbName}/{tableName}` | Drop table |
| GET | `/api/xdb/databases/{dbName}/{tableName}` | Get table schema or execute SELECT |

### Data Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/xdb/databases/{dbName}/{tableName}` | SELECT query (SQL in body) |
| POST | `/api/xdb/databases/{dbName}/{tableName}` | INSERT/UPDATE/DELETE (SQL in body) |

### Example cURL Commands

```bash
# Set variables
TOKEN="your-secure-token"
API="http://localhost:3000/api/xdb"

# List databases
curl -H "Authorization: Bearer $TOKEN" \
  "$API/databases"

# Create database
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"mydb"}' \
  "$API/databases"

# Create table
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: text/plain" \
  -d 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)' \
  "$API/databases/mydb/users"

# Insert data
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: text/plain" \
  -d "INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)" \
  "$API/databases/mydb/users"

# Query data
curl -H "Authorization: Bearer $TOKEN" \
  -d "SELECT * FROM users WHERE age > 25" \
  "$API/databases/mydb/users"

# Update data
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: text/plain" \
  -d "UPDATE users SET age = 31 WHERE id = 1" \
  "$API/databases/mydb/users"

# Delete rows
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: text/plain" \
  -d "DELETE FROM users WHERE age < 18" \
  "$API/databases/mydb/users"
```

## SQL Support

### Data Types
- `INTEGER` - 32-bit integer
- `TEXT` - UTF-8 text
- `REAL` - Floating point
- `BLOB` - Binary data

### Supported Statements

**DDL:**
- `CREATE TABLE table_name (columns)` with PRIMARY KEY, NOT NULL, DEFAULT
- `DROP TABLE table_name`

**DML:**
- `INSERT INTO table (cols) VALUES (vals)`
- `SELECT [cols] FROM table [WHERE] [ORDER BY] [LIMIT]`
- `UPDATE table SET col=val [WHERE]`
- `DELETE FROM table [WHERE]`

**WHERE Operators:**
- Comparison: `=`, `>`, `<`, `>=`, `<=`, `!=`, `<>`
- Pattern: `LIKE`, `IN`, `IS NULL`
- Logic: `AND`, `OR`

### Unsupported Features
- Joins, Subqueries, Transactions
- Views, Triggers, Stored Procedures
- Foreign Keys, AUTO_INCREMENT
- Window Functions, CTEs

## JavaScript Client Examples

```javascript
const API = 'http://localhost:3000/api/xdb';
const TOKEN = 'your-token';

// Create database
async function createDB(name) {
  const res = await fetch(`${API}/databases`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

// Create table
async function createTable(db, table, sql) {
  const res = await fetch(`${API}/databases/${db}/${table}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${TOKEN}` },
    body: sql,
  });
  return res.json();
}

// Insert
async function insert(db, table, sql) {
  const res = await fetch(`${API}/databases/${db}/${table}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}` },
    body: sql,
  });
  return res.json();
}

// Select
async function select(db, table, query) {
  const res = await fetch(`${API}/databases/${db}/${table}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${TOKEN}` },
    body: query,
  });
  return res.json();
}

// Example usage
(async () => {
  await createDB('app');
  await createTable('app', 'users', 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
  await insert('app', 'users', "INSERT INTO users (id, name) VALUES (1, 'Alice')");
  const result = await select('app', 'users', 'SELECT * FROM users');
  console.log(result.data);
})();
```

## Deployment to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Initial XDB"
git push
```

### 2. Import to Vercel
- Visit vercel.com/import
- Select repository
- Click Import

### 3. Add Environment Variables
In Vercel project settings:

```
XDB_ENCRYPTION_KEY = <64-char hex string>
AUTH_TOKEN = <secure token>
```

### 4. Deploy
- Push to main (automatic)
- Or click Deploy in dashboard

**Note**: Default setup uses ephemeral storage. For persistent data in production, configure:
- Vercel KV (recommended)
- External database (Postgres, MongoDB)
- Object storage (S3, GCS)

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

Test coverage includes:
- Database CRUD operations
- Table creation/deletion
- DML operations (INSERT, SELECT, UPDATE, DELETE)
- WHERE clause evaluation
- Query parsing

## Architecture

### File Structure
- **Core Engine**: `XdbEngine.ts` - Database/table management
- **Query Runner**: `XdbQueryRunner.ts` - SQL execution
- **Persistence**: `XdbFile.ts` - Encryption & atomic writes
- **API Layer**: `/app/api/xdb/` - Next.js route handlers
- **Crypto**: `crypto.ts` - AES-256-GCM with Argon2

### Encryption
- **Algorithm**: AES-256-GCM
- **Key Derivation**: Argon2id + scrypt
- **Nonce**: 128-bit random per encryption
- **Auth Tag**: 128-bit authenticated encryption

### Storage
- Each database: Single `.xdb` file (encrypted JSON)
- Atomic writes: Temp file + rename (no corruption)
- No row-level locking (serverless compatible)
- Entire DB loaded into memory

## Performance

Typical timings (1000-row table, Vercel Hobby):
- INSERT: ~8ms per row
- SELECT: ~45ms for full scan
- UPDATE: ~1ms per row
- DELETE: ~1ms per row

Limits:
- Max DB size: 100MB (configurable)
- Max Vercel memory: 50MB-3GB (based on plan)
- Request timeout: 25-60s

## Security Best Practices

1. **Generate strong tokens**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. **Use HTTPS only** in production
3. **Rotate keys** periodically
4. **Secure .env** - never commit to git
5. **Back up .xdb files** regularly
6. **Implement rate limiting** for Vercel
7. **Validate input** on client side

## Error Handling

Responses use standard HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request (invalid SQL, missing body)
- `401` - Unauthorized (invalid token)
- `404` - Not found (DB/table doesn't exist)
- `409` - Conflict (already exists)
- `500` - Server error

Error response format:
```json
{
  "status": "error",
  "error": "Detailed error message"
}
```

## Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Format code
npm run lint
```

## Limitations & Tradeoffs

| Feature | Status | Notes |
|---------|--------|-------|
| Joins | ❌ | Not implemented - use multiple queries |
| Transactions | ❌ | Atomic at DB level, not query level |
| Indexes | ⚠️ | Supported in schema, not optimized |
| Concurrency | ⚠️ | Single-writer, serverless-friendly |
| Query optimization | ❌ | Full table scan for all queries |
| Auto-increment | ❌ | Use explicit IDs |

## Troubleshooting

**"Missing Authorization header"**
- Add `Authorization: Bearer <TOKEN>` to all requests

**"Database does not exist"**
- Create database first with PUT /api/xdb/databases

**Slow queries**
- Large WHERE clauses on big tables
- Consider indexing (future) or query caching
- Split data across databases

**Data lost after Vercel redeploy**
- Using ephemeral `/tmp` storage
- Configure persistent storage for production
- Use Vercel KV or external database

## License

MIT

## Next Steps / Algumas coisas que se eu lembrar e tiver paciencia eu faço depois

- [ ] Implement JOIN support
- [ ] Add query optimization
- [ ] Implement transactions (ACID)
- [ ] Add prepared statements
- [ ] Create query builder library
- [ ] Add admin dashboard

## Support

- Documentation: Full API docs at `/api/xdb`
- Issues: GitHub Issues
- Examples: See `curl` commands above
- Don't have, se vira nos 30 baby
- Na minha máquina funciona, então tchau e bença

---

Built with Next.js, TypeScript, and Node.js crypto. Ready for production on Vercel.
