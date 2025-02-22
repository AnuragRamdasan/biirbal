# Slack Article Reader

A Next.js application that automatically converts article links shared in Slack channels to audio format using OpenAI's TTS service.

## Features

- 🔗 Automatically detects links shared in configured Slack channels
- 📝 Extracts article text using web scraping
- 🎧 Converts text to audio using OpenAI's TTS service
- 💾 Stores articles and audio files in PostgreSQL and S3
- 💰 Subscription-based pricing with usage limits
- 📊 Dashboard for workspace owners to track usage

## Prerequisites

- Node.js 18+
- PostgreSQL
- AWS Account
- Slack App credentials
- OpenAI API key
- Stripe account

## Local Development Setup

1. Clone and install dependencies:
```bash
git clone https://github.com/yourusername/slack-article-reader.git
cd slack-article-reader
npm install
```

2. Set up your environment variables:
```bash
cp .env.example .env
```

3. Set up the database:
```bash
# Create database
createdb slack_article_reader

# Run migrations
npx prisma migrate dev
```

4. Start the development server:
```bash
npm run dev
```

## Slack App Configuration

1. Create a new Slack app at https://api.slack.com/apps

2. Under "Basic Information", note down:
   - Client ID
   - Client Secret
   - Signing Secret

3. Add OAuth Scopes:
   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `links:read`
   - `team:read`

4. Configure Event Subscriptions:
   - Enable events
   - Set Request URL: `https://your-domain.com/api/slack/events`
   - Subscribe to:
     - `message.channels`
     - `link_shared`

5. Install the app to your workspace

## AWS S3 Setup

1. Create an S3 bucket:
   - Go to AWS Console > S3
   - Create a new bucket
   - Enable public access (for audio file hosting)

2. Create IAM user:
   - Go to IAM > Users > Add user
   - Create access key
   - Attach S3FullAccess policy

3. Configure CORS:
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

## Stripe Integration

1. Create products in Stripe Dashboard:
   - Basic Plan ($10/month)
   - Pro Plan ($25/month)

2. Configure webhook:
   - Add endpoint: `https://your-domain.com/api/stripe/webhook`
   - Select events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

## Testing

Run the test suite:
```bash
npm test
```

View coverage report:
```bash
npm test -- --coverage
```

## Deployment

1. Set up a PostgreSQL database
2. Configure environment variables
3. Deploy to your platform of choice (Vercel recommended)
4. Update Slack app configuration with production URLs

## License

MIT
