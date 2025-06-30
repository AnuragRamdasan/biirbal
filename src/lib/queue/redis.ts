/**
 * Simple Redis Queue
 * 
 * Basic Redis-only queue implementation with no Vercel KV complexity.
 * Just needs REDIS_URL environment variable.
 */

import Redis from 'ioredis'

let redisClient: Redis | null = null

/**
 * Initialize Redis connection
 */
async function initializeRedis() {
  if (redisClient) return redisClient

  const redisUrl = process.env.REDIS_URL
  
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required')
  }

  redisClient = new Redis(redisUrl, {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true
  })
  
  console.log('🔌 Connecting to Redis:', redisUrl.replace(/:([^:/@]+)@/, ':***@'))
  
  // Test connection
  try {
    await redisClient.ping()
    console.log('✅ Redis connection successful')
  } catch (error) {
    console.error('❌ Redis connection failed:', error)
    throw error
  }
  
  return redisClient
}

/**
 * Simple Redis interface
 */
export const redis = {
  async hset(key: string, field: string | object, value?: any) {
    const client = await initializeRedis()
    if (typeof field === 'object') {
      // Convert object to flat key-value pairs, stringifying complex values
      const flattened: Record<string, string> = {}
      for (const [k, v] of Object.entries(field)) {
        flattened[k] = typeof v === 'object' ? JSON.stringify(v) : String(v)
      }
      return client.hset(key, flattened)
    }
    return client.hset(key, field, typeof value === 'object' ? JSON.stringify(value) : String(value))
  },

  async hgetall(key: string) {
    const client = await initializeRedis()
    const result = await client.hgetall(key)
    
    // Convert Redis hash back to proper object with type conversion
    if (!result || Object.keys(result).length === 0) return null
    
    const converted: any = {}
    for (const [k, v] of Object.entries(result)) {
      // Try to parse JSON values, fall back to original value
      try {
        if (v.startsWith('{') || v.startsWith('[')) {
          converted[k] = JSON.parse(v)
        } else if (v === 'true' || v === 'false') {
          converted[k] = v === 'true'
        } else if (!isNaN(Number(v)) && v !== '') {
          converted[k] = Number(v)
        } else {
          converted[k] = v
        }
      } catch {
        converted[k] = v
      }
    }
    
    return converted
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
    
    // Convert to standard format: [{ member, score }]
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
  }
}

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL
}

/**
 * Close Redis connection
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}