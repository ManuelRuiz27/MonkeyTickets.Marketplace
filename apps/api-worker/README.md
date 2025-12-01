# MonoMarket API Worker

Cloudflare Workers API for MonoMarket Tickets platform. This Worker provides a high-performance, globally distributed API using Cloudflare's edge network with D1 (database), KV (cache), and R2 (storage).

## Features

- **D1 Database**: SQLite-based relational database for event and ticket data
- **KV Caching**: Fast key-value cache for frequently accessed data
- **R2 Storage**: Object storage for assets (PDFs, images)
- **Global Edge Network**: Low-latency responses from 300+ locations worldwide
- **CORS Support**: Cross-origin requests enabled for web frontend

## Setup

### 1. Install Dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Authenticate with Cloudflare

```bash
npx wrangler login
```

This will open your browser for Cloudflare authentication.

### 3. Create D1 Database

```bash
npx wrangler d1 create monomarket_dev
```

Copy the returned `database_id` and update it in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "monomarket_dev"
database_id = "YOUR_DATABASE_ID_HERE"  # Replace this
```

### 4. Create KV Namespace

```bash
npx wrangler kv:namespace create MONOMARKET_CACHE
```

Copy the returned `id` and update it in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_ID_HERE"  # Replace this
```

### 5. Create R2 Bucket

```bash
npx wrangler r2 bucket create monomarket-assets
```

The bucket name is already configured in `wrangler.toml`.

### 6. Initialize Database Schema

```bash
cd apps/api-worker
npx wrangler d1 execute monomarket_dev --file=./schema.sql
```

### 7. Seed Test Data

```bash
npx wrangler d1 execute monomarket_dev --file=./seed.sql
```

## Development

### Local Development Server

```bash
# From monorepo root
pnpm worker:dev

# Or from this directory
pnpm run dev
```

The Worker will be available at `http://localhost:8787`

### Test Endpoints

- **Health Check**: `http://localhost:8787/api/health`
- **Events List**: `http://localhost:8787/api/events`
- **Single Event**: `http://localhost:8787/api/events/event-001`

## Deployment

### Deploy to Cloudflare

```bash
# From monorepo root
pnpm worker:deploy

# Or from this directory
pnpm run deploy
```

### View Logs

```bash
# From monorepo root
pnpm worker:tail

# Or from this directory
pnpm run tail
```

## API Endpoints

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "timestamp": "2025-11-30T19:00:00.000Z",
  "worker": "monomarket-api"
}
```

### GET /api/events

Get list of published events.

**Query Parameters:**
- None (returns first 50 published events)

**Response:**
```json
{
  "data": [
    {
      "id": "event-001",
      "title": "Concierto de Rock 2025",
      "description": "El mejor concierto de rock del año",
      "category": "Música",
      "venue": "Arena Ciudad",
      "city": "Ciudad de México",
      "start_date": "2025-12-15T20:00:00Z",
      "price": 350.00,
      "currency": "MXN",
      "capacity": 500
    }
  ],
  "cached": false
}
```

### GET /api/events/:id

Get single event details with ticket templates.

**Response:**
```json
{
  "data": {
    "id": "event-001",
    "title": "Concierto de Rock 2025",
    "organizer_name": "MonoMarket Events",
    "templates": [
      {
        "id": "template-001",
        "name": "General",
        "price": 350.00,
        "quantity": 400,
        "sold": 50
      }
    ]
  },
  "cached": false
}
```

## Environment Variables

Configure in `wrangler.toml`:

- `JWT_SECRET`: Secret key for JWT token validation (change in production!)

## Database Management

### Query D1 Database

```bash
npx wrangler d1 execute monomarket_dev --command="SELECT * FROM events LIMIT 5"
```

### Backup Database

```bash
npx wrangler d1 export monomarket_dev --output=backup.sql
```

### Restore Database

```bash
npx wrangler d1 execute monomarket_dev --file=backup.sql
```

## Caching Strategy

- **Events List**: Cached for 5 minutes
- **Event Details**: Cached for 5 minutes
- Cache is automatically invalidated on updates (implement cache busting as needed)

## Performance

- **Cold Start**: ~10-50ms
- **Warm Response**: ~1-5ms
- **Database Query**: ~5-20ms
- **Cache Hit**: ~1-2ms

## Troubleshooting

### "Database not found" error

Make sure you've created the D1 database and updated the `database_id` in `wrangler.toml`.

### "KV namespace not found" error

Make sure you've created the KV namespace and updated the `id` in `wrangler.toml`.

### CORS errors

CORS headers are configured in `src/index.ts`. Adjust the `Access-Control-Allow-Origin` header if needed.

## Next Steps

1. **Add Authentication**: Implement JWT validation for protected endpoints
2. **Add Mutations**: Create endpoints for orders, payments, ticket validation
3. **Add Rate Limiting**: Use KV to implement rate limiting
4. **Add Analytics**: Track API usage with Cloudflare Analytics
5. **Add Webhooks**: Handle payment gateway webhooks
6. **Sync with Main DB**: Implement data synchronization from PostgreSQL to D1

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [KV Storage Docs](https://developers.cloudflare.com/kv/)
- [R2 Storage Docs](https://developers.cloudflare.com/r2/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
