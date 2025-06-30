/**
 * Simple Redis Queue Client
 * 
 * Basic Redis queue implementation with no Vercel KV complexity.
 * Just needs REDIS_URL environment variable.
 */

import { JobPayload, JobStatus, QueueStats } from './types'
import { processFallback, shouldUseFallback } from './fallback'
import { redis, isRedisConfigured } from './redis'

class QueueClient {
  /**
   * Add a new job to the queue
   */
  async add(
    type: 'PROCESS_LINK',
    data: JobPayload['data'],
    options: Partial<Pick<JobPayload, 'priority' | 'maxRetries'>> = {}
  ): Promise<string> {
    const jobId = `job:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`
    
    // Check if we should use fallback mode
    if (shouldUseFallback()) {
      console.log(`⚠️  Redis not configured, processing directly`)
      
      // Process the job directly in the background
      processFallback(data).catch(error => {
        console.error('Fallback processing failed:', error)
      })
      
      return jobId
    }

    try {
      const now = Date.now()

      const job: JobPayload = {
        id: jobId,
        type,
        data,
        priority: options.priority ?? 1,
        maxRetries: options.maxRetries ?? 3,
        retryCount: 0,
        createdAt: now,
        updatedAt: now
      }

      // Store job data
      await redis.hset(`job:${jobId}`, job)

      // Add to pending queue (sorted by priority)
      await redis.zadd('queue:pending', { score: job.priority, member: jobId })

      // Update stats
      await redis.incr('stats:jobs:added')

      console.log(`✅ Job ${jobId} added to queue`, { type, priority: job.priority })
      
      return jobId
    } catch (error) {
      console.error(`🚨 Queue add failed:`, error)
      
      // Fallback to direct processing if Redis fails
      processFallback(data).catch(fallbackError => {
        console.error('Fallback processing failed:', fallbackError)
      })
      
      return jobId
    }
  }

  /**
   * Get job status and details
   */
  async getStatus(jobId: string): Promise<JobStatus | null> {
    if (!isRedisConfigured()) return null

    try {
      const job = await redis.hgetall(`job:${jobId}`) as JobPayload | null
      if (!job) return null

      // Determine current status
      let status: JobStatus['status'] = 'pending'
      
      if (job.completedAt) {
        status = job.error ? 'failed' : 'completed'
      } else if (job.startedAt) {
        status = 'processing'
      }

      return {
        id: job.id,
        status,
        result: status === 'completed' ? { message: 'Job completed successfully' } : undefined,
        error: job.error ? {
          message: job.error,
          retryable: job.retryCount < job.maxRetries
        } : undefined,
        timestamps: {
          created: job.createdAt,
          started: job.startedAt,
          completed: job.completedAt
        }
      }
    } catch (error) {
      console.error(`🚨 Get status failed:`, error)
      return null
    }
  }

  /**
   * Get the next job from the queue for processing
   */
  async getNext(workerId: string): Promise<JobPayload | null> {
    if (!isRedisConfigured()) return null

    try {
      // Get highest priority job from pending queue
      const result = await redis.zpopmax('queue:pending', 1)
      if (!result || result.length === 0) return null

      const jobId = result[0].member as string
      const job = await redis.hgetall(`job:${jobId}`) as JobPayload | null
      
      if (!job || !job.id) {
        console.error(`🚨 Job ${jobId} not found or invalid`)
        return null
      }

      // Ensure proper data types
      const processedJob: JobPayload = {
        id: String(job.id),
        type: job.type as 'PROCESS_LINK',
        data: typeof job.data === 'object' ? job.data : JSON.parse(job.data || '{}'),
        priority: Number(job.priority || 1),
        maxRetries: Number(job.maxRetries || 3),
        retryCount: Number(job.retryCount || 0),
        createdAt: Number(job.createdAt),
        updatedAt: Number(job.updatedAt)
      }

      // Mark job as processing
      const now = Date.now()
      processedJob.startedAt = now
      processedJob.updatedAt = now

      await redis.hset(`job:${jobId}`, {
        startedAt: now,
        updatedAt: now
      })

      // Add to processing queue with 5 minute timeout
      await redis.zadd('queue:processing', {
        score: now + 300000,
        member: jobId
      })

      console.log(`🎯 Job ${jobId} assigned to worker ${workerId}`)
      
      return processedJob
    } catch (error) {
      console.error(`🚨 Get next failed:`, error)
      return null
    }
  }

