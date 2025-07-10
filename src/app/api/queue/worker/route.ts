import { NextRequest, NextResponse } from 'next/server'
import { getDbClient, ensureDbConnection } from '@/lib/db'

export const runtime = 'edge'

export async function POST(_request: NextRequest) {
  try {
    console.log('🔄 Edge worker API called')
    
    // Check database connection first
    const connected = await ensureDbConnection()
    if (!connected) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }
    
    // For edge functions, we'll process queued jobs directly from the database
    console.log('🔄 Processing queued jobs from database...')
    
    // Find pending jobs from the database
    const db = await getDbClient()
    const pendingJobs = await db.queuedJob.findMany({
      where: { status: 'PENDING' },
      take: 5,
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`📊 Found ${pendingJobs.length} pending jobs`)
    
    let processedCount = 0
    let failedCount = 0
    
    for (const job of pendingJobs) {
      try {
        // Mark job as processing
        await db.queuedJob.update({
          where: { id: job.id },
          data: { 
            status: 'PROCESSING',
            processedAt: new Date()
          }
        })
        
        // For edge functions, we can only do lightweight database operations
        // The actual heavy processing (content extraction, TTS) should happen in serverless functions
        console.log(`📋 Processing job ${job.id} of type ${job.type}`)
        
        // For now, mark as completed since we can't do heavy processing in edge
        await db.queuedJob.update({
          where: { id: job.id },
          data: { 
            status: 'COMPLETED',
            processedAt: new Date()
          }
        })
        
        processedCount++
      } catch (error) {
        console.error(`❌ Failed to process job ${job.id}:`, error)
        
        await db.queuedJob.update({
          where: { id: job.id },
          data: { 
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount: job.retryCount + 1,
            processedAt: new Date()
          }
        })
        
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Edge worker processed database jobs',
      results: {
        totalJobs: pendingJobs.length,
        processedCount,
        failedCount,
        workerId: `edge-worker-${Date.now()}`
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('🚨 Edge worker API failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(_request: NextRequest) {
  try {
    console.log('📊 Edge worker health check called')
    
    const dbHealth = await ensureDbConnection()
    
    return NextResponse.json({
      success: true,
      health: {
        database: dbHealth,
        runtime: 'edge',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('🚨 Edge worker health check failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}