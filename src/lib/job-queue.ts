import { prisma } from './prisma'
import { queueLogger } from './logger'

export interface JobPayload {
  type: 'PROCESS_LINK'
  payload: {
    url: string
    messageTs: string
    channelId: string
    teamId: string
    slackTeamId: string
  }
  priority?: number
  retryCount?: number
  maxRetries?: number
}

export interface QueuedJob {
  id: string
  type: string
  payload: any
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  priority: number
  retryCount: number
  maxRetries: number
  createdAt: Date
  updatedAt: Date
  processedAt?: Date
  error?: string
}

// In-memory queue for immediate processing (will switch to Redis later)
class JobQueue {
  private jobs: Map<string, QueuedJob> = new Map()
  private processing = false
  private processingInterval: NodeJS.Timeout | null = null

  async addJob(job: JobPayload): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const queuedJob: QueuedJob = {
      id: jobId,
      type: job.type,
      payload: job.payload,
      status: 'PENDING',
      priority: job.priority || 1,
      retryCount: 0,
      maxRetries: job.maxRetries || 3,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.jobs.set(jobId, queuedJob)
    
    // Store in database for persistence
    await prisma.queuedJob.create({
      data: {
        id: jobId,
        type: job.type,
        payload: job.payload,
        status: 'PENDING',
        priority: queuedJob.priority,
        retryCount: 0,
        maxRetries: queuedJob.maxRetries
      }
    }).catch(error => {
      queueLogger.error('Failed to persist job to database', { error: error.message, jobId })
      // Continue with in-memory processing even if DB fails
    })

    // Start processing if not already running
    this.startProcessing()
    
    return jobId
  }

  private startProcessing() {
    if (this.processing) return
    
    this.processing = true
    
    // Process jobs immediately and then check every 5 seconds
    this.processNextJob()
    
    this.processingInterval = setInterval(() => {
      this.processNextJob()
    }, 5000)
  }

  private async processNextJob() {
    // Get highest priority pending job
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'PENDING')
      .sort((a, b) => b.priority - a.priority)

    if (pendingJobs.length === 0) {
      // No jobs to process, check database for any missed jobs
      await this.loadJobsFromDatabase()
      return
    }

    const job = pendingJobs[0]
    
    try {
      queueLogger.info(`🚀 Processing job ${job.type}`, { jobId: job.id, priority: job.priority })
      
      // Update status to processing
      job.status = 'PROCESSING'
      job.processedAt = new Date()
      job.updatedAt = new Date()
      
      await this.updateJobInDatabase(job)

      // Process the job based on type with timeout
      await Promise.race([
        this.executeJob(job),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Job timeout after 5 minutes')), 5 * 60 * 1000)
        )
      ])
      
      // Mark as completed
      job.status = 'COMPLETED'
      job.updatedAt = new Date()
      
      await this.updateJobInDatabase(job)
      
