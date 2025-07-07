import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Enhanced Prisma configuration optimized for serverless environments
const createPrismaClient = () => {
  const databaseUrl = process.env.DATABASE_URL
  
  // Conservative serverless-optimized settings
  const separator = databaseUrl?.includes('?') ? '&' : '?'
  const connectionString = databaseUrl + separator + 
    'connection_limit=10&' +          // Conservative limit for serverless
    'pool_timeout=60&' +              // Increased timeout for serverless cold starts
    'statement_timeout=60000&' +      // 60 seconds
    'query_timeout=30000&' +          // 30 seconds
    'connect_timeout=30&' +           // Connection timeout
    'idle_timeout=30'                 // Idle timeout
  
  return new PrismaClient({
    datasources: {
      db: {
        url: connectionString
      }
    },
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] 
      : ['error'],
    errorFormat: 'minimal'
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Connection pool management for serverless
export const disconnectPrisma = async () => {
  try {
    await prisma.$disconnect()
    console.log('🔌 Prisma disconnected successfully')
  } catch (error) {
    console.error('❌ Error disconnecting Prisma:', error)
  }
}

// Health check for database connection
export const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { healthy: true, message: 'Database connection OK' }
  } catch (error) {
    console.error('🚨 Database health check failed:', error)
    return { 
      healthy: false, 
      message: error instanceof Error ? error.message : 'Database connection failed' 
    }
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})