import { prisma } from './prisma'

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
      console.error('Failed to persist job to database:', error)
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
      console.log(`Processing job ${job.id} of type ${job.type}`)
      
      // Update status to processing
      job.status = 'PROCESSING'
      job.processedAt = new Date()
      job.updatedAt = new Date()
      
      await this.updateJobInDatabase(job)

      // Process the job based on type
      await this.executeJob(job)
      
      // Mark as completed
      job.status = 'COMPLETED'
      job.updatedAt = new Date()
      
      await this.updateJobInDatabase(job)
      
      console.log(`Job ${job.id} completed successfully`)
      
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error)
      
      job.retryCount++
      
      if (job.retryCount < job.maxRetries) {
        // Retry the job
        job.status = 'PENDING'
        job.updatedAt = new Date()
        
        console.log(`Retrying job ${job.id} (attempt ${job.retryCount + 1}/${job.maxRetries})`)
      } else {
        // Max retries reached, mark as failed
        job.status = 'FAILED'
        job.error = error instanceof Error ? error.message : 'Unknown error'
        job.updatedAt = new Date()
        
        console.error(`Job ${job.id} failed permanently after ${job.maxRetries} attempts`)
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
    // Clean up completed jobs older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    // Remove from memory
    for (const [jobId, job] of this.jobs.entries()) {
      if ((job.status === 'COMPLETED' || job.status === 'FAILED') && job.updatedAt < cutoff) {
        this.jobs.delete(jobId)
      }
    }

    // Remove from database
    try {
      await prisma.queuedJob.deleteMany({
        where: {
          status: { in: ['COMPLETED', 'FAILED'] },
          updatedAt: { lt: cutoff }
        }
      })
    } catch (error) {
      console.error('Failed to cleanup jobs from database:', error)
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