# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

biirbal.ai is a production-ready Slack application that automatically generates 90-second audio summaries of links shared in channels. The application uses AI-powered content extraction and text-to-speech technology to create audio summaries that are delivered back to Slack.

## Development Commands

### Primary Commands
- `npm run dev` - Start development server
- `npm run build` - Build production application (includes Prisma generation)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run Jest tests

### Database Commands
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations

### Testing
- `npm test` - Run all tests
- Coverage threshold: 70% (branches, functions, lines, statements)
- Tests use Jest with Next.js integration

## Architecture Overview

### Architecture Guidelines
- Given that we have web endpoints, queue setup and database, ensure that any new additions to the architecture is kept as minimal as possible. Ensure that the architecture design is done to be compatible with production which hosts web and worker on vercel, postgres on neon and redis on redis.io and managed via bull.
- when failure is hit, it is important to fix the root cause of failure instead of wrapping it in retries logic.

### Database Layer
- **Primary Database**: PostgreSQL with Prisma ORM
- **Neon Serverless**: Uses `@neondatabase/serverless` for edge runtime compatibility
- **Hybrid Approach**: Prisma for migrations/schema, Neon serverless for queries
- **Models**: Team, User, Channel, ProcessedLink, Subscription, AudioListen, QueuedJob
- **Connection**: Uses both `DATABASE_URL` and `DATABASE_UNPOOLED_URL` for optimal performance

### Queue System
- **Redis Queue**: Bull.js for background job processing
- **Fallback Mode**: Direct processing when Redis unavailable
- **Job Types**: PROCESS_LINK jobs for content extraction and TTS
- **Worker**: Processes jobs with timeout and retry logic
- **Cron Jobs**: Vercel cron triggers workers every 2 minutes

### API Structure
- **Next.js App Router**: Uses `src/app/api/` structure
- **Slack Events**: `src/app/api/slack/events/route.ts` handles incoming messages
- **Queue Processing**: `src/app/api/queue/worker/route.ts` processes background jobs
- **Health Checks**: Various health endpoints for monitoring

### Core Processing Flow
1. Slack message received with link � Queue job created
2. Background worker processes link � Content extraction
3. Text-to-speech generation � Audio file upload
4. Database record updated � Slack notification sent

## Key Components

### Link Processing (`src/lib/link-processor.ts`)
- Orchestrates the entire link processing pipeline
- Parallel processing for performance optimization
- Error handling and retry logic
- Performance monitoring and logging

### Content Extraction (`src/lib/content-extractor.ts`)
- Uses Mozilla Readability for clean content extraction
- Cheerio fallback for problematic sites
- Content summarization for audio generation

### Queue Management (`src/lib/queue/`)
- `bull-queue.ts`: Bull.js queue configuration and management
- `bull-worker.ts`: Worker process management
- `client.ts`: Queue client interface

### Database Models (`src/lib/models/`)
- Neon serverless database operations
- Type-safe database queries
- Connection pooling and timeout handling

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `DATABASE_UNPOOLED_URL` - Direct PostgreSQL connection (for Neon)
- `SLACK_SIGNING_SECRET` - Slack app signing secret
- `SLACK_CLIENT_ID` - Slack OAuth client ID
- `SLACK_CLIENT_SECRET` - Slack OAuth client secret
- `REDIS_URL` - Redis connection string for queue

### Optional
- `GOOGLE_CLOUD_PROJECT_ID` - For text-to-speech
- `STRIPE_SECRET_KEY` - For payment processing
- `NEXTAUTH_URL` - Base URL for the application

## Common Development Patterns

### Database Operations
```typescript
import { db } from '@/lib/prisma'

// Use Neon serverless for queries
const team = await db.findTeamById(teamId)

// Use withTimeout for long operations
const result = await withTimeout(
  () => db.updateProcessedLink(id, data),
  30000
)
```

### Queue Operations
```typescript
import { queueClient } from '@/lib/queue/client'

// Add job to queue
await queueClient.add('PROCESS_LINK', jobData)

// Check queue status
const stats = await queueClient.getStats()
```

### Error Handling
- All async operations use try-catch blocks
- Database operations have timeout wrappers
- Queue operations have retry logic
- Slack API calls have fallback messages

## Testing Strategy

### Test Structure
- `src/__tests__/` - Test files organized by feature
- Mock external dependencies (Slack, database)
- Coverage requirements: 70% across all metrics
- Use `supertest` for API testing

### Running Tests
- `npm test` - Run all tests
- Tests run in Node.js environment
- Database and external APIs are mocked

## Performance Considerations

### Database
- Uses connection pooling with Neon
- Timeout wrappers prevent hanging queries
- Parallel database operations where possible

### Queue Processing
- Bull.js with Redis for reliable job processing
- Concurrency limited to prevent resource exhaustion
- Automatic retry with exponential backoff

### Content Processing
- Parallel content extraction and database operations
- Streaming audio generation
- Efficient file uploads to cloud storage

## Deployment

### Vercel Configuration
- Uses `vercel.json` for cron job configuration
- Environment variables configured in Vercel dashboard
- Serverless functions with extended timeouts for workers

### Docker Support
- `Dockerfile` and `docker-compose.yml` included
- Suitable for alternative deployment platforms

## Security Features

- Request signature verification for Slack webhooks
- SQL injection protection via Prisma/parameterized queries
- XSS protection headers in Next.js config
- Environment variable validation
- Rate limiting and usage tracking

## Monitoring and Logging

### Health Endpoints
- `/api/health/db` - Database connection health
- `/api/health/queue` - Queue system health
- `/api/queue/stats` - Queue statistics

### Logging
- Structured console logging throughout
- Performance timing measurements
- Error tracking with context
- Queue job progress tracking