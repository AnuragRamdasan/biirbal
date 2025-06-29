# Queue System Documentation

This document describes the Vercel KV-based queue system implemented for biirbal.ai. The system provides reliable, distributed job processing that works seamlessly with Vercel's serverless architecture.

## Overview

The queue system replaces the previous custom implementation with a production-ready solution using Vercel KV (Redis) as the backing store. It provides:

- **Distributed Processing**: Multiple workers can process jobs concurrently
- **Automatic Retries**: Failed jobs are automatically retried with exponential backoff
- **Stuck Job Recovery**: Automatic detection and recovery of stuck jobs
- **Comprehensive Monitoring**: Detailed statistics and health monitoring
- **Vercel Optimized**: Designed specifically for Vercel's serverless environment

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Slack Event   │───▶│   Queue Client   │───▶│   Vercel KV     │
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

## Components

### 1. Queue Client (`src/lib/queue/client.ts`)

The main interface for queue operations:

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

### 2. Worker (`src/lib/queue/worker.ts`)

Background job processor:

```typescript
import { processJobs } from '@/lib/queue/worker'

// Process up to 5 jobs with 4m 40s timeout
const results = await processJobs({
  maxJobs: 5,
  timeout: 280000
})
```

### 3. API Routes

#### Worker Route (`/api/queue/worker`)
- **POST**: Manually trigger job processing
- **GET**: Process jobs with query parameters
- Called by Vercel cron every 2 minutes

#### Stats Route (`/api/queue/stats`)
- **GET**: Get queue statistics and health status
- Used for monitoring and debugging

#### Cleanup Route (`/api/queue/cleanup`)
- **POST**: Perform maintenance operations
- **GET**: Manual cleanup trigger
- Called by Vercel cron every 10 minutes

## Configuration

### Environment Variables

```bash
# Required for Vercel KV
KV_URL=redis://...
KV_REST_API_TOKEN=...

# Optional queue configuration
QUEUE_DEFAULT_PRIORITY=1
QUEUE_MAX_RETRIES=3
QUEUE_TIMEOUT=300000
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

## Job Processing Flow

1. **Job Creation**: When a link is posted in Slack, the event handler adds a job to the queue
2. **Queue Storage**: Job is stored in Vercel KV with priority and metadata
3. **Worker Processing**: Cron-triggered workers poll for jobs every 2 minutes
4. **Job Execution**: Worker processes the job (content extraction → TTS → Slack posting)
5. **Completion**: Job is marked as completed or failed with retry logic
6. **Cleanup**: Old jobs are cleaned up every 10 minutes

## Job States

- **pending**: Job is waiting to be processed
- **processing**: Job is currently being processed by a worker
- **completed**: Job finished successfully
- **failed**: Job failed permanently (max retries reached)

## Error Handling

### Retryable Errors
- Network timeouts
- Rate limiting
- Database connection issues
- Content extraction failures

### Non-Retryable Errors
- Authentication failures
- Invalid job data
- Permanent service unavailability

### Retry Strategy
- **Exponential Backoff**: Delays increase exponentially (1s, 2s, 4s, ...)
- **Max Delay**: Capped at 60 seconds
- **Max Retries**: Default 3 attempts

## Monitoring

### Health Checks

```typescript
// Check queue health
const health = await queueClient.healthCheck()
// {
//   healthy: true,
//   issues: [],
//   stats: { pending: 5, processing: 2, ... }
// }
```

### Statistics

```typescript
// Get comprehensive stats
const stats = await queueClient.getStats()
// {
//   pending: 5,
//   processing: 2,
//   completed: 100,
//   failed: 10,
//   avgProcessingTime: 15000,
//   healthy: true
// }
```

### Logging

All operations are logged with structured data:

```
🚀 Worker worker-123 starting job processing
🎯 Worker worker-123 processing job job:456:abc
✅ Worker worker-123 completed job job:456:abc
🧹 Cleanup complete: 0 cleaned, 2 reset
```

## Testing

Run the comprehensive test suite:

```bash
npm test -- __tests__/queue.test.ts
```

Tests cover:
- Job addition and retrieval
- Worker processing logic
- Error handling and retries
- Statistics and health checks
- Cleanup operations

## Troubleshooting

### Common Issues

1. **Jobs Stuck in Processing**
   - Check `/api/queue/stats` for processing count
   - Run manual cleanup: `GET /api/queue/cleanup`
   - Verify worker cron is running

2. **High Failure Rate**
   - Check logs for error patterns
   - Verify external service availability
   - Check Vercel KV connectivity

3. **Performance Issues**
   - Monitor queue depth via stats
   - Adjust worker frequency in `vercel.json`
   - Check job processing times

### Manual Operations

```bash
# Check queue status
curl https://your-app.vercel.app/api/queue/stats

# Trigger worker manually
curl -X POST https://your-app.vercel.app/api/queue/worker

# Run cleanup
curl https://your-app.vercel.app/api/queue/cleanup
```

## Migration from Old System

The new queue system replaces the previous `src/lib/job-queue.ts` implementation. Key differences:

1. **Redis Backend**: Uses Vercel KV instead of in-memory + database
2. **Distributed**: Multiple workers can process jobs concurrently
3. **Cron-Based**: Uses Vercel cron instead of continuous polling
4. **Better Monitoring**: Comprehensive stats and health checks
5. **Production Ready**: Designed for reliability and scale

### Migration Steps

1. ✅ Install `@vercel/kv` dependency
2. ✅ Create new queue implementation
3. ✅ Update Slack event handler to use new queue
4. ✅ Configure Vercel cron jobs
5. ✅ Add comprehensive tests
6. ✅ Update documentation
7. 🔄 Deploy and monitor

## Best Practices

1. **Job Idempotency**: Ensure jobs can be safely retried
2. **Timeout Handling**: Keep job processing under 4 minutes for Vercel
3. **Monitoring**: Regularly check queue health and statistics
4. **Error Logging**: Log errors with sufficient context for debugging
5. **Graceful Degradation**: Handle service unavailability gracefully

## Support

For issues or questions about the queue system:

1. Check the logs in Vercel dashboard
2. Review queue statistics at `/api/queue/stats`
3. Check this documentation
4. Contact the development team

---

**Last Updated**: 2024-06-29  
**Version**: 1.0.0