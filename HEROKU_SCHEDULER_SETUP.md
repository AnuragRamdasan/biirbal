# Heroku Scheduler Setup for Stuck Job Cleanup

This document explains how to set up Heroku Scheduler to automatically clean up stuck processing jobs.

## Overview

The stuck job cleanup cron job monitors for:
1. **Stuck Processing Jobs**: Links stuck in `PROCESSING` status for >10 minutes
2. **Abandoned Pending Jobs**: Links stuck in `PENDING` status for >1 hour

## Heroku Scheduler Configuration

### 1. Install Heroku Scheduler Add-on

```bash
heroku addons:create scheduler:standard --app your-app-name
```

### 2. Add Cleanup Job

Open Heroku Scheduler dashboard:
```bash
heroku addons:open scheduler --app your-app-name
```

Or go to: `https://dashboard.heroku.com/apps/your-app-name/resources`

### 3. Create New Job

Click "Create job" and configure:

**Frequency**: Every 10 minutes
**Command**: 
```bash
curl -X POST https://your-app-name.herokuapp.com/api/cron/cleanup-stuck-jobs -H "Content-Type: application/json"
```

Replace `your-app-name` with your actual Heroku app name.

### 4. Alternative Commands

**For more frequent monitoring (every 5 minutes)**:
```bash
curl -X POST https://your-app-domain.com/api/cron/cleanup-stuck-jobs
```

**With timeout and error handling**:
```bash
timeout 240 curl -X POST https://your-app-name.herokuapp.com/api/cron/cleanup-stuck-jobs || echo "Cleanup job timed out or failed"
```

## What the Cleanup Job Does

### Stuck Processing Jobs (>10 minutes)
- Finds links stuck in `PROCESSING` status
- Resets status to `PENDING`
- Re-queues the job for processing
- Logs the restart attempt

### Abandoned Pending Jobs (>1 hour)
- Finds very old `PENDING` jobs
- Marks them as `FAILED` with reason "Job abandoned - too old"
- Prevents infinite accumulation of old jobs

### Monitoring
- Returns cleanup statistics
- Logs all operations for debugging
- Provides queue health information

## Manual Testing

You can manually trigger the cleanup job:

```bash
# Using curl
curl -X POST https://your-app-name.herokuapp.com/api/cron/cleanup-stuck-jobs

# Or via browser (GET also supported)
https://your-app-name.herokuapp.com/api/cron/cleanup-stuck-jobs
```

## Response Format

```json
{
  "message": "Stuck job cleanup completed",
  "stuckJobsFound": 2,
  "cleanedUp": 2,
  "oldPendingJobsMarkedFailed": 1,
  "queueStats": {
    "waiting": 0,
    "active": 1,
    "completed": 45,
    "failed": 3
  },
  "timestamp": "2025-07-27T09:30:00.000Z"
}
```

## Monitoring and Alerts

### Heroku Logs
Monitor the cleanup job in Heroku logs:
```bash
heroku logs --tail --app your-app-name | grep "stuck job cleanup"
```

### Expected Log Output
```
🧹 Starting stuck job cleanup...
🔍 Found 2 stuck processing jobs
🔄 Restarting stuck job for link: https://example.com/article
✅ Successfully restarted job for link ID: abc123
🕐 Found 1 old pending jobs
🧹 Cleanup completed: { cleanedUp: 2, ... }
```

## Troubleshooting

### Common Issues

1. **Timeout Errors**
   - Increase curl timeout: `timeout 300 curl ...`
   - Check if database is responsive

2. **Queue Connection Issues**
   - Verify Redis connection is healthy
   - Check if Bull queue is properly initialized

3. **High Number of Stuck Jobs**
   - May indicate systemic issues
   - Check ScrapingBee API health
   - Verify OpenAI API is responding

### Health Checks

Monitor related endpoints:
- `/api/health/db` - Database health
- `/api/health/queue` - Queue health  
- `/api/queue/stats` - Queue statistics

## Recommended Schedule

- **Production**: Every 10 minutes
- **Development**: Every 30 minutes or manual only
- **High Traffic**: Every 5 minutes

## Security Notes

- The endpoint requires no authentication (internal cleanup)
- Only accepts POST requests from scheduler
- Logs all operations for audit trail
- Safe to run multiple times (idempotent)

## Alternative: Using Heroku CLI

You can also add the job via CLI:

```bash
heroku addons:create scheduler:standard
heroku run "curl -X POST https://$(heroku info -j | jq -r '.web_url')/api/cron/cleanup-stuck-jobs"
```