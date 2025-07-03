import { NextRequest, NextResponse } from 'next/server'
import { processJobs, resumeWorker } from '@/lib/queue/bull-worker'
import { queueClient } from '@/lib/queue/client'

export async function GET(request: NextRequest) {
  try {
    console.log('🕐 Bull cron job: Monitoring queue...')
    
    // Check if there are any pending jobs
    const stats = await queueClient.getStats()
    console.log('📊 Bull queue stats:', stats)
    
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