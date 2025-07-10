import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neon } from '@neondatabase/serverless'

// Edge-compatible Prisma client using Neon adapter
const createEdgePrismaClient = () => {
  const connectionString = process.env.DATABASE_UNPOOLED_URL || process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_UNPOOLED_URL or DATABASE_URL is required for edge functions')
  }
  
  // Only use Neon adapter if it's a Neon connection string
  if (connectionString.includes('neon.tech') || connectionString.includes('neon.database')) {
    const sql = neon(connectionString)
    const adapter = new PrismaNeon(sql)
    
    return new PrismaClient({ 
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
    })
  } else {
    // For non-Neon databases, use regular Prisma client
    return new PrismaClient({ 
      datasources: {
        db: {
          url: connectionString
        }
      },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
    })
  }
}

// Global instance for edge functions
let edgePrisma: PrismaClient | null = null

export const getEdgePrisma = () => {
  if (!edgePrisma) {
    edgePrisma = createEdgePrismaClient()
  }
  return edgePrisma
}

// Wrapper function with timeout for edge functions
export async function withEdgeTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Edge database operation timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })
  ])
}

// Edge-compatible health check
export const edgeHealthCheck = async (): Promise<boolean> => {
  try {
    const prisma = getEdgePrisma()
    await withEdgeTimeout(() => prisma.$queryRaw`SELECT 1`, 10000)
    return true
  } catch (error) {
    console.error('Edge database health check failed:', error)
    return false
  }
}