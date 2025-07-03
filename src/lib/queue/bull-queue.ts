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
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50,     // Keep last 50 failed jobs
    attempts: 3,          // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,        // Start with 2 second delay
    },
  },
  settings: {
    stalledInterval: 30 * 1000,    // Check for stalled jobs every 30 seconds
    maxStalledCount: 1,            // Max number of times a job can be stalled
  }
})

// Process jobs with configurable concurrency
linkProcessingQueue.process('process-link', 3, async (job) => { // Process up to 3 jobs concurrently
  const { data } = job
  
  console.log(`🐂 Bull processing job ${job.id} for URL: ${data.url}`)
  
  // Update job progress
  await job.progress(0)
  
  try {
    // Process the link
    await processLink(data)
    
    // Mark as complete
    await job.progress(100)
    
    console.log(`✅ Bull job ${job.id} completed successfully`)
    
    return { success: true, url: data.url }
  } catch (error) {
    console.error(`❌ Bull job ${job.id} failed:`, error)
    throw error // Let Bull handle retries
  }
})

// Event listeners for monitoring
linkProcessingQueue.on('completed', (job, result) => {
  console.log(`🎉 Bull job ${job.id} completed:`, result)
})

linkProcessingQueue.on('failed', (job, err) => {
  console.error(`💥 Bull job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message)
})

linkProcessingQueue.on('stalled', (job) => {
  console.warn(`⏰ Bull job ${job.id} stalled and will be retried`)
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

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down Bull queue gracefully...')
  await linkProcessingQueue.close()
})

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Bull queue gracefully...')
  await linkProcessingQueue.close()
})

// Queue management functions
export const queueManager = {
  /**
   * Add a link processing job to the queue
   */
  async addLinkProcessingJob(data: ProcessLinkJobData, options: {
    priority?: number
    delay?: number
  } = {}) {
    const job = await linkProcessingQueue.add('process-link', data, {
      priority: options.priority || 0, // Higher numbers = higher priority
      delay: options.delay || 0,       // Delay in milliseconds
    })
    
    console.log(`📝 Bull job ${job.id} added to queue for URL: ${data.url}`)
    return job
  },

  /**
   * Get queue statistics
   */
  async getStats() {
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
    
    console.log('🧹 Bull queue cleaned')
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
  }
}

export default linkProcessingQueue