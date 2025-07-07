import { NextRequest, NextResponse } from 'next/server'
import { processJobs, resumeWorker } from '@/lib/queue/bull-worker'
import { queueClient } from '@/lib/queue/client'
import { linkProcessingQueue } from '@/lib/queue/bull-queue'
import { ensureDatabaseConnection } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    console.log('🕐 Bull cron job: Initializing and monitoring queue...')
    
    // Check database connection first
    const dbConnected = await ensureDatabaseConnection()
    if (!dbConnected) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }
    
    // Ensure the queue processor is initialized by importing it
    console.log('🔄 Initializing Bull queue processor...')
    
    // Check if there are any pending jobs
    const stats = await queueClient.getStats()
    console.log('📊 Bull queue stats:', stats)
    
    // Get detailed queue status
    const waiting = await linkProcessingQueue.getWaiting()
    const active = await linkProcessingQueue.getActive()
    
    console.log(`📊 Detailed queue status: ${waiting.length} waiting, ${active.length} active jobs`)
    
    // Ensure the queue is running
    await resumeWorker()
    
    // Monitor and manage the queue
    const results = await processJobs({
      concurrency: 5, // Allow more concurrent jobs in cron
      workerId: `bull-cron-worker-${Date.now()}`
    })

    console.log('✅ Bull cron job completed:', results)

    return NextResponse.json({
      success: true,
      results,
      stats,
      message: 'Bull queue is processing automatically',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('🚨 Bull cron job failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}