import { prisma } from './prisma'
import { logDatabaseHealth } from './db-health'

export async function withDatabaseCleanup<T>(
  operation: () => Promise<T>,
  operationName: string = 'database-operation'
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const result = await operation()
    
    const duration = Date.now() - startTime
    if (duration > 5000) { // Log slow operations
      console.warn(`Slow database operation: ${operationName} took ${duration}ms`)
    }
    
    return result
  } catch (error) {
    console.error(`Database operation failed: ${operationName}`, error)
    throw error
  } finally {
    // Log health periodically for monitoring
    if (Math.random() < 0.1) { // 10% chance to log health
      await logDatabaseHealth()
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
      // Force cleanup for long-running requests
      const duration = Date.now() - startTime
      if (duration > 10000) { // 10 seconds
        console.warn(`[${requestId}] Long-running request detected, forcing cleanup`)
        try {
          await prisma.$disconnect()
        } catch (cleanupError) {
          console.error(`[${requestId}] Cleanup failed:`, cleanupError)
        }
      }
    }
  }
}