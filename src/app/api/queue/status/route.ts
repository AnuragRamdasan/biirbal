import { NextRequest, NextResponse } from 'next/server'
import { jobQueue } from '@/lib/job-queue'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get queue statistics
    const [pendingJobs, processingJobs, completedJobs, failedJobs] = await Promise.all([
      prisma.queuedJob.count({ where: { status: 'PENDING' } }),
      prisma.queuedJob.count({ where: { status: 'PROCESSING' } }),
      prisma.queuedJob.count({ where: { status: 'COMPLETED' } }),
      prisma.queuedJob.count({ where: { status: 'FAILED' } })
    ])

    // Get recent jobs
    const recentJobs = await prisma.queuedJob.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        priority: true,
        retryCount: true,
        createdAt: true,
        updatedAt: true,
        processedAt: true,
        error: true
      }
    })

    // Check for stuck jobs (PROCESSING for more than 5 minutes)
    const stuckCutoff = new Date(Date.now() - 5 * 60 * 1000)
    const stuckJobs = await prisma.queuedJob.findMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: stuckCutoff }
      },
      select: {
        id: true,
        type: true,
        updatedAt: true,
        retryCount: true
      }
    })

    return NextResponse.json({
      statistics: {
        pending: pendingJobs,
        processing: processingJobs,
        completed: completedJobs,
        failed: failedJobs,
        stuck: stuckJobs.length
      },
      stuckJobs: stuckJobs.map(job => ({
        ...job,
        stuckFor: Date.now() - job.updatedAt.getTime()
      })),
      recentJobs,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to get queue status:', error)
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    )
  }
}