import { PrismaClient } from '@prisma/client'

// Global client management for Heroku deployment
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Simple Prisma client factory for Heroku
function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required')
  }

  console.log('🔗 Creating Prisma client for Heroku')
  
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })
}

// Unified client getter - simplified for Heroku
export async function getDbClient(): Promise<PrismaClient> {
  try {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient()
    }
    return globalForPrisma.prisma
  } catch (error) {
    console.error('❌ Failed to create database client:', error)
    throw error
  }
}

// Direct export for backwards compatibility
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient()
    }
    return (globalForPrisma.prisma as any)[prop]
  }
})

// Health check function
export async function dbHealthCheck(): Promise<boolean> {
  try {
    const client = await getDbClient()
    await client.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// Connection helper
export async function ensureDbConnection(): Promise<boolean> {
  try {
    const client = await getDbClient()
    await client.$connect()
    console.log('✅ Database connection established')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

// Export types for convenience
export type DbClient = PrismaClient