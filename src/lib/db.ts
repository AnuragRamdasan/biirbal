// Runtime detection utilities
function isEdgeRuntime(): boolean {
  // Check for Edge Runtime environment
  return (
    typeof globalThis !== 'undefined' && 'EdgeRuntime' in globalThis ||
    process.env.NEXT_RUNTIME === 'edge' ||
    globalThis.navigator?.userAgent?.includes('Edge-Runtime')
  )
}

function isNodeRuntime(): boolean {
  return typeof process !== 'undefined' && process.versions?.node !== undefined && !isEdgeRuntime()
}

// Client factory functions
async function createNodeClient(): Promise<any> {
  // Dynamic import to avoid browser bundle issues
  const { PrismaClient } = await import('@prisma/client')
  
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })
}

async function createEdgeClient(): Promise<any> {
  // Dynamic imports for edge runtime
  const [{ PrismaClient }, { PrismaNeon }, { neon, neonConfig }] = await Promise.all([
    import('@prisma/client'),
    import('@prisma/adapter-neon'),
    import('@neondatabase/serverless')
  ])
  
  // Configure WebSocket constructor for edge environments
  if (typeof WebSocket === 'undefined') {
    const { default: ws } = await import('ws')
    neonConfig.webSocketConstructor = ws
  }
  
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  
  if (!connectionString) {
    throw new Error('DATABASE_URL_UNPOOLED or DATABASE_URL is required for edge runtime')
  }
  
  console.log('🔗 Creating edge client with Neon adapter')
  
  // Use neon adapter for edge compatibility
  const sql = neon(connectionString)
  const adapter = new PrismaNeon({ connectionString })
  
  return new PrismaClient({ 
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })
}

// Global client management
const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined
  edgePrisma: any | undefined
}

// Unified client getter
export async function getDbClient(): Promise<any> {
  try {
    if (isEdgeRuntime()) {
      // Edge runtime - use Neon adapter
      if (!globalForPrisma.edgePrisma) {
        console.log('🔗 Creating edge client with Neon adapter')
        globalForPrisma.edgePrisma = await createEdgeClient()
      }
      return globalForPrisma.edgePrisma
    } else if (isNodeRuntime()) {
      // Node.js runtime - use standard client
      if (!globalForPrisma.prisma) {
        console.log('🔗 Creating Node.js client')
        globalForPrisma.prisma = await createNodeClient()
      }
      return globalForPrisma.prisma
    } else {
      // Fallback to edge client for unknown environments
      console.warn('⚠️ Unknown runtime, trying edge client')
      if (!globalForPrisma.edgePrisma) {
        globalForPrisma.edgePrisma = await createEdgeClient()
      }
      return globalForPrisma.edgePrisma
    }
  } catch (error) {
    console.error('❌ Failed to create database client:', error)
    throw error
  }
}

// Lazy-loaded synchronous client for backwards compatibility
let _lazyPrisma: any | undefined

export const prisma = new Proxy({} as any, {
  get(target, prop) {
    if (!_lazyPrisma) {
      throw new Error('Prisma client not initialized. Use getDbClient() instead for edge compatibility.')
    }
    return _lazyPrisma[prop]
  }
})

// Initialize lazy client in Node.js environment only
if (typeof process !== 'undefined' && process.versions?.node && !isEdgeRuntime()) {
  createNodeClient().then(client => {
    _lazyPrisma = client
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client
    }
  }).catch(console.error)
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
export type DbClient = any