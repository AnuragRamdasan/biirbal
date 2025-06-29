/**
 * Queue Worker for Vercel KV
 * 
 * Background worker that processes jobs from the Vercel KV queue.
 * Designed to run as Vercel serverless functions with proper timeout handling.
 * 
 * @example
 * ```typescript
 * import { processJobs } from '@/lib/queue/worker'
 * 
 * // In API route
 * await processJobs({ maxJobs: 5, timeout: 280000 })
 * ```
 */

import { queueClient } from './client'
import { JobPayload } from './types'
import { processLink } from '@/lib/link-processor'

export interface WorkerOptions {
  /** Maximum number of jobs to process in this invocation */
  maxJobs?: number
  /** Worker timeout in milliseconds (should be less than Vercel function timeout) */
  timeout?: number
  /** Worker identifier for tracking */
  workerId?: string
}

/**
 * Process jobs from the queue
 * 
 * This function is designed to be called from Vercel API routes
 * and will process jobs until timeout or max jobs reached.
 * 
 * @param options - Worker configuration options
 * @returns Processing results and statistics
 */
export async function processJobs(options: WorkerOptions = {}) {
  const {
    maxJobs = 10,
    timeout = 280000, // 4m 40s (leave 20s buffer for Vercel 5min timeout)
    workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  } = options

  const startTime = Date.now()
  const results = {
    processed: 0,
    completed: 0,
    failed: 0,
    workerId,
    duration: 0,
    jobs: [] as Array<{ id: string; status: 'completed' | 'failed'; error?: string; duration: number }>
  }

  console.log(`🚀 Worker ${workerId} starting job processing`, {
    maxJobs,
    timeout,
    startTime: new Date(startTime).toISOString()
  })

  try {
    while (results.processed < maxJobs) {
      // Check timeout with buffer
      const elapsed = Date.now() - startTime
      const timeoutBuffer = Math.min(30000, timeout * 0.1) // 30s or 10% of timeout, whichever is smaller
      if (elapsed > timeout - timeoutBuffer) {
        console.log(`⏱️  Worker ${workerId} stopping due to timeout approach`, {
          elapsed,
          timeout,
          processed: results.processed
        })
        break
      }

      // Get next job from queue
      const job = await queueClient.getNext(workerId)
      if (!job) {
        console.log(`😴 Worker ${workerId} found no jobs to process`)
        break
      }

      const jobStartTime = Date.now()
      console.log(`🎯 Worker ${workerId} processing job ${job.id}`, {
        type: job.type,
        priority: job.priority,
        retryCount: job.retryCount
      })

      try {
        // Process the job based on type
        await executeJob(job)
        
        // Mark job as completed
        await queueClient.complete(job.id)
        
        const jobDuration = Date.now() - jobStartTime
        results.completed++
        results.jobs.push({
          id: job.id,
          status: 'completed',
          duration: jobDuration
        })

        console.log(`✅ Worker ${workerId} completed job ${job.id}`, {
          duration: jobDuration,
          type: job.type
        })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const jobDuration = Date.now() - jobStartTime
        
        // Determine if error is retryable
        const retryable = isRetryableError(error)
        
        // Mark job as failed
        await queueClient.fail(job.id, errorMessage, retryable)
        
        results.failed++
        results.jobs.push({
          id: job.id,
          status: 'failed',
          error: errorMessage,
          duration: jobDuration
        })

        console.error(`❌ Worker ${workerId} failed job ${job.id}`, {
          error: errorMessage,
          duration: jobDuration,
          retryable,
          retryCount: job.retryCount
        })
      }

      results.processed++
    }

    results.duration = Date.now() - startTime

    console.log(`🏁 Worker ${workerId} finished processing`, {
      ...results,
      duration: results.duration,
      avgJobTime: results.processed > 0 ? results.duration / results.processed : 0
    })

    return results

  } catch (error) {
    console.error(`🚨 Worker ${workerId} encountered critical error`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: results.processed,
      duration: Date.now() - startTime
    })
    
    throw error
  }
}

/**
 * Execute a job based on its type
 * 
 * @param job - Job payload to execute
 */
async function executeJob(job: JobPayload): Promise<void> {
  switch (job.type) {
    case 'PROCESS_LINK':
      await processLink(job.data)
      break
    
    default:
      throw new Error(`Unknown job type: ${job.type}`)
  }
}

/**
 * Determine if an error is retryable
 * 
 * @param error - Error that occurred during job processing
 * @returns True if the job should be retried
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  
  // Network/timeout errors are retryable
  if (message.includes('timeout') || 
      message.includes('network') || 
      message.includes('econnreset') ||
      message.includes('enotfound') ||
      message.includes('rate limit')) {
    return true
  }

  // Authentication/authorization errors are not retryable
  if (message.includes('unauthorized') || 
      message.includes('forbidden') || 
      message.includes('authentication')) {
    return false
  }

  // Content extraction failures might be retryable
  if (message.includes('content extraction failed')) {
    return true
  }

  // Database errors are generally retryable
  if (message.includes('database') || 
      message.includes('connection') ||
      message.includes('prisma')) {
    return true
  }

  // Default to retryable for unknown errors
  return true
}

/**
 * Health check for worker functionality
 * 
 * @returns Worker health status
 */
export async function workerHealthCheck() {
  try {
    const stats = await queueClient.getStats()
    const health = await queueClient.healthCheck()
    
    return {
      healthy: health.healthy,
      stats,
      issues: health.issues,
      timestamp: Date.now()
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }
  }
}