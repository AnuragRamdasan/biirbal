import { prisma } from './prisma'

export interface DatabaseHealth {
  isHealthy: boolean
  activeConnections: number
  totalConnections: number
  connectionPoolUsage: number
  queryLatency: number
  lastChecked: Date
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startTime = Date.now()
  
  try {
    // Health check query
    await prisma.$queryRaw`SELECT 1`
    
    // Get connection stats (PostgreSQL specific)
    const connectionStats = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
    `
    
    const totalConnectionStats = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count FROM pg_stat_activity
    `
    
    const activeConnections = Number(connectionStats[0]?.count || 0)
    const totalConnections = Number(totalConnectionStats[0]?.count || 0)
    const queryLatency = Date.now() - startTime
    
    const maxConnections = 50 // From our pool config
    const connectionPoolUsage = (activeConnections / maxConnections) * 100
    
    return {
      isHealthy: queryLatency < 1000 && connectionPoolUsage < 80,
      activeConnections,
      totalConnections,
      connectionPoolUsage,
      queryLatency,
      lastChecked: new Date()
    }
  } catch (error) {
    console.error('Database health check failed:', error)
    return {
      isHealthy: false,
      activeConnections: -1,
      totalConnections: -1,
      connectionPoolUsage: -1,
      queryLatency: Date.now() - startTime,
      lastChecked: new Date()
    }
  }
}

export async function logDatabaseHealth(): Promise<void> {
  const health = await checkDatabaseHealth()
  
  const logLevel = health.isHealthy ? 'info' : 'warn'
  console[logLevel]('Database Health Check:', {
    healthy: health.isHealthy,
    activeConnections: health.activeConnections,
    totalConnections: health.totalConnections,
    poolUsage: `${health.connectionPoolUsage.toFixed(1)}%`,
    latency: `${health.queryLatency}ms`,
    timestamp: health.lastChecked.toISOString()
  })
}

export async function forceConnectionCleanup(): Promise<void> {
  try {
    await prisma.$disconnect()
    console.log('✅ Database connections cleaned up')
  } catch (error) {
    console.error('❌ Failed to cleanup database connections:', error)
  }
}