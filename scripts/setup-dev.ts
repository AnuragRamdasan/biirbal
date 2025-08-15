#!/usr/bin/env tsx

import { execSync } from 'child_process'
import { writeFileSync, existsSync } from 'fs'
import path from 'path'

console.log('🚀 Setting up development environment...')

// Check if we're in development
if (process.env.NODE_ENV === 'production') {
  console.error('❌ This script should only be run in development environment')
  process.exit(1)
}

const projectRoot = process.cwd()
const envFile = path.join(projectRoot, '.env.local')

// Step 1: Check if .env.local exists, if not create basic setup
if (!existsSync(envFile)) {
  console.log('📝 Creating .env.local file...')
  const envContent = `# Local Development Environment
# Copy this file and update with your actual values

# Database (required)
DATABASE_URL="postgresql://postgres:password@localhost:5432/biirbal_dev"
DATABASE_URL_UNPOOLED="postgresql://postgres:password@localhost:5432/biirbal_dev"

# Development settings
NODE_ENV=development
# DEV_AUTO_LOGIN=true  # No longer needed - use ?dev=true URL parameter instead

# Slack (for testing, use dummy values)
SLACK_SIGNING_SECRET=dummy_signing_secret_for_dev
SLACK_CLIENT_ID=dummy_client_id
SLACK_CLIENT_SECRET=dummy_client_secret

# Redis (optional for dev)
# REDIS_URL="redis://localhost:6379"

# NextAuth (optional)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev_secret_key_change_in_production

# Google Cloud (optional for TTS)
# GOOGLE_CLOUD_PROJECT_ID=your_project_id

# Stripe (optional)
# STRIPE_SECRET_KEY=sk_test_...
`
  
  writeFileSync(envFile, envContent)
  console.log('✅ Created .env.local with development defaults')
} else {
  console.log('📋 .env.local already exists')
}

// Step 2: Install dependencies
console.log('📦 Installing dependencies...')
try {
  execSync('npm install', { stdio: 'inherit' })
  console.log('✅ Dependencies installed')
} catch (error) {
  console.error('❌ Failed to install dependencies:', error)
  process.exit(1)
}

// Step 3: Generate Prisma client
console.log('🔄 Generating Prisma client...')
try {
  execSync('npm run db:generate', { stdio: 'inherit' })
  console.log('✅ Prisma client generated')
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error)
  process.exit(1)
}

// Step 4: Check database connection and run migrations
console.log('🗄️  Setting up database...')
try {
  // Run migrations
  execSync('npm run db:migrate', { stdio: 'inherit' })
  console.log('✅ Database migrations completed')
} catch (error) {
  console.log('⚠️  Database migration failed. Make sure your database is running and DATABASE_URL is correct.')
  console.log('You can run migrations manually with: npm run db:migrate')
}

// Step 5: Seed the database
console.log('🌱 Seeding development data...')
try {
  execSync('npm run db:seed', { stdio: 'inherit' })
  console.log('✅ Development data seeded')
} catch (error) {
  console.log('⚠️  Database seeding failed. You can run it manually with: npm run db:seed')
  console.log('Make sure your database is running and migrations are applied.')
}

console.log('')
console.log('🎉 Development setup complete!')
console.log('')
console.log('Next steps:')
console.log('1. Update .env.local with your actual database credentials')
console.log('2. Start your local database (PostgreSQL)')
console.log('3. Run: npm run dev')
console.log('')
console.log('Development user credentials:')
console.log('- Email: dev@biirbal.ai')
console.log('- This user will be automatically logged in when you add ?dev=true to the URL')
console.log('')
console.log('Useful commands:')
console.log('- npm run dev          # Start development server')
console.log('- npm run db:migrate   # Run database migrations')
console.log('- npm run db:seed      # Seed development data')
console.log('- npm test             # Run tests')
console.log('- npm run lint         # Check code style')