/**
 * Queue Client for Vercel KV
 * 
 * Production-ready job queue implementation using Vercel KV as the backing store.
 * Supports distributed workers, automatic retries, and comprehensive monitoring.
 * 
 * @example
 * ```typescript
 * import { queueClient } from '@/lib/queue/client'
 * 
 * // Add a job
 * const jobId = await queueClient.add('PROCESS_LINK', {
 *   url: 'https://example.com',
 *   messageTs: '123',
 *   channelId: 'C123',
 *   teamId: 'T123',
 *   slackTeamId: 'ST123'
 * })
 * 
 * // Check job status
 * const status = await queueClient.getStatus(jobId)
 * ```
 */

import { JobPayload, JobStatus, QueueStats, QueueConfig } from './types'
import { processFallback, shouldUseFallback } from './fallback'
import { redis, isRedisConfigured } from './redis'

class QueueClient {
  private config: QueueConfig

  constructor() {
    this.config = {
      redis: {
        url: process.env.KV_REST_API_URL || process.env.REDIS_URL,
        token: process.env.KV_REST_API_TOKEN
      },
      defaults: {
        priority: 1,
        maxRetries: 3,
        timeout: 300000 // 5 minutes
      },
      maintenance: {
        cleanupInterval: 600000, // 10 minutes
        retentionPeriod: 86400000, // 24 hours
        stuckJobTimeout: 600000 // 10 minutes
      }
    }
  }

  /**
   * Check if Redis/KV is properly configured
   */
  private isKVConfigured(): boolean {
    return isRedisConfigured()
  }

  /**
   * Handle KV configuration errors gracefully
   */
  private handleKVError(operation: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (!this.isKVConfigured()) {
      console.warn(`⚠️  Queue ${operation} skipped: Redis not configured. Set KV_REST_API_URL or REDIS_URL environment variable.`)
    } else {
      console.error(`🚨 Queue ${operation} failed:`, errorMessage)
    }
  }

