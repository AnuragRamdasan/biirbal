import { prisma, disconnectPrisma } from './prisma'
import { logDatabaseHealth } from './db-health'

// Track connection usage
let activeConnections = 0
const MAX_CONNECTIONS = 8 // Conservative limit for serverless environments

export async function withDatabaseCleanup<T>(
  operation: () => Promise<T>,
  operationName: string = 'database-operation'
): Promise<T> {
  const startTime = Date.now()
  
  // Check connection limit
  if (activeConnections >= MAX_CONNECTIONS) {
    console.warn(`🚨 Connection limit reached (${activeConnections}/${MAX_CONNECTIONS}), forcing cleanup`)
    await disconnectPrisma()
    activeConnections = 0
  }
  
  activeConnections++
  
  try {
    const result = await operation()
    
    const duration = Date.now() - startTime
    if (duration > 5000) { // Log slow operations
      console.warn(`🐌 Slow database operation: ${operationName} took ${duration}ms`)
    }
    
    return result
  } catch (error) {
    console.error(`❌ Database operation failed: ${operationName}`, error)
    
    // Force disconnect on connection errors
    if (error instanceof Error && 
        (error.message.includes('connection pool') || 
         error.message.includes('Timed out fetching'))) {
      console.warn('🔄 Connection pool error detected, forcing disconnect')
      await disconnectPrisma()
      activeConnections = 0
    }
    
    throw error
  } finally {
    activeConnections = Math.max(0, activeConnections - 1)
    
    // Log health periodically for monitoring
    if (Math.random() < 0.05) { // 5% chance to log health
      await logDatabaseHealth()
    }
    
    // Periodic cleanup when many connections have been used
    if (activeConnections === 0 && Math.random() < 0.1) {
      await disconnectPrisma()
    }
  }
}

export function createRequestCleanupMiddleware() {
  return async (request: Request, handler: () => Promise<Response>): Promise<Response> => {
    const startTime = Date.now()
    const requestId = Math.random().toString(36).substring(7)
    
    try {
      console.log(`[${requestId}] Request started: ${request.method} ${request.url}`)
      
      const response = await handler()
      
      const duration = Date.now() - startTime
      console.log(`[${requestId}] Request completed in ${duration}ms`)
      
      return response
    } catch (error) {
      console.error(`[${requestId}] Request failed:`, error)
      throw error
    } finally {
      // Force cleanup for long-running requests or after processing
      const duration = Date.now() - startTime
      if (duration > 8000) { // 8 seconds (reduced threshold)
        console.warn(`[${requestId}] Long-running request detected (${duration}ms), forcing cleanup`)
        try {
          await disconnectPrisma()
          activeConnections = 0
        } catch (cleanupError) {
          console.error(`[${requestId}] Cleanup failed:`, cleanupError)
        }
      } else if (Math.random() < 0.2) { // 20% chance for regular cleanup
        try {
          await disconnectPrisma()
        } catch (cleanupError) {
          console.error(`[${requestId}] Background cleanup failed:`, cleanupError)
        }
      }
    }
  }
}

// Export connection stats for monitoring
export const getConnectionStats = () => ({
  activeConnections,
  maxConnections: MAX_CONNECTIONS,
  utilizationPercent: Math.round((activeConnections / MAX_CONNECTIONS) * 100)
})