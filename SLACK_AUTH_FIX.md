# 🔧 Slack OAuth Configuration Fix

## Problem
You have two different Slack integrations that conflict:
1. **NextAuth Slack Provider** (user login) → `/api/auth/callback/slack`
2. **Slack Bot Integration** (workspace bot) → `/api/slack/oauth_redirect`

## Solution 1: Separate Slack Apps (Recommended)

### Create Two Slack Apps:

#### App 1: "Taansen User Auth" (for NextAuth login)
- **Redirect URLs**: `http://localhost:3000/api/auth/callback/slack`
- **Scopes**: `identity.basic`, `identity.email`, `identity.avatar`, `identity.team`
- **Use for**: User authentication only

#### App 2: "Taansen Bot" (for workspace integration)
- **Redirect URLs**: `http://localhost:3000/api/slack/oauth_redirect`
- **Scopes**: `channels:history`, `channels:read`, `chat:write`, `links:read`, `team:read`
- **Use for**: Bot functionality

### Environment Variables:
```bash
# NextAuth Slack Provider (App 1)
NEXTAUTH_SLACK_CLIENT_ID=your_auth_app_client_id
NEXTAUTH_SLACK_CLIENT_SECRET=your_auth_app_client_secret

# Bot Integration (App 2) 
SLACK_CLIENT_ID=your_bot_app_client_id
SLACK_CLIENT_SECRET=your_bot_app_client_secret
SLACK_SIGNING_SECRET=your_bot_app_signing_secret
SLACK_STATE_SECRET=your_random_state_secret
```

## Solution 2: Single App with Multiple Redirect URLs

### Configure your existing Slack app with BOTH redirect URLs:
- `http://localhost:3000/api/auth/callback/slack` (for NextAuth)
- `http://localhost:3000/api/slack/oauth_redirect` (for bot)

### Required Scopes (combined):
- `identity.basic`, `identity.email`, `identity.avatar`, `identity.team` (for user auth)
- `channels:history`, `channels:read`, `chat:write`, `links:read`, `team:read` (for bot)

## Solution 3: Disable NextAuth Slack Provider (Simplest)

If you don't need Slack user authentication, remove it from NextAuth.