      queueLogger.info(`✅ Job completed successfully`, { jobId: job.id, type: job.type })
      
    } catch (error) {
      queueLogger.error(`❌ Job failed`, { jobId: job.id, error: error.message, attempt: job.retryCount + 1 })
      
      job.retryCount++
      
      if (job.retryCount < job.maxRetries) {
        // Retry the job
        job.status = 'PENDING'
        job.updatedAt = new Date()
        
        queueLogger.warn(`🔄 Retrying job`, { jobId: job.id, attempt: job.retryCount + 1, maxRetries: job.maxRetries })
      } else {
        // Max retries reached, mark as failed
        job.status = 'FAILED'
        job.error = error instanceof Error ? error.message : 'Unknown error'
        job.updatedAt = new Date()
        
        queueLogger.error(`💥 Job failed permanently`, { jobId: job.id, maxRetries: job.maxRetries, finalError: job.error })
      }
      
      await this.updateJobInDatabase(job)
    }
  }

  private async executeJob(job: QueuedJob) {
    switch (job.type) {
      case 'PROCESS_LINK':
        const { processLink } = await import('./link-processor')
        await processLink(job.payload)
        break
      
      default:
        throw new Error(`Unknown job type: ${job.type}`)
    }
  }

  private async updateJobInDatabase(job: QueuedJob) {
    try {
      await prisma.queuedJob.update({
        where: { id: job.id },
        data: {
          status: job.status,
          retryCount: job.retryCount,
          processedAt: job.processedAt,
          error: job.error,
          updatedAt: job.updatedAt
        }
      })
    } catch (error) {
      console.error('Failed to update job in database:', error)
    }
  }

  private async loadJobsFromDatabase() {
    try {
      const dbJobs = await prisma.queuedJob.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            // Only load jobs from last hour to avoid processing very old jobs
            gte: new Date(Date.now() - 60 * 60 * 1000)
          }
        },
        take: 10
      })

      for (const dbJob of dbJobs) {
        if (!this.jobs.has(dbJob.id)) {
          const queuedJob: QueuedJob = {
            id: dbJob.id,
            type: dbJob.type,
            payload: dbJob.payload as any,
            status: dbJob.status as any,
            priority: dbJob.priority,
            retryCount: dbJob.retryCount,
            maxRetries: dbJob.maxRetries,
            createdAt: dbJob.createdAt,
            updatedAt: dbJob.updatedAt,
            processedAt: dbJob.processedAt || undefined,
            error: dbJob.error || undefined
          }
          
          this.jobs.set(dbJob.id, queuedJob)
        }
      }
    } catch (error) {
      console.error('Failed to load jobs from database:', error)
    }
  }

  // Manual method to reset all stuck jobs immediately
  async resetAllStuckJobs(): Promise<{ memory: number, database: number }> {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes
    
    // Reset in memory
    let memoryCount = 0
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'PROCESSING' && job.updatedAt < cutoff) {
        job.status = 'PENDING'
        job.retryCount++
        job.updatedAt = new Date()
        memoryCount++
      }
    }
    
    // Reset in database
    const dbResult = await prisma.queuedJob.updateMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: cutoff }
      },
      data: {
        status: 'PENDING',
        updatedAt: new Date()
      }
    })
    
    queueLogger.warn(`🔄 Manual reset of stuck jobs`, { 
      memoryReset: memoryCount, 
      dbReset: dbResult.count 
    })
    
    return { memory: memoryCount, database: dbResult.count }
  }

  async getJobStatus(jobId: string): Promise<QueuedJob | null> {
    const job = this.jobs.get(jobId)
    if (job) return job

    // Check database if not in memory
    try {
      const dbJob = await prisma.queuedJob.findUnique({
        where: { id: jobId }
      })

      if (dbJob) {
        return {
          id: dbJob.id,
          type: dbJob.type,
          payload: dbJob.payload as any,
          status: dbJob.status as any,
          priority: dbJob.priority,
          retryCount: dbJob.retryCount,
          maxRetries: dbJob.maxRetries,
          createdAt: dbJob.createdAt,
          updatedAt: dbJob.updatedAt,
          processedAt: dbJob.processedAt || undefined,
          error: dbJob.error || undefined
        }
      }
    } catch (error) {
      console.error('Failed to get job from database:', error)
    }

    return null
  }

  async cleanup() {
    // For frequent cleanup (every 10 minutes), use shorter retention
    // Keep completed jobs for 2 hours, failed jobs for 6 hours
    const completedCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours
    const failedCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours
    
    // CRITICAL: Reset stuck PROCESSING jobs (older than 10 minutes)
    const stuckJobsCutoff = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes
    await this.resetStuckJobs(stuckJobsCutoff)
    
    // Remove from memory with different retention for completed vs failed
    for (const [jobId, job] of this.jobs.entries()) {
      const cutoff = job.status === 'COMPLETED' ? completedCutoff : failedCutoff
      if ((job.status === 'COMPLETED' || job.status === 'FAILED') && job.updatedAt < cutoff) {
        this.jobs.delete(jobId)
      }
    }

    // Remove from database with batch operations
    try {
      const [completedCount, failedCount] = await Promise.all([
        // Clean up completed jobs (2 hours old)
        prisma.queuedJob.deleteMany({
          where: {
            status: 'COMPLETED',
            updatedAt: { lt: completedCutoff }
          }
        }),
        // Clean up failed jobs (6 hours old) 
        prisma.queuedJob.deleteMany({
          where: {
            status: 'FAILED',
            updatedAt: { lt: failedCutoff }
          }
        })
      ])
      
      if (completedCount.count > 0 || failedCount.count > 0) {
        console.log(`🧹 Cleanup: Removed ${completedCount.count} completed, ${failedCount.count} failed jobs`)
      }
    } catch (error) {
      console.error('Failed to cleanup jobs from database:', error)
    }
  }

  private async resetStuckJobs(cutoff: Date) {
    try {
      // Reset stuck PROCESSING jobs in memory
      let memoryResetCount = 0
      for (const [jobId, job] of this.jobs.entries()) {
        if (job.status === 'PROCESSING' && job.updatedAt < cutoff) {
          queueLogger.warn(`🔄 Resetting stuck job in memory`, { 
            jobId: job.id, 
            stuckFor: Date.now() - job.updatedAt.getTime() 
          })
          
          job.status = 'PENDING'
          job.retryCount++
          job.updatedAt = new Date()
          memoryResetCount++
        }
      }

      // Reset stuck PROCESSING jobs in database
      const dbResetResult = await prisma.queuedJob.updateMany({
        where: {
          status: 'PROCESSING',
          updatedAt: { lt: cutoff }
        },
        data: {
          status: 'PENDING',
          updatedAt: new Date()
        }
      })

      if (memoryResetCount > 0 || dbResetResult.count > 0) {
        queueLogger.warn(`🚨 Reset stuck jobs`, { 
          memoryReset: memoryResetCount, 
          dbReset: dbResetResult.count,
          cutoff: cutoff.toISOString()
        })
      }
    } catch (error) {
      queueLogger.error('Failed to reset stuck jobs', { error: error.message })
    }
  }
}

// Export singleton instance
export const jobQueue = new JobQueue()

// Helper function to add a link processing job
export async function queueLinkProcessing(params: {
  url: string
  messageTs: string
  channelId: string
  teamId: string
  slackTeamId: string
}): Promise<string> {
  return jobQueue.addJob({
    type: 'PROCESS_LINK',
    payload: params,
    priority: 1,
    maxRetries: 3
  })
}