# Development Setup Guide

This guide helps you set up a local development environment for biirbal.ai with seed data and automatic authentication.

## Quick Setup

Run the automated setup script:

```bash
npm run setup:dev
```

This script will:
1. Create `.env.local` with development defaults
2. Install dependencies
3. Generate Prisma client
4. Run database migrations
5. Seed development data

## Manual Setup

If you prefer to set up manually:

### 1. Environment Configuration

Create `.env.local`:

```bash
cp .env.development .env.local
```

Update the database URL in `.env.local`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/biirbal_dev"
DATABASE_URL_UNPOOLED="postgresql://postgres:password@localhost:5432/biirbal_dev"
DEV_AUTO_LOGIN=true
```

### 2. Database Setup

Make sure PostgreSQL is running, then:

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### 3. Start Development Server

```bash
npm run dev
```

## Development Features

### Automatic Authentication

When `DEV_AUTO_LOGIN=true` is set in your environment:

- You'll be automatically logged in as `dev@biirbal.ai`
- No need to go through OAuth flow
- Access the dev auth status at `/api/dev/auth`

### Development User

The seed script creates a development user with these credentials:

- **Email**: `dev@biirbal.ai`
- **Name**: Development User
- **Team**: Development Team
- **Slack Team ID**: `T_DEV_TEAM`
- **Slack User ID**: `U_DEV_USER`

### Sample Data

The seed script provides:

- **Team**: Development Team with subscription
- **Users**: Primary dev user + Alice & Bob for testing
- **Channels**: #general and #random
- **Links**: Sample processed links with various statuses (completed, processing, failed)
- **Audio Listens**: Sample listening data

### Development Components

Use the `DevAuthStatus` component to display authentication status:

```tsx
import DevAuthStatus from '@/components/dev/DevAuthStatus'

export default function DashboardPage() {
  return (
    <div>
      <DevAuthStatus />
      {/* Your dashboard content */}
    </div>
  )
}
```

## Available Scripts

### Database Commands

```bash
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations (USE THIS for schema changes)
npm run db:seed        # Seed development data
npm run db:push        # Direct schema push (NEVER use in production)
```

### Development Commands

```bash
npm run dev           # Start development server
npm run setup:dev     # Full development setup
npm test              # Run tests
npm run lint          # Check code style
```

## Development API Endpoints

### Authentication

- `GET /api/dev/auth` - Get current dev user status
- `POST /api/dev/auth` - Toggle dev authentication

### Health Checks

- `GET /api/health/db` - Database health
- `GET /api/health/queue` - Queue system health

## Database Access

### Using Prisma Studio

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555` to browse your database.

### Direct Database Access

```bash
psql "postgresql://postgres:password@localhost:5432/biirbal_dev"
```

## Resetting Development Data

To reset your development database:

```bash
# Reset and re-migrate (ONLY in development)
npx prisma migrate reset

# Re-seed data
npm run db:seed
```

⚠️ **WARNING**: Never run `prisma migrate reset` in production!

## Environment Variables Reference

### Required for Development

```env
DATABASE_URL="postgresql://..."
NODE_ENV=development
DEV_AUTO_LOGIN=true
```

### Optional (for full functionality)

```env
SLACK_SIGNING_SECRET=dummy_value
SLACK_CLIENT_ID=dummy_value
SLACK_CLIENT_SECRET=dummy_value
REDIS_URL="redis://localhost:6379"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev_secret
```

## Troubleshooting

### Database Connection Issues

1. Ensure PostgreSQL is running
2. Check DATABASE_URL format
3. Verify database exists: `createdb biirbal_dev`

### Migration Issues

```bash
# Check migration status
npx prisma migrate status

# Force reset in development only
npx prisma migrate reset
```

### Seed Data Issues

```bash
# Clear and re-seed
npm run db:seed
```

### Authentication Issues

1. Check `DEV_AUTO_LOGIN=true` in `.env.local`
2. Verify dev user exists: visit `/api/dev/auth`
3. Re-run seed script if user missing

## Production Differences

In production:

- `DEV_AUTO_LOGIN` is ignored
- `/api/dev/*` endpoints return 404
- `DevAuthStatus` component doesn't render
- Full OAuth flow is required

## Support

For development issues:

1. Check this guide
2. Verify environment variables
3. Check database connection
4. Review application logs