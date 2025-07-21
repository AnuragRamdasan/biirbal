# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

biirbal.ai is a production-ready Slack application that automatically generates 59-second audio summaries of links shared in channels. The application uses AI-powered content extraction and text-to-speech technology to create audio summaries that are delivered back to Slack.

## Development Commands

### Primary Commands
- `npm run dev` - Start development server
- `npm run build` - Build production application (includes Prisma generation)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run Jest tests

### Database Commands
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations (ALWAYS use this for schema changes)
- `npm run db:push` - Push schema changes to database (NEVER use for production - prototyping only)

### CRITICAL DATABASE RULES
- **NEVER use `npm run db:push` for schema changes** - This bypasses the migration system
- **ALWAYS use `npx prisma migrate dev --name <description>`** for schema changes
- **Migrations are required for production safety, team collaboration, and rollback capability**
- **`db:push` is only for prototyping - never use in production codebase**

### Testing
- `npm test` - Run all tests
- Coverage threshold: 70% (branches, functions, lines, statements)
- Tests use Jest with Next.js integration

## Architecture Overview

### Architecture Guidelines
- Given that we have web endpoints, queue setup and database, ensure that any new additions to the architecture is kept as minimal as possible. Ensure that the architecture design is done to be compatible with production which hosts web and worker on heroku, postgres on heroku postgres and redis on heroku redis and managed via bull.
- when failure is hit, it is important to fix the root cause of failure instead of wrapping it in retries logic.

### Database Layer
- **Primary Database**: PostgreSQL with Prisma ORM
- **Heroku Postgres**: Uses Heroku Postgres add-on for managed database
- **Hybrid Approach**: Prisma for migrations/schema, direct queries for performance
- **Models**: Team, User, Channel, ProcessedLink, Subscription, AudioListen, QueuedJob
- **Connection**: Uses `DATABASE_URL` from Heroku Postgres add-on

### Queue System
- **Redis Queue**: Bull.js for background job processing with Heroku Redis add-on
- **Fallback Mode**: Direct processing when Redis unavailable
- **Job Types**: PROCESS_LINK jobs for content extraction and TTS
- **Worker**: Dedicated worker dyno processes jobs with timeout and retry logic
- **Cron Jobs**: Heroku Scheduler triggers workers every 2 minutes

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

### Heroku Configuration
- Uses `Procfile` for dyno configuration
- Environment variables configured in Heroku dashboard
- Web and worker dynos with appropriate resource allocation
- Heroku Scheduler for cron jobs

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

## Git Workflow Guidelines

### Selective Commits for Parallel Development
Given that multiple Claude agents may be working on this codebase simultaneously, it's critical to only commit files that were changed in the current session to avoid conflicts and maintain clean git history.

### CRITICAL GIT RULES
- **NEVER commit all modified files at once** - This can include changes from other sessions
- **ALWAYS use selective commits** - Only commit files modified in the current session
- **VERIFY files before staging** - Check `git status` and `git diff` before committing
- **Use specific file paths** - Explicitly specify which files to add/commit

### Recommended Git Commands
```bash
# Check what files are modified
git status

# Review changes in specific files
git diff path/to/file

# Add only specific files modified in this session
git add path/to/specific/file1 path/to/specific/file2

# Or add files interactively to select specific changes
git add -p

# Commit with descriptive message
git commit -m "feat: add specific feature

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Avoiding Conflicts
- Never use `git add .` or `git add -A` in a shared development environment
- Always review `git status` output before staging any files
- Use `git diff --name-only` to see which files have changes
- If unsure about a file's origin, check `git log --oneline -n 5 path/to/file` to see recent changes