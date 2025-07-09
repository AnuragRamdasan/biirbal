import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Initialize Prisma client
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
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
    console.error('DATABASE_URL available:', !!process.env.DATABASE_URL)
    return false
  }
}

// Connection with retry logic
export const connectWithRetry = async (retries = 3) => {
  return await ensureDatabaseConnection()
}

// Note: db is exported from ./models/index.ts to avoid circular dependencies