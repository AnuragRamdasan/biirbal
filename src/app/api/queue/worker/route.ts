import { NextRequest, NextResponse } from 'next/server'
import { processJobs, workerHealthCheck } from '@/lib/queue/bull-worker'
import { linkProcessingQueue } from '@/lib/queue/bull-queue'

export async function POST(_request: NextRequest) {
  try {
    console.log('🐂 Bull worker API called')
    
    // Ensure the queue processor is initialized by importing it
    console.log('🔄 Initializing Bull queue processor...')
    
    // Check if there are jobs waiting to be processed
    const waiting = await linkProcessingQueue.getWaiting()
    const active = await linkProcessingQueue.getActive()
    
    console.log(`📊 Queue status: ${waiting.length} waiting, ${active.length} active jobs`)
    
    // Process jobs and get status
    const results = await processJobs({
      concurrency: 2, // Reduced concurrency to avoid connection pool exhaustion
      workerId: `bull-api-worker-${Date.now()}`
    })

    return NextResponse.json({
      success: true,
      results,
      message: 'Bull queue processor initialized and monitoring',
      queueStatus: {
        waiting: waiting.length,
        active: active.length,
        processorActive: true
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('🚨 Bull worker API failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(_request: NextRequest) {
  try {
    console.log('📊 Bull worker health check called')
    
    const health = await workerHealthCheck()
    
    return NextResponse.json({
      success: true,
      health,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('🚨 Bull worker health check failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}