// Keep Prisma for migrations and schema management
import { PrismaClient } from '@prisma/client'
// Use Neon serverless for actual database operations
import { db, sql } from './neon-db'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Keep Prisma client for schema operations (migrations, etc.)
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Export Neon database client as the main database interface
export { db, sql }

// Test database connection using Neon serverless
export const ensureDatabaseConnection = async () => {
  try {
    const isHealthy = await db.healthCheck()
    if (isHealthy) {
      console.log('✅ Neon serverless database connection verified')
      return true
    } else {
      console.error('❌ Neon serverless database health check failed')
      return false
    }
  } catch (error) {
    console.error('❌ Neon serverless database connection failed:', error)
    console.error('DATABASE_URL available:', !!process.env.DATABASE_URL)
    console.error('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20) + '...')
    return false
  }
}

// Neon serverless doesn't need explicit connection management
export const connectWithRetry = async (retries = 3) => {
  // Neon serverless is connectionless, so just verify it works
  return await ensureDatabaseConnection()
}