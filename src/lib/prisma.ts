import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  workerPrisma: PrismaClient | undefined
}

// Web client uses Prisma Accelerate (connection pooling)
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.PRISMA_POSTGRES_PRISMA_DATABASE_URL || process.env.DATABASE_URL
    }
  }
})

// Worker client uses direct Postgres connection (no pooling overhead)
export const workerPrisma = globalForPrisma.workerPrisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.PRISMA_POSTGRES_POSTGRES_URL || process.env.DATABASE_UNPOOLED_URL || process.env.DATABASE_URL
    }
  }
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.workerPrisma = workerPrisma
}

// Wrapper function with timeout and retry logic
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 30000,
  retries: number = 2
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Database operation timed out after ${timeoutMs}ms (attempt ${attempt}/${retries})`))
          }, timeoutMs)
        })
      ])
    } catch (error) {
      console.error(`Database operation failed (attempt ${attempt}/${retries}):`, error)
      
      if (attempt === retries) {
        throw error
      }
      
      // Wait before retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
      console.log(`⏳ Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw new Error('All retry attempts failed')
}

// Health check using Prisma
export const healthCheck = async (): Promise<boolean> => {
  try {
    await withTimeout(() => prisma.$queryRaw`SELECT 1`, 10000, 1)
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// Worker health check using direct connection
export const workerHealthCheck = async (): Promise<boolean> => {
  try {
    await withTimeout(() => workerPrisma.$queryRaw`SELECT 1`, 10000, 1)
    return true
  } catch (error) {
    console.error('Worker database health check failed:', error)
    return false
  }
}

// Test database connection using Prisma
export const ensureDatabaseConnection = async () => {
  try {
    const isHealthy = await healthCheck()
    if (isHealthy) {
      console.log('✅ Prisma database connection verified')
      return true
    } else {
      console.error('❌ Prisma database health check failed')
      return false
    }
  } catch (error) {
    console.error('❌ Prisma database connection failed:', error)
    console.error('PRISMA_POSTGRES_POSTGRES_URL available:', !!process.env.PRISMA_POSTGRES_POSTGRES_URL)
    return false
  }
}

// Test worker database connection using direct Postgres
export const ensureWorkerDatabaseConnection = async () => {
  try {
    const isHealthy = await workerHealthCheck()
    if (isHealthy) {
      console.log('✅ Worker database connection verified')
      return true
    } else {
      console.error('❌ Worker database health check failed')
      return false
    }
  } catch (error) {
    console.error('❌ Worker database connection failed:', error)
    console.error('PRISMA_POSTGRES_POSTGRES_URL available:', !!process.env.PRISMA_POSTGRES_POSTGRES_URL)
    return false
  }
}

// Connection with retry logic
export const connectWithRetry = async (retries = 3) => {
  return await ensureDatabaseConnection()
}

// Note: db is exported from ./models/index.ts to avoid circular dependencies