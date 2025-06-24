# 📎 Slack Link Monitor

A production-ready Slack application that automatically generates 90-second audio summaries of links shared in your channels using AI-powered content extraction and text-to-speech technology.

## 🌟 Features

- **🔗 Automatic Link Detection**: Monitors all channels where the bot is added and detects shared links
- **📄 Smart Content Extraction**: Uses advanced readability algorithms to extract clean, meaningful content from web pages
- **🎧 AI Audio Summaries**: Generates high-quality 90-second audio summaries using Google Cloud Text-to-Speech
- **💳 Stripe Payment Integration**: Subscription-based pricing with trial periods
- **🔒 Enterprise Security**: Production-ready security headers and validation
- **📊 Usage Analytics**: Track link processing and subscription limits
- **🧪 Comprehensive Testing**: Full test suite with 70%+ coverage requirements

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Google Cloud Project with Text-to-Speech API enabled
- Slack App with required permissions
- Stripe account for payments

### Environment Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd slack-link-monitor
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with the required credentials:
```env
# Slack Configuration
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/slack_link_monitor"

# Google Cloud Text-to-Speech
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# App Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

5. Set up the database:
```bash
npm run db:generate
npm run db:push
```

6. Start the development server:
```bash
npm run dev
```

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: Next.js API Routes with serverless functions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Slack OAuth 2.0
- **Payments**: Stripe Subscriptions
- **Audio Generation**: Google Cloud Text-to-Speech
- **Content Extraction**: Readability API + cheerio fallback
- **Testing**: Jest with comprehensive test coverage
- **Deployment**: Docker + Vercel/Railway ready

## 🧪 Testing

Run the test suite:
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📦 Deployment

### Docker Deployment

```bash
# Build and run with Docker
docker build -t slack-link-monitor .
docker run -p 3000:3000 --env-file .env slack-link-monitor

# Or use docker-compose
docker-compose up
```

### Vercel Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`
3. Configure environment variables in Vercel dashboard
4. Set up database (Neon, PlanetScale, or Supabase recommended)

## 💰 Pricing Plans

- **Free Trial**: 50 links/month, 7-day trial
- **Starter**: $9.99/month, 100 links/month
- **Pro**: $29.99/month, 500 links/month ⭐ Most Popular
- **Enterprise**: $99.99/month, 2000 links/month + custom features

## 🔒 Security Features

- Request signature verification (Slack)
- Rate limiting and usage tracking
- SQL injection protection (Prisma)
- XSS protection headers
- Environment variable validation
- Secure file upload handling

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ for teams who want to stay informed without the information overload.**
