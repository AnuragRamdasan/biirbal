/**
 * Bull Queue Implementation
 * 
 * Robust queue system using Bull for Redis-backed job processing
 */

import Bull from 'bull'
import { processLink } from '@/lib/link-processor'

// Job data interface
export interface ProcessLinkJobData {
  url: string
  messageTs: string
  channelId: string
  teamId: string
  slackTeamId: string
}

// Create the queue instance
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
console.log('🐂 Initializing Bull queue with Redis:', redisUrl.replace(/:([^:/@]+)@/, ':***@'))

export const linkProcessingQueue = new Bull<ProcessLinkJobData>('link processing', {
  redis: redisUrl,
  defaultJobOptions: {
    removeOnComplete: 5,  // Keep fewer completed jobs to reduce memory
    removeOnFail: 20,     // Keep fewer failed jobs
    attempts: 3,          // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,        // Start with 2 second delay
    },
    jobId: undefined,     // Let Bull generate unique job IDs
  },
  settings: {
    stalledInterval: 60 * 1000,     // Check for stalled jobs every 60 seconds
    maxStalledCount: 2,             // Reduce stalled count to prevent lock issues
    retryProcessDelay: 3000,        // Faster retry delay
  }
})

// Initialize processor flag to prevent multiple processors
let processorInitialized = false

// Process jobs with configurable concurrency
if (!processorInitialized) {
  linkProcessingQueue.process('process-link', 2, async (job) => { // Reduced concurrency to 2
    const { data } = job
    const startTime = Date.now()
    
    console.log(`🐂 Bull processing job ${job.id} for URL: ${data.url}`)
    
    try {
      // Update job progress
      await job.progress(10)
      
      // Add timeout wrapper for long-running jobs
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Job timed out after 2 minutes')), 2 * 60 * 1000)
      })
      
      // Process the link with timeout
      const result = await Promise.race([
        processLink(data),
        timeoutPromise
      ])
      
      // Mark as complete
      await job.progress(100)
      
      const duration = Date.now() - startTime
      console.log(`✅ Bull job ${job.id} completed successfully in ${duration}ms`)
      
      return { success: true, url: data.url, duration }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ Bull job ${job.id} failed after ${duration}ms:`, error)
      
      // Update progress to indicate failure
      await job.progress(0)
      
      // Throw error for Bull to handle retries
      throw error
    }
  })
  
  processorInitialized = true
  console.log('🐂 Bull processor initialized with 2 concurrent workers')
}

// Event listeners for monitoring
linkProcessingQueue.on('completed', (job, result) => {
  console.log(`🎉 Bull job ${job.id} completed:`, result)
})

linkProcessingQueue.on('failed', (job, err) => {
  console.error(`💥 Bull job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message)
  
  // Handle specific Redis lock errors
  if (err.message.includes('Missing lock') || err.message.includes('lock')) {
    console.warn(`🔒 Redis lock error detected for job ${job.id}, this is usually not critical`)
  }
})

linkProcessingQueue.on('stalled', (job) => {
  console.warn(`⏰ Bull job ${job.id} stalled and will be retried. Attempt ${job.attemptsMade}/${job.opts.attempts}`)
  
  // If this is the final attempt, log more details
  if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
    console.error(`🚨 Bull job ${job.id} has stalled ${job.attemptsMade} times. Final attempt.`)
  }
})

linkProcessingQueue.on('progress', (job, progress) => {
  console.log(`📊 Bull job ${job.id} progress: ${progress}%`)
})

linkProcessingQueue.on('waiting', (jobId) => {
  console.log(`⏳ Bull job ${jobId} is waiting`)
})

linkProcessingQueue.on('active', (job) => {
  console.log(`🚀 Bull job ${job.id} started processing`)
})

// Handle Redis connection errors and lock issues
linkProcessingQueue.on('error', (error) => {
  if (error.message.includes('Missing lock') || error.message.includes('lock')) {
    console.warn('🔒 Redis lock warning (non-critical):', error.message)
  } else {
    console.error('🚨 Bull queue error:', error)
  }
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down Bull queue gracefully...')
  await linkProcessingQueue.close()
})

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Bull queue gracefully...')
  await linkProcessingQueue.close()
})

