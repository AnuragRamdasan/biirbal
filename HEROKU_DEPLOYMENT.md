# Heroku Deployment Guide

This guide explains how to deploy the biirbal-ai Slack application to Heroku.

## Prerequisites

1. Heroku CLI installed
2. Git repository set up
3. Slack app configured with appropriate permissions

## Quick Deploy

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Manual Deployment

### 1. Create Heroku App

```bash
heroku create your-app-name
```

### 2. Add Required Add-ons

```bash
# PostgreSQL database
heroku addons:create heroku-postgresql:essential-0

# Redis for queue management
heroku addons:create heroku-redis:mini

# Heroku Scheduler for cron jobs
heroku addons:create scheduler:standard
```

### 3. Configure Environment Variables

```bash
heroku config:set SLACK_SIGNING_SECRET=your_slack_signing_secret
heroku config:set SLACK_CLIENT_ID=your_slack_client_id
heroku config:set SLACK_CLIENT_SECRET=your_slack_client_secret
heroku config:set NEXTAUTH_URL=https://your-app-name.herokuapp.com
heroku config:set NODE_ENV=production
heroku config:set GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
heroku config:set STRIPE_SECRET_KEY=your_stripe_secret_key
```

### 4. Deploy the Application

```bash
git push heroku main
```

### 5. Set Up Database

```bash
heroku run npm run db:push
```

### 6. Configure Scheduler Jobs

Open the Heroku Scheduler dashboard:
```bash
heroku addons:open scheduler
```

Add two jobs:
1. **Worker Job**: `node scripts/worker.js` (run every 2 minutes)
2. **Cleanup Job**: `node scripts/cleanup.js` (run every 10 minutes)

### 7. Scale Dynos

```bash
# Scale web dyno
heroku ps:scale web=1

# Scale worker dyno
heroku ps:scale worker=1
```

## Environment Variables

### Required
- `SLACK_SIGNING_SECRET`: Slack app signing secret
- `SLACK_CLIENT_ID`: Slack OAuth client ID
- `SLACK_CLIENT_SECRET`: Slack OAuth client secret
- `NEXTAUTH_URL`: Your Heroku app URL
- `DATABASE_URL`: Automatically set by Heroku Postgres
- `REDIS_URL`: Automatically set by Heroku Redis

### Optional
- `GOOGLE_CLOUD_PROJECT_ID`: For text-to-speech functionality
- `STRIPE_SECRET_KEY`: For payment processing

## Monitoring

### View Logs
```bash
heroku logs --tail
```

### Check Dyno Status
```bash
heroku ps
```

### Monitor Queue
Visit `https://your-app-name.herokuapp.com/api/queue/stats` to check queue statistics.

## Architecture Changes from Vercel

1. **Process Architecture**: Heroku uses web and worker dynos instead of serverless functions
2. **Cron Jobs**: Heroku Scheduler replaces Vercel cron jobs
3. **Database**: Still uses PostgreSQL but with Heroku Postgres add-on
4. **Queue**: Still uses Redis but with Heroku Redis add-on
5. **Environment Variables**: Set via Heroku config instead of Vercel environment

## Troubleshooting

### Build Issues
- Check build logs: `heroku logs --tail`
- Ensure all dependencies are in `package.json`

### Database Issues
- Check database connection: `heroku pg:info`
- Run migrations: `heroku run npm run db:push`

### Queue Issues
- Check Redis connection: `heroku redis:info`
- Monitor queue stats: Visit `/api/queue/stats`

### Worker Issues
- Check worker logs: `heroku logs --tail --dyno=worker`
- Restart worker: `heroku ps:restart worker`

## Costs

Estimated monthly costs:
- Basic web dyno: $7/month
- Basic worker dyno: $7/month
- Postgres Essential: $9/month
- Redis Mini: $3/month
- Scheduler Standard: $0/month

Total: ~$26/month

## Security

- Environment variables are encrypted
- HTTPS is enforced
- Regular security updates via Heroku stack updates