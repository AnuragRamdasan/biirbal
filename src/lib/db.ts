import { PrismaClient } from '@prisma/client'

// Runtime detection utilities
function isEdgeRuntime(): boolean {
  // Check for Edge Runtime environment
  return (
    typeof EdgeRuntime !== 'undefined' ||
    process.env.NEXT_RUNTIME === 'edge' ||
    globalThis.navigator?.userAgent?.includes('Edge-Runtime')
  )
}

function isNodeRuntime(): boolean {
  return typeof process !== 'undefined' && process.versions?.node !== undefined
}

// Client factory functions
function createNodeClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })
}

async function createEdgeClient(): Promise<PrismaClient> {
  // Dynamic import for edge-only dependencies
  const { PrismaNeon } = await import('@prisma/adapter-neon')
  const { neon } = await import('@neondatabase/serverless')
  
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  
  if (!connectionString) {
    throw new Error('DATABASE_URL_UNPOOLED or DATABASE_URL is required for edge runtime')
  }
  
  // Use neon adapter for edge compatibility
  const sql = neon(connectionString)
  const adapter = new PrismaNeon(sql)
  
  return new PrismaClient({ 
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })
}

// Global client management
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  edgePrisma: PrismaClient | undefined
}

// Unified client getter
export async function getDbClient(): Promise<PrismaClient> {
  try {
    if (isEdgeRuntime()) {
      // Edge runtime - use Neon adapter
      if (!globalForPrisma.edgePrisma) {
        globalForPrisma.edgePrisma = await createEdgeClient()
      }
      return globalForPrisma.edgePrisma
    } else if (isNodeRuntime()) {
      // Node.js runtime - use standard client
      if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = createNodeClient()
      }
      return globalForPrisma.prisma
    } else {
      // Fallback to standard client
      console.warn('Unable to detect runtime, falling back to standard Prisma client')
      if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = createNodeClient()
      }
      return globalForPrisma.prisma
    }
  } catch (error) {
    console.error('Failed to create database client:', error)
    // Fallback to standard client on error
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createNodeClient()
    }
    return globalForPrisma.prisma
  }
}

// Synchronous client for backwards compatibility (Node.js only)
export const prisma = globalForPrisma.prisma ?? createNodeClient()

// Development helpers
if (process.env.NODE_ENV !== 'production') {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma
  }
}

// Health check function that works in both environments
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
export type { PrismaClient }
export type DbClient = PrismaClient