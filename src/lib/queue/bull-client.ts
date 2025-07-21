/**
 * Bull Queue Client
 * 
 * Simple interface that matches the original queue client API
 * but uses Bull under the hood for better reliability
 */

import { queueManager, ProcessLinkJobData, linkProcessingQueue } from './bull-queue'
import { processLink } from '@/lib/link-processor'

class BullQueueClient {
  private initialized = false
  
  private async ensureInitialized() {
    if (!this.initialized) {
      console.log('🔄 Ensuring Bull queue processor is initialized...')
      // Simply importing linkProcessingQueue will initialize the processor
      await linkProcessingQueue.isReady()
      this.initialized = true
      console.log('✅ Bull queue processor initialized')
    }
  }
  /**
   * Add a job to the queue
   */
  async add(
    type: 'PROCESS_LINK',
    data: ProcessLinkJobData,
    options: { priority?: number; maxRetries?: number } = {}
  ): Promise<string> {
    console.log(`🐂 Adding ${type} job to Bull queue`, { url: data.url })
    
    try {
      // Ensure processor is initialized
      await this.ensureInitialized()
      
      // Bull uses priority differently (higher number = higher priority)
      // Convert our priority (1-10) to Bull's priority (10-1)
      const bullPriority = options.priority ? 11 - options.priority : 5
      
      const job = await queueManager.addLinkProcessingJob(data, {
        priority: bullPriority
      })
      
      return job.id.toString()
    } catch (error) {
      console.error('🚨 Bull queue add failed, falling back to direct processing:', error)
      
      // Fallback to direct processing
      setImmediate(async () => {
        try {
          await processLink(data)
          console.log(`✅ Fallback processing completed for ${data.url}`)
        } catch (fallbackError) {
          console.error(`❌ Fallback processing failed for ${data.url}:`, fallbackError)
        }
      })
      
      return `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  }

  /**
   * Get job status
   */
  async getStatus(jobId: string) {
    try {
      await this.ensureInitialized()
      const job = await queueManager.getJob(jobId)
      if (!job) return null

      const state = await job.getState()
      
      return {
        id: jobId,
        status: state as 'pending' | 'processing' | 'completed' | 'failed',
        result: state === 'completed' ? { message: 'Job completed successfully' } : undefined,
        error: state === 'failed' ? {
          message: job.failedReason || 'Unknown error',
          retryable: job.attemptsMade < (job.opts?.attempts || 3)
        } : undefined,
        timestamps: {
          created: job.timestamp,
          started: job.processedOn || undefined,
          completed: job.finishedOn || undefined
        }
      }
    } catch (error) {
      console.error('🚨 Get status failed:', error)
      return null
    }
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    try {
      await this.ensureInitialized()
      const stats = await queueManager.getStats()
      
      return {
        pending: stats.waiting + stats.delayed,
        processing: stats.active,
        completed: stats.completed,
        failed: stats.failed,
        avgProcessingTime: 0, // Bull doesn't provide this easily
        healthy: stats.failed < stats.completed * 0.1
      }
    } catch (error) {
      console.error('🚨 Get stats failed:', error)
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
   * Health check
   */
  async healthCheck() {
    try {
      await this.ensureInitialized()
      const health = await queueManager.getHealth()
      const stats = await this.getStats()
      
      const issues: string[] = []
      
      if (health.paused) {
        issues.push('Queue is paused')
      }
      
      if (!health.redis.connected) {
        issues.push('Redis connection lost')
      }
      
      if (stats.failed > stats.completed * 0.1) {
        issues.push(`High failure rate: ${stats.failed} failed vs ${stats.completed} completed`)
      }
      
      return {
        healthy: health.healthy && issues.length === 0,
        issues,
        stats
      }
    } catch {
      return {
        healthy: false,
        issues: ['Health check failed'],
        stats: await this.getStats()
      }
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanup() {
    try {
      await queueManager.clean()
      return { cleaned: 0, reset: 0 } // Bull handles this automatically
    } catch (error) {
      console.error('🚨 Cleanup failed:', error)
      return { cleaned: 0, reset: 0 }
    }
  }
}

// Export singleton instance that matches original API
export const queueClient = new BullQueueClient()
export default queueClient