// Helper function to handle Redis lock errors
async function withRedisLockRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error.message.includes('Missing lock') || error.message.includes('lock')) {
      console.warn(`🔒 Redis lock warning in ${operationName} (retrying):`, error.message)
      // Wait a bit and retry once
      await new Promise(resolve => setTimeout(resolve, 1000))
      return await operation()
    } else {
      throw error
    }
  }
}

// Queue management functions
export const queueManager = {
  /**
   * Add a link processing job to the queue
   */
  async addLinkProcessingJob(data: ProcessLinkJobData, options: {
    priority?: number
    delay?: number
  } = {}) {
    try {
      const job = await linkProcessingQueue.add('process-link', data, {
        priority: options.priority || 0, // Higher numbers = higher priority
        delay: options.delay || 0,       // Delay in milliseconds
      })
      
      console.log(`📝 Bull job ${job.id} added to queue for URL: ${data.url}`)
      return job
    } catch (error) {
      if (error.message.includes('Missing lock') || error.message.includes('lock')) {
        console.warn('🔒 Redis lock warning while adding job (retrying):', error.message)
        // Retry once after a short delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        const job = await linkProcessingQueue.add('process-link', data, {
          priority: options.priority || 0,
          delay: options.delay || 0,
        })
        console.log(`📝 Bull job ${job.id} added to queue for URL: ${data.url} (retry successful)`)
        return job
      } else {
        throw error
      }
    }
  },

  /**
   * Get queue statistics
   */
  async getStats() {
    return withRedisLockRetry(async () => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        linkProcessingQueue.getWaiting(),
        linkProcessingQueue.getActive(),
        linkProcessingQueue.getCompleted(),
        linkProcessingQueue.getFailed(),
        linkProcessingQueue.getDelayed(),
      ])

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      }
    }, 'getStats')
  },

  /**
   * Get job by ID
   */
  async getJob(jobId: string) {
    return await linkProcessingQueue.getJob(jobId)
  },

  /**
   * Clean old jobs
   */
  async clean() {
    // Clean completed jobs older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    await linkProcessingQueue.clean(oneHourAgo, 'completed')
    
    // Clean failed jobs older than 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    await linkProcessingQueue.clean(oneDayAgo, 'failed')
    
    // Clean stalled jobs older than 2 hours
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
    await linkProcessingQueue.clean(twoHoursAgo, 'stalled')
    
    console.log('🧹 Bull queue cleaned (completed, failed, and stalled jobs)')
  },

  /**
   * Pause the queue
   */
  async pause() {
    await linkProcessingQueue.pause()
    console.log('⏸️  Bull queue paused')
  },

  /**
   * Resume the queue
   */
  async resume() {
    await linkProcessingQueue.resume()
    console.log('▶️  Bull queue resumed')
  },

  /**
   * Get queue health
   */
  async getHealth() {
    const stats = await this.getStats()
    const isPaused = await linkProcessingQueue.isPaused()
    
    return {
      healthy: !isPaused && stats.failed < stats.completed * 0.1,
      paused: isPaused,
      stats,
      redis: {
        connected: linkProcessingQueue.client.status === 'ready'
      }
    }
  },

  /**
   * Clean up stalled jobs manually
   */
  async cleanStalledJobs() {
    try {
      // Get all stalled jobs
      const stalled = await linkProcessingQueue.getJobs(['stalled'])
      
      console.log(`🔧 Found ${stalled.length} stalled jobs`)
      
      // Clean stalled jobs older than 30 minutes
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000
      await linkProcessingQueue.clean(thirtyMinutesAgo, 'stalled')
      
      // Force retry stalled jobs that are recent
      let retriedCount = 0
      for (const job of stalled) {
        const jobAge = Date.now() - job.timestamp
        if (jobAge < thirtyMinutesAgo) {
          await job.retry()
          retriedCount++
        }
      }
      
      console.log(`🔄 Retried ${retriedCount} recent stalled jobs`)
      
      return { cleaned: stalled.length - retriedCount, retried: retriedCount }
    } catch (error) {
      console.error('🚨 Failed to clean stalled jobs:', error)
      return { cleaned: 0, retried: 0 }
    }
  }
}

export default linkProcessingQueue