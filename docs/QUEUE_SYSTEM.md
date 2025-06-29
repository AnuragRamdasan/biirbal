# Simple Redis Queue System

This document describes the simple Redis-based queue system for biirbal.ai. The system provides reliable background job processing with automatic fallback to direct processing when Redis is unavailable.

## Overview

A clean, simple Redis queue system with:

- **Redis-Only**: Uses standard Redis with ioredis client (no Vercel KV complexity)
- **Automatic Fallback**: Processes jobs directly when Redis is unavailable
- **Automatic Retries**: Failed jobs are retried with exponential backoff
- **Stuck Job Recovery**: Automatic detection and recovery of stuck jobs
- **Simple Configuration**: Just needs `REDIS_URL` environment variable

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Slack Event   │───▶│   Queue Client   │───▶│      Redis      │
│   (Link Posted) │    │   (Add Job)      │    │   (Job Store)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐            │
│  Cron Worker    │◀───│   Worker API     │◀───────────┘
│  (Every 2min)   │    │   (Process Job)  │
└─────────────────┘    └──────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Link Processor  │
                       │ (Audio + Slack) │
                       └─────────────────┘
```

## Configuration

### Environment Variables

```bash
# Required: Redis URL
REDIS_URL=redis://default:password@host:port

# Examples:
REDIS_URL=redis://localhost:6379                                    # Local Redis
REDIS_URL=redis://user:pass@redis-host:6379                        # Authenticated Redis
REDIS_URL=redis://default:QMYVgIlXTSnZmlAPBvyx9KggiMP70tPd@redis-17138.c62.us-east-1-4.ec2.redns.redis-cloud.com:17138  # Redis Cloud
```

### Vercel Configuration (`vercel.json`)

```json
{
  "functions": {
    "src/app/api/queue/worker/route.ts": {
      "maxDuration": 300
    },
    "src/app/api/queue/cleanup/route.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/queue/cleanup",
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/queue/worker",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

## Usage

### Basic Queue Operations

```typescript
import { queueClient } from '@/lib/queue/client'

// Add a job
const jobId = await queueClient.add('PROCESS_LINK', {
  url: 'https://example.com',
  messageTs: '123',
  channelId: 'C123',
  teamId: 'T123',
  slackTeamId: 'ST123'
})

// Check job status
const status = await queueClient.getStatus(jobId)

// Get queue statistics
const stats = await queueClient.getStats()
```

### Worker Processing

```typescript
import { processJobs } from '@/lib/queue/worker'

// Process up to 5 jobs with 4m 40s timeout
const results = await processJobs({
  maxJobs: 5,
  timeout: 280000
})
```

## Modes of Operation

### Redis Mode (Production)
When `REDIS_URL` is configured:
- Jobs are queued in Redis
- Background workers process jobs
- Automatic retries and monitoring
- Full queue functionality

### Fallback Mode (Development)
When `REDIS_URL` is not configured:
- Jobs are processed immediately
- No queuing or retries
- Continues working without Redis

## API Routes

### Worker Route (`/api/queue/worker`)
- **POST**: Manually trigger job processing
- **GET**: Process jobs with query parameters
- Called by Vercel cron every 2 minutes

### Stats Route (`/api/queue/stats`)
- **GET**: Get queue statistics and health status

### Cleanup Route (`/api/queue/cleanup`)
- **POST**: Perform maintenance operations
- Called by Vercel cron every 10 minutes

## Job Processing Flow

1. **Job Creation**: Slack event handler adds job to queue
2. **Queue Storage**: Job stored in Redis with priority
3. **Worker Processing**: Cron workers poll for jobs every 2 minutes
4. **Job Execution**: Worker processes job (content → TTS → Slack)
5. **Completion**: Job marked as completed or failed with retry logic
6. **Cleanup**: Old jobs cleaned up every 10 minutes

## Monitoring

### Health Checks

```typescript
const health = await queueClient.healthCheck()
// {
//   healthy: true,
//   issues: [],
//   stats: { pending: 5, processing: 2, ... }
// }
```

### Statistics

```typescript
const stats = await queueClient.getStats()
// {
//   pending: 5,
//   processing: 2,
//   completed: 100,
//   failed: 10,
//   healthy: true
// }
```

### Logging

```
🔌 Connecting to Redis: redis://default:***@redis-host:17138
✅ Redis connection successful
✅ Job job:123:abc added to queue
🎯 Job job:123:abc assigned to worker worker-xyz
✅ Job job:123:abc completed successfully
```

## Error Handling

### Retryable Errors
- Network timeouts
- Rate limiting
- Database connection issues
- Content extraction failures

### Non-Retryable Errors
- Authentication failures
- Invalid job data

### Retry Strategy
- **Exponential Backoff**: 1s, 2s, 4s, 8s, 16s, 32s, 60s (max)
- **Max Retries**: 3 attempts
- **Automatic Recovery**: Stuck jobs reset after 10 minutes

## Troubleshooting

### Common Issues

1. **Redis Connection Errors**
   ```
   ❌ Redis connection failed: Error: getaddrinfo ENOTFOUND
   ```
   - **Solution**: Check `REDIS_URL` environment variable
   - **Verify**: Redis host is accessible
   - **Fallback**: Jobs will process directly if Redis unavailable

2. **Jobs in Fallback Mode**
   ```
   ⚠️ Redis not configured, processing directly
   ```
   - **Solution**: Set `REDIS_URL` environment variable
   - **Note**: Jobs will process but without queuing/retries

3. **Jobs Stuck in Processing**
   - Check `/api/queue/stats` for processing count
   - Run cleanup: `GET /api/queue/cleanup`
   - Stuck jobs reset automatically after 10 minutes

### Manual Operations

```bash
# Check queue status
curl https://your-app.vercel.app/api/queue/stats

# Trigger worker manually
curl -X POST https://your-app.vercel.app/api/queue/worker

# Run cleanup
curl https://your-app.vercel.app/api/queue/cleanup
```

## Setup Instructions

### 1. Set Redis URL
```bash
# In Vercel dashboard: Settings → Environment Variables
REDIS_URL=redis://default:password@your-redis-host:port
```

### 2. Deploy
```bash
vercel --prod
```

### 3. Test
Post a link in Slack and check logs for:
```
✅ Job job:123:abc added to queue
```

## Performance

- **Throughput**: Processes 5 jobs per worker invocation
- **Frequency**: Workers run every 2 minutes
- **Timeout**: 5 minute job timeout
- **Cleanup**: Every 10 minutes
- **Retry Logic**: Up to 3 attempts with exponential backoff

---

**Simple, reliable, Redis-only queue system with automatic fallback.**