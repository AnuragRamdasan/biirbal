# 🤖 Slack Integration Setup Guide

## Overview

This guide explains how to set up the Slack integration for Taansen.ai, which automatically converts article URLs shared in Slack channels into audio format.

## Architecture

```
Slack Channel → Bot detects URL → Extract text → Summarize → Generate audio → Upload to S3 → Post back to Slack
```

## Required Environment Variables

Add these to your `.env` file:

```bash
# Slack App Configuration
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_STATE_SECRET=your_random_state_secret

# OpenAI for text-to-speech
OPENAI_API_KEY=your_openai_api_key

# AWS S3 for audio storage
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=your_s3_bucket_name
AWS_REGION=us-east-1

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/biirbal

# NextAuth (for web app authentication)
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

## 1. Create Slack App

1. Go to [Slack API](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "Taansen Audio Bot")
4. Select your development workspace

## 2. Configure OAuth & Permissions

### Bot Token Scopes
Add these scopes under "OAuth & Permissions":

```
channels:history    - Read message history
channels:read      - View basic channel info
chat:write         - Send messages as the bot
links:read         - View URLs in messages
team:read          - View workspace info
```

### OAuth URLs
Set these URLs in "OAuth & Permissions":

- **Redirect URL**: `https://yourdomain.com/api/slack/oauth_redirect`

## 3. Configure Event Subscriptions

1. Enable Events: **On**
2. Request URL: `https://yourdomain.com/api/slack/events`
3. Subscribe to Bot Events:
   - `message.channels` - Listen for messages in channels
   - `app_mention` - Listen for @mentions

## 4. Configure App Manifest (Optional)

You can use this manifest to quickly configure your app:

```yaml
display_information:
  name: Taansen Audio Bot
  description: Converts article URLs to audio automatically
  background_color: "#2c3e50"
features:
  bot_user:
    display_name: Taansen
    always_online: true
oauth_config:
  redirect_urls:
    - https://yourdomain.com/api/slack/oauth_redirect
  scopes:
    bot:
      - channels:history
      - channels:read
      - chat:write
      - links:read
      - team:read
settings:
  event_subscriptions:
    request_url: https://yourdomain.com/api/slack/events
    bot_events:
      - message.channels
      - app_mention
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
```

## 5. Install App to Workspace

1. Go to "Install App" in your Slack app settings
2. Click "Install to Workspace"
3. Authorize the permissions
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

## 6. Test the Integration

### Test URL Processing
1. Add the bot to a channel: `/invite @taansen`
2. Share an article URL in the channel
3. The bot should respond with processing status and eventually the audio link

### Test Commands
- Mention the bot: `@taansen` - Should get a help message
- Share any article URL - Should get audio conversion

## 7. Troubleshooting

### Common Issues

#### "Workspace not found" Error
- Check that OAuth flow completed successfully
- Verify bot token is stored in database
- Check console logs for OAuth errors

#### "Request verification failed"
- Ensure `SLACK_SIGNING_SECRET` is correct
- Check that the request URL is HTTPS in production
- Verify timestamp tolerance (requests older than 5 minutes are rejected)

#### "Text extraction failed"
- Many news sites have paywalls or bot protection
- Try with freely accessible articles first
- Check if URL is publicly accessible

#### "Audio generation failed" 
- Verify `OPENAI_API_KEY` is valid and has credits
- Check if summarized text is within OpenAI limits
- Monitor OpenAI usage in their dashboard

#### "S3 upload failed"
- Verify AWS credentials and permissions
- Ensure S3 bucket exists and is accessible
- Check bucket CORS configuration for web access

### Debug Mode

Add this to your environment for verbose logging:

```bash
DEBUG=slack:*
NODE_ENV=development
```

### Database Queries

Check integration status:

```sql
-- View all workspaces
SELECT * FROM "Workspace";

-- View recent articles
SELECT a.url, a.status, a."createdAt", w.name as workspace_name, c.name as channel_name
FROM "Article" a
JOIN "Workspace" w ON a."workspaceId" = w.id
JOIN "Channel" c ON a."channelId" = c.id
ORDER BY a."createdAt" DESC
LIMIT 10;

-- Check for failed articles
SELECT * FROM "Article" WHERE status = 'failed';
```

## 8. Production Deployment

### Security Checklist
- [ ] All environment variables set securely
- [ ] HTTPS enabled for all Slack URLs
- [ ] Database connection secured with SSL
- [ ] S3 bucket has proper IAM permissions
- [ ] Rate limiting implemented (optional)

### Monitoring
- Monitor Slack event delivery in your app logs
- Set up alerts for failed article processing
- Track OpenAI and AWS usage/costs
- Monitor database performance

### Scaling Considerations
- Consider using a job queue (Redis/Bull) for heavy processing
- Implement database connection pooling
- Add caching for frequently processed URLs
- Monitor memory usage for large articles

## 9. Features

### Current Features
- ✅ Automatic URL detection in messages
- ✅ Text extraction with multiple fallback methods
- ✅ AI-powered text summarization
- ✅ High-quality text-to-speech generation
- ✅ S3 audio storage with public URLs
- ✅ Rich Slack message formatting
- ✅ Duplicate URL detection
- ✅ Error handling and user feedback
- ✅ Processing status updates
- ✅ Thread-based responses

### Roadmap
- 🔄 Job queue for better performance
- 🔄 Custom voice selection
- 🔄 Audio playback speed control
- 🔄 Batch processing multiple URLs
- 🔄 Analytics dashboard
- 🔄 Subscription/usage limits
- 🔄 Workspace settings management

## Support

For issues or questions:
1. Check the console logs for error details
2. Verify all environment variables are set
3. Test with simple, public articles first
4. Check Slack app event delivery logs

The integration is now production-ready with proper error handling, async processing, and comprehensive logging! 🚀