  /**
   * Mark job as completed
   */
  async complete(jobId: string): Promise<void> {
    if (!isRedisConfigured()) return

    try {
      const now = Date.now()

      await redis.hset(`job:${jobId}`, {
        completedAt: now,
        updatedAt: now
      })

      // Remove from processing queue
      await redis.zrem('queue:processing', jobId)

      // Update stats
      await redis.incr('stats:jobs:completed')

      console.log(`✅ Job ${jobId} completed successfully`)
    } catch (error) {
      console.error(`🚨 Complete failed:`, error)
    }
  }

  /**
   * Mark job as failed
   */
  async fail(jobId: string, error: string, retryable: boolean = true): Promise<void> {
    if (!isRedisConfigured()) return

    try {
      const job = await redis.hgetall(`job:${jobId}`) as JobPayload | null
      if (!job || !job.id) {
        console.error(`🚨 Job ${jobId} not found or invalid`)
        return
      }

      const now = Date.now()
      const currentRetryCount = Number(job.retryCount || 0)
      const maxRetries = Number(job.maxRetries || 3)
      const newRetryCount = currentRetryCount + 1

      // Remove from processing queue
      await redis.zrem('queue:processing', jobId)

      if (retryable && newRetryCount < maxRetries) {
        // Retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 60000)

        await redis.hset(`job:${jobId}`, {
          retryCount: newRetryCount,
          updatedAt: now,
          error
        })

        // Add back to pending queue with delay
        setTimeout(async () => {
          try {
            await redis.zadd('queue:pending', { score: Number(job.priority || 1), member: jobId })
          } catch (retryError) {
            console.error(`🚨 Retry scheduling failed:`, retryError)
          }
        }, delay)

        console.log(`🔄 Job ${jobId} scheduled for retry ${newRetryCount}/${maxRetries} in ${delay}ms`)
      } else {
        // Max retries reached or not retryable
        await redis.hset(`job:${jobId}`, {
          completedAt: now,
          retryCount: newRetryCount,
          updatedAt: now,
          error
        })

        await redis.incr('stats:jobs:failed')
        console.log(`❌ Job ${jobId} failed permanently: ${error}`)
      }
    } catch (failError) {
      console.error(`🚨 Fail operation failed:`, failError)
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    if (!isRedisConfigured()) {
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
        healthy: true
      }
    }

    try {
      const [pending, processing, completed, failed] = await Promise.all([
        redis.zcard('queue:pending'),
        redis.zcard('queue:processing'),
        redis.get('stats:jobs:completed') || 0,
        redis.get('stats:jobs:failed') || 0
      ])

      return {
        pending: pending || 0,
        processing: processing || 0,
        completed: Number(completed),
        failed: Number(failed),
        avgProcessingTime: 0,
        healthy: (processing || 0) < 100
      }
    } catch (error) {
      console.error(`🚨 Get stats failed:`, error)
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
        healthy: false
      }
    }
  }

  /**
   * Clean up old jobs and reset stuck jobs
   */
  async cleanup(): Promise<{ cleaned: number, reset: number }> {
    if (!isRedisConfigured()) {
      return { cleaned: 0, reset: 0 }
    }

    try {
      const now = Date.now()
      const stuckCutoff = now - 600000 // 10 minutes

      // Reset stuck jobs
      const stuckJobs = await redis.zrangebyscore('queue:processing', 0, stuckCutoff)
      let resetCount = 0

      for (const jobId of stuckJobs) {
        try {
          const job = await redis.hgetall(`job:${jobId}`) as JobPayload | null
          if (job && job.retryCount < job.maxRetries) {
            await redis.zrem('queue:processing', jobId)
            await redis.zadd('queue:pending', { score: job.priority, member: jobId })
            await redis.hset(`job:${jobId}`, {
              updatedAt: now
            })
            resetCount++
          }
        } catch (jobError) {
          console.error(`🚨 Reset job ${jobId} failed:`, jobError)
        }
      }

      console.log(`🧹 Cleanup complete: 0 cleaned, ${resetCount} reset`)
      
      return { cleaned: 0, reset: resetCount }
    } catch (error) {
      console.error(`🚨 Cleanup failed:`, error)
      return { cleaned: 0, reset: 0 }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean
    issues: string[]
    stats: QueueStats
  }> {
    const stats = await this.getStats()
    const issues: string[] = []

    if (!isRedisConfigured()) {
      issues.push('Redis not configured')
    }

    if (stats.processing > 50) {
      issues.push(`Too many processing jobs: ${stats.processing}`)
    }

    if (stats.failed > stats.completed * 0.1) {
      issues.push(`High failure rate: ${stats.failed} failed vs ${stats.completed} completed`)
    }

    const healthy = issues.length === 0

    return {
      healthy,
      issues,
      stats
    }
  }
}

// Export singleton instance
export const queueClient = new QueueClient()