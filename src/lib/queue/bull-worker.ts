/**
 * Bull Worker Implementation
 * 
 * Since Bull handles job processing automatically, this provides
 * management functions for the worker and queue monitoring
 */

import { linkProcessingQueue, queueManager } from './bull-queue'

export interface WorkerOptions {
  /** Maximum number of concurrent jobs (Bull handles this automatically) */
  concurrency?: number
  /** Worker identifier for tracking */
  workerId?: string
}

/**
 * Bull automatically processes jobs, but this function provides
 * manual control and monitoring capabilities
 */
export async function processJobs(options: WorkerOptions = {}) {
  const {
    concurrency = 1,
    workerId = `bull-worker-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  } = options

  const startTime = Date.now()
  
  console.log(`🐂 Bull worker ${workerId} monitoring queue`, {
    concurrency,
    startTime: new Date(startTime).toISOString()
  })

  try {
    // Get current stats
    const stats = await queueManager.getStats()
    const health = await queueManager.getHealth()
    
    console.log(`📊 Bull queue status:`, {
      stats,
      health: health.healthy,
      paused: health.paused
    })

    // If queue is paused, resume it
    if (health.paused) {
      console.log(`▶️  Resuming paused Bull queue`)
      await queueManager.resume()
    }

    // Note: Bull concurrency is set in the queue definition, not dynamically
    console.log(`🐂 Bull queue running with concurrency: ${concurrency}`)

    // Clean old jobs if needed
    if (stats.completed > 100 || stats.failed > 50) {
      console.log(`🧹 Cleaning old jobs`)
      await queueManager.clean()
    }

    const duration = Date.now() - startTime

    const results = {
      processed: stats.active + stats.waiting, // Jobs that will be processed
      completed: stats.completed,
      failed: stats.failed,
      workerId,
      duration,
      stats,
      health
    }

    console.log(`🏁 Bull worker ${workerId} status check completed`, results)

    return results

  } catch (error) {
    console.error(`🚨 Bull worker ${workerId} encountered error`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    })
    
    throw error
  }
}

/**
 * Health check for Bull worker functionality
 */
export async function workerHealthCheck() {
  try {
    const health = await queueManager.getHealth()
    const stats = await queueManager.getStats()
    
    return {
      healthy: health.healthy,
      stats,
      issues: health.paused ? ['Queue is paused'] : [],
      redis: health.redis,
      timestamp: Date.now(),
      queueName: linkProcessingQueue.name,
      concurrency: 1 // Bull handles concurrency internally
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }
  }
}

/**
 * Pause the Bull queue
 */
export async function pauseWorker() {
  await queueManager.pause()
  console.log('⏸️  Bull worker paused')
}

/**
 * Resume the Bull queue
 */
export async function resumeWorker() {
  await queueManager.resume()
  console.log('▶️  Bull worker resumed')
}

/**
 * Get detailed job information
 */
export async function getJobDetails(jobId: string) {
  try {
    const job = await queueManager.getJob(jobId)
    if (!job) return null

    const state = await job.getState()
    
    return {
      id: job.id,
      state,
      data: job.data,
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      timestamp: job.timestamp,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace
    }
  } catch (error) {
    console.error('Failed to get job details:', error)
    return null
  }
}

/**
 * Force process specific number of jobs (for manual testing)
 */
export async function forceProcessJobs(count: number = 1) {
  console.log(`🔧 Force processing ${count} jobs`)
  
  // This is just a status check since Bull handles processing automatically
  const stats = await queueManager.getStats()
  
  if (stats.waiting === 0) {
    console.log('📭 No jobs waiting to be processed')
    return { processed: 0, message: 'No jobs in queue' }
  }

  console.log(`🚀 Bull is automatically processing ${stats.active} jobs, ${stats.waiting} waiting`)
  
  return {
    processed: stats.active,
    waiting: stats.waiting,
    message: 'Bull handles processing automatically'
  }
}