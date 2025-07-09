import { neon } from '@neondatabase/serverless'

// Initialize Neon serverless client with configuration
const databaseUrl = process.env.DATABASE_UNPOOLED_URL

if (!databaseUrl) {
  throw new Error('DATABASE_UNPOOLED_URL environment variable is required')
}

// Use unpooled URL directly for serverless
const serverlessUrl = databaseUrl

const sql = neon(serverlessUrl, {
  fetchConnectionCache: true,
  fullResults: false,
  arrayMode: false
})

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

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    await withTimeout(() => sql`SELECT 1`, 10000, 1)
    return true
  } catch (error) {
    console.error('Neon database health check failed:', error)
    return false
  }
}

// Direct health check access
export { healthCheck as dbHealthCheck }

export { sql }