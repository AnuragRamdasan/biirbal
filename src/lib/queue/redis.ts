/**
 * Redis Adapter
 * 
 * Universal Redis adapter that works with both Vercel KV and standard Redis instances.
 * Automatically detects which type to use based on environment variables.
 */

import Redis from 'ioredis'

let redisClient: Redis | null = null
let useVercelKV = false

/**
 * Initialize Redis connection
 */
async function initializeRedis() {
  if (redisClient) return redisClient

  // Check if Vercel KV is available
  const vercelKVUrl = process.env.KV_REST_API_URL
  const vercelKVToken = process.env.KV_REST_API_TOKEN
  
  // Check if standard Redis URL is available  
  const redisUrl = process.env.REDIS_URL
  
  if (vercelKVUrl || vercelKVToken) {
    // Use Vercel KV
    useVercelKV = true
    const { kv } = await import('@vercel/kv')
    console.log('🔌 Using Vercel KV for queue storage')
    return kv as any // Cast to Redis-like interface
  } else if (redisUrl) {
    // Use standard Redis
    useVercelKV = false
    redisClient = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    })
    
    console.log('🔌 Using Redis for queue storage:', redisUrl.replace(/:([^:]+)@/, ':***@'))
    
    // Test connection
    try {
      await redisClient.ping()
      console.log('✅ Redis connection successful')
    } catch (error) {
      console.error('❌ Redis connection failed:', error)
      throw error
    }
    
    return redisClient
  } else {
    throw new Error('No Redis configuration found. Set REDIS_URL or KV_REST_API_URL/KV_REST_API_TOKEN')
  }
}

/**
 * Redis interface that works with both Vercel KV and standard Redis
 */
export const redis = {
  async hset(key: string, field: string | object, value?: any) {
    const client = await initializeRedis()
    if (typeof field === 'object') {
      return client.hset(key, field)
    }
    return client.hset(key, field, value)
  },

  async hgetall(key: string) {
    const client = await initializeRedis()
    return client.hgetall(key)
  },

  async zadd(key: string, score: number | { score: number; member: string }, member?: string) {
    const client = await initializeRedis()
    if (typeof score === 'object') {
      return client.zadd(key, score.score, score.member)
    }
    return client.zadd(key, score, member!)
  },

  async zrem(key: string, member: string) {
    const client = await initializeRedis()
    return client.zrem(key, member)
  },

  async zpopmax(key: string, count: number = 1) {
    const client = await initializeRedis()
    const result = await client.zpopmax(key, count)
    
    // Convert to Vercel KV format: [{ member, score }]
    if (Array.isArray(result) && result.length > 0) {
      const formatted = []
      for (let i = 0; i < result.length; i += 2) {
        formatted.push({
          member: result[i],
          score: parseFloat(result[i + 1])
        })
      }
      return formatted
    }
    return []
  },

  async zcard(key: string) {
    const client = await initializeRedis()
    return client.zcard(key)
  },

  async zrangebyscore(key: string, min: number | string, max: number | string) {
    const client = await initializeRedis()
    return client.zrangebyscore(key, min, max)
  },

  async incr(key: string) {
    const client = await initializeRedis()
    return client.incr(key)
  },

  async get(key: string) {
    const client = await initializeRedis()
    return client.get(key)
  },

  async del(key: string) {
    const client = await initializeRedis()
    return client.del(key)
  },

  async ping() {
    const client = await initializeRedis()
    return client.ping()
  }
}

/**
 * Check if Redis is properly configured
 */
export function isRedisConfigured(): boolean {
  const vercelKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  const standardRedis = !!process.env.REDIS_URL
  return vercelKV || standardRedis
}

/**
 * Close Redis connection (for cleanup)
 */
export async function closeRedis() {
  if (redisClient && !useVercelKV) {
    await redisClient.quit()
    redisClient = null
  }
}