  /**
   * Add a new job to the queue
   * 
   * @param type - Job type
   * @param data - Job data payload
   * @param options - Job options (priority, retries, etc.)
   * @returns Job ID
   */
  async add(
    type: 'PROCESS_LINK',
    data: JobPayload['data'],
    options: Partial<Pick<JobPayload, 'priority' | 'maxRetries'>> = {}
  ): Promise<string> {
    const jobId = `job:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`
    
    // Check if we should use fallback mode
    if (shouldUseFallback()) {
      console.log(`⚠️  Queue not available, processing directly`)
      
      // Process the job directly in the background (fire and forget)
      processFallback(data).catch(error => {
        console.error('Fallback processing failed:', error)
      })
      
      return jobId
    }
    
    // Check if KV is configured
    if (!this.isKVConfigured()) {
      this.handleKVError('add', new Error('Vercel KV not configured'))
      return jobId // Return job ID even if queuing fails to prevent blocking
    }

    try {
      const now = Date.now()

      const job: JobPayload = {
        id: jobId,
        type,
        data,
        priority: options.priority ?? this.config.defaults.priority,
        maxRetries: options.maxRetries ?? this.config.defaults.maxRetries,
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
      this.handleKVError('add', error)
      return jobId // Return job ID even if queuing fails to prevent blocking
    }
  }

  /**
   * Get job status and details
   * 
   * @param jobId - Job identifier
   * @returns Job status or null if not found
   */
  async getStatus(jobId: string): Promise<JobStatus | null> {
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
  }

  /**
   * Get the next job from the queue for processing
   * 
   * @param workerId - Worker identifier
   * @returns Job payload or null if no jobs available
   */
  async getNext(workerId: string): Promise<JobPayload | null> {
    if (!this.isKVConfigured()) {
      this.handleKVError('getNext', new Error('Vercel KV not configured'))
      return null
    }

    try {
      // Get highest priority job from pending queue
      const result = await redis.zpopmax('queue:pending', 1)
      if (!result || result.length === 0) return null

      const jobId = result[0].member as string
      const job = await redis.hgetall(`job:${jobId}`) as JobPayload | null
      
      if (!job) return null

      // Mark job as processing
      const now = Date.now()
      job.startedAt = now
      job.updatedAt = now

      await redis.hset(`job:${jobId}`, {
        startedAt: now,
        updatedAt: now
      })

      // Add to processing queue with timeout
      await redis.zadd('queue:processing', {
        score: now + this.config.defaults.timeout,
        member: jobId
      })

      // Track worker
      await redis.hset(`worker:${workerId}`, {
        lastSeen: now,
        currentJob: jobId
      })

      console.log(`🎯 Job ${jobId} assigned to worker ${workerId}`)
      
      return job
    } catch (error) {
      this.handleKVError('getNext', error)
      return null
    }
  }

  /**
   * Mark job as completed
   * 
   * @param jobId - Job identifier
   * @param result - Job result data
   */
  async complete(jobId: string): Promise<void> {
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
  }

  /**
   * Mark job as failed
   * 
   * @param jobId - Job identifier
   * @param error - Error message
   * @param retryable - Whether job should be retried
   */
  async fail(jobId: string, error: string, retryable: boolean = true): Promise<void> {
    const job = await redis.hgetall(`job:${jobId}`) as JobPayload | null
    if (!job) return

    const now = Date.now()
    job.retryCount++
    job.updatedAt = now
    job.error = error

    // Remove from processing queue
    await redis.zrem('queue:processing', jobId)

    if (retryable && job.retryCount < job.maxRetries) {
      // Retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, job.retryCount - 1), 60000)
  
      await redis.hset(`job:${jobId}`, {
        retryCount: job.retryCount,
        updatedAt: now,
        error
      })

      // Add back to pending queue with delay
      setTimeout(async () => {
        await redis.zadd('queue:pending', { score: job.priority, member: jobId })
      }, delay)

      console.log(`🔄 Job ${jobId} scheduled for retry ${job.retryCount}/${job.maxRetries} in ${delay}ms`)
    } else {
      // Max retries reached or not retryable
      await redis.hset(`job:${jobId}`, {
        completedAt: now,
        retryCount: job.retryCount,
        updatedAt: now,
        error
      })

      await redis.incr('stats:jobs:failed')
      console.log(`❌ Job ${jobId} failed permanently: ${error}`)
    }
  }

  /**
   * Get queue statistics
   * 
   * @returns Queue statistics
   */
  async getStats(): Promise<QueueStats> {
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
      avgProcessingTime: 0, // TODO: Implement timing tracking
      healthy: (processing || 0) < 100 // Healthy if not too many stuck jobs
    }
  }

  /**
   * Clean up old jobs and reset stuck jobs
   * 
   * Called by cron job for maintenance
   */
  async cleanup(): Promise<{ cleaned: number, reset: number }> {
    const now = Date.now()
    const stuckCutoff = now - this.config.maintenance.stuckJobTimeout

    // Reset stuck jobs (processing too long)
    const stuckJobs = await redis.zrangebyscore('queue:processing', 0, stuckCutoff)
    let resetCount = 0

    for (const jobId of stuckJobs) {
      const job = await redis.hgetall(`job:${jobId}`) as JobPayload | null
      if (job && job.retryCount < job.maxRetries) {
        await redis.zrem('queue:processing', jobId)
        await redis.zadd('queue:pending', { score: job.priority, member: jobId })
        await redis.hset(`job:${jobId}`, {
          updatedAt: now,
          startedAt: undefined // Clear start time
        })
        resetCount++
      }
    }

    // TODO: Implement old job cleanup
    const cleanedCount = 0

    console.log(`🧹 Cleanup complete: ${cleanedCount} cleaned, ${resetCount} reset`)
    
    return { cleaned: cleanedCount, reset: resetCount }
  }

  /**
   * Health check - ensures queue is operating correctly
   * 
   * @returns Health status and metrics
   */
  async healthCheck(): Promise<{
    healthy: boolean
    issues: string[]
    stats: QueueStats
  }> {
    const stats = await this.getStats()
    const issues: string[] = []

    // Check for too many stuck jobs
    if (stats.processing > 50) {
      issues.push(`Too many processing jobs: ${stats.processing}`)
    }

    // Check for too many failed jobs
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