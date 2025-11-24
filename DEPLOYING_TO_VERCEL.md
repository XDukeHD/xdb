# Deploying XDB to Vercel

Complete guide for deploying the XDB file-based database system to Vercel.

## Prerequisites

- GitHub/GitLab/Bitbucket repository with XDB code
- Vercel account (create at https://vercel.com)
- Node.js project with TypeScript and Next.js
- Environment variables configured

## Step-by-Step Deployment

### 1. Prepare Your Repository

```bash
# Navigate to project root
cd xdb

# Ensure all code is committed
git add .
git commit -m "Deploy XDB to Vercel"

# Push to remote repository
git push origin main
```

### 2. Create Vercel Account and Connect Repository

**Option A: Import from Git Provider**

1. Visit https://vercel.com/import
2. Select your Git provider (GitHub, GitLab, or Bitbucket)
3. Authorize Vercel to access your repositories
4. Select the `xdb` repository
5. Click "Import"

**Option B: Install Vercel CLI**

```bash
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd /path/to/xdb
vercel
```

### 3. Configure Environment Variables

After importing your project to Vercel:

1. Go to your Vercel Dashboard
2. Select your XDB project
3. Click "Settings"
4. Go to "Environment Variables"
5. Add the following variables for each environment (Production, Preview, Development):

```
XDB_ENCRYPTION_KEY = 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
AUTH_TOKEN = your-secure-random-token-here
MAX_DATABASE_SIZE = 104857600
XDB_DATA_DIR = /tmp/xdb
```

**Generating Secure Values:**

```bash
# Generate encryption key (64 hex characters = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate auth token  
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Deploy the Project

The project will automatically deploy when you push to your `main` branch.

**Manual Deployment (Optional):**

```bash
vercel --prod
```

### 5. Verify Deployment

After deployment completes:

1. Note the deployment URL (e.g., `https://xdb-xxxxx.vercel.app`)
2. Test the API:

```bash
# Get your AUTH_TOKEN from Vercel settings
TOKEN="your-secure-token"
API_URL="https://xdb-xxxxx.vercel.app/api/xdb"

# Test database listing
curl -H "Authorization: Bearer $TOKEN" \
  "$API_URL/databases"

# Expected response:
# {"status":"ok","data":{"databases":[]},"elapsed_seconds":0.045}
```

## Storage Configuration for Production

### Important: Ephemeral Storage ⚠️

By default, Vercel serverless functions use ephemeral `/tmp` storage:

- **Data persists**: During the deployment lifetime
- **Data is lost**: On redeploy, scale down, or cold start
- **Use case**: Development, testing, temporary caches

### Recommended: Persistent Storage

For production with data persistence, choose one:

#### Option 1: Vercel KV (Recommended for Vercel)

**Setup:**

1. In Vercel Dashboard, go to Storage tab
2. Click "Create Database"
3. Select "KV Database"  
4. Select a region (e.g., us-east-1)
5. Name it "xdb-storage"
6. Environment variables are automatically added

**Modify XDB Code:**

Update `src/lib/xdbInstance.ts` to use Vercel KV:

```typescript
import { kv } from '@vercel/kv';

export async function initializeXdb(): Promise<void> {
  // ... existing code ...

  // Store .xdb files in Vercel KV
  const dataDir = 'vercel-kv'; // Special marker
  xdbPersistence = new XdbPersistence(xdbEngine, dataDir, encryptionKey, maxDbSize);
}
```

Then modify `src/lib/XdbPersistence.ts` to use KV for storage.

#### Option 2: AWS S3 or Cloudflare R2

**Setup:**

1. Create S3 bucket or Cloudflare R2 account
2. Add credentials to Vercel environment variables:

```
AWS_ACCESS_KEY_ID = xxx
AWS_SECRET_ACCESS_KEY = xxx
AWS_REGION = us-east-1
AWS_S3_BUCKET = xdb-storage
```

Or for Cloudflare:

```
R2_ACCOUNT_ID = xxx
R2_ACCESS_KEY = xxx
R2_SECRET_KEY = xxx
R2_BUCKET_NAME = xdb-storage
```

**Update XDB:**

Modify persistence layer to use S3/R2 instead of local filesystem.

#### Option 3: External Database (Postgres/MongoDB)

Store encrypted `.xdb` files as binary blobs:

```
DATABASE_URL = postgresql://user:pass@host/xdb_db
# or
MONGODB_URI = mongodb+srv://user:pass@cluster.mongodb.net/xdb_db
```

## Performance Optimization

### Reduce Cold Start Time

**Exclude unnecessary files:**

Create `.vercelignore`:

```
node_modules
.git
.next/cache
src/__tests__
examples
```

**Update next.config.ts:**

```typescript
export default {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  cleanDistDir: true,
};
```

### Database Size Limits

By default, Vercel functions have:
- Memory: 50MB (Hobby) to 3GB (Pro)
- Execution time: 25-60 seconds

**For databases > 50MB:**
- Use Pro or Enterprise plan
- Or split into multiple smaller databases
- Or use external storage (S3, KV)

### Caching Strategy

Add cache headers in API responses:

```typescript
export async function GET(request: NextRequest) {
  const response = createSuccessResponse(data, elapsed);
  response.headers.set('Cache-Control', 'private, max-age=60');
  return response;
}
```

## Domain Configuration

### Add Custom Domain

1. In Vercel project settings
2. Go to "Domains"
3. Click "Add"
4. Enter your domain (e.g., `db.example.com`)
5. Follow DNS configuration instructions
6. Wait for SSL certificate (usually < 5 minutes)

### Environment-Specific URLs

- **Production**: `https://xdb.example.com`
- **Preview**: `https://xdb-pr-123.example.com`
- **Development**: `http://localhost:3000`

## Monitoring & Debugging

### View Logs

```bash
# Install Vercel CLI if not already done
npm i -g vercel

# Stream logs for your project
vercel logs --follow

# View specific deployment logs
vercel logs [deployment-id]
```

### Monitor Performance

In Vercel Dashboard > Deployments:
- Response times
- Request count
- Error rates
- Memory usage
- Cold starts

### Enable Debug Mode

In `.env`:

```
DEBUG=xdb:*
NODE_ENV=development
```

## Rollback and Versions

### Rollback to Previous Deployment

1. Dashboard > Project > Deployments
2. Find the deployment you want to roll back to
3. Click "..." menu
4. Select "Promote to Production"

### Keep Multiple Versions

Create separate Vercel projects for:
- Production: `xdb` (main branch)
- Staging: `xdb-staging` (develop branch)
- Development: `xdb-dev` (dev branch)

## Scaling Considerations

### Rate Limiting

Implement rate limiting to prevent abuse:

```bash
npm install @vercel/ratelimit
```

Add to API route:

```typescript
import { Ratelimit } from '@vercel/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'),
});

export async function GET(request: NextRequest) {
  const { success } = await ratelimit.limit('xdb-api');
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  // ... rest of handler
}
```

### Concurrency Limits

Vercel functions default to single request processing. For parallel requests:

1. Use Vercel Pro or above
2. Increase concurrency in `vercel.json`:

```json
{
  "functions": {
    "src/app/api/xdb/**": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

### Database Connection Pooling

If using external database:

```bash
npm install pg-pool
```

Configure in `src/lib/db.ts`:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Connections per serverless function
});
```

## Troubleshooting

### Deployment Fails

**Error: "Command failed: npm run build"**

```bash
# Check build locally first
npm run build

# Check for TypeScript errors
npm run lint

# Verify all dependencies are installed
npm install
```

**Solution:** Fix errors locally, commit, and push.

### Function Timeout

**Error: "Function running for 60s+, aborting"**

This means a request took longer than the timeout limit.

**Solutions:**
1. Optimize queries (add WHERE clauses, LIMIT results)
2. Increase function timeout in `vercel.json` (max 60s on Hobby)
3. Upgrade to Vercel Pro (supports 60s timeout)
4. Implement async processing (use task queue)

### Environment Variables Not Loading

**Symptoms:**
- "XDB_ENCRYPTION_KEY not configured"
- "AUTH_TOKEN undefined"

**Solution:**

```bash
# Verify variables are set in Vercel Dashboard
vercel env pull

# Check .env file after pull
cat .env.local

# Redeploy after setting variables
vercel deploy --prod
```

### High Memory Usage

**Symptoms:** Function OOMKilled (exit code 137)

**Solutions:**
1. Reduce `MAX_DATABASE_SIZE`
2. Split database into smaller files
3. Upgrade to Vercel Pro (more memory)
4. Stream responses instead of loading entire DB

### Slow Response Times

**Causes:**
1. Cold start (first request after deploy) - 1-3s normal
2. Large database loads  
3. Complex queries on large tables
4. Encryption/decryption overhead

**Solutions:**
1. Implement caching
2. Reduce database size
3. Add database indexes
4. Use CDN for repeated queries (Vercel Edge Caching)

## Production Checklist

Before deploying to production:

- [ ] Generate new encryption key and auth token
- [ ] Set production environment variables in Vercel
- [ ] Configure persistent storage (KV, S3, etc.)
- [ ] Set up custom domain
- [ ] Enable SSL certificate
- [ ] Configure rate limiting
- [ ] Set up monitoring/alerting
- [ ] Test all API endpoints
- [ ] Verify database persistence
- [ ] Set up backups
- [ ] Document API endpoints for team
- [ ] Test from multiple clients
- [ ] Monitor logs for 24 hours after deploy

## Security Checklist

- [ ] Use strong, randomly generated tokens
- [ ] Store secrets in Vercel environment (not .env)
- [ ] Enable HTTPS only (default on Vercel)
- [ ] Set restrictive CORS if needed
- [ ] Implement rate limiting
- [ ] Validate all input
- [ ] Use secrets for encryption keys
- [ ] Regularly rotate credentials
- [ ] Monitor logs for suspicious activity
- [ ] Backup encrypted database files

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Status**: https://www.vercel-status.com
- **XDB README**: See README.md for API documentation

## Next Steps

After successful deployment:

1. **Test**: Verify all endpoints work
2. **Monitor**: Watch logs and metrics
3. **Backup**: Set up automated backups
4. **Document**: Document your deployment architecture
5. **Scale**: Monitor usage and upgrade plan if needed
