/**
 * Queue Cleanup API Route
 * 
 * Performs maintenance operations on the queue:
 * - Cleans up old completed/failed jobs
 * - Resets stuck jobs
 * - Provides health checks
 * 
 * This route is called by Vercel cron jobs for regular maintenance.
 */

import { NextRequest, NextResponse } from 'next/server'
import { queueClient } from '@/lib/queue/client'

export async function POST(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log(`🧹 Queue cleanup started`, {
      timestamp: new Date(startTime).toISOString()
    })

    // Perform cleanup operations
    const cleanupResult = await queueClient.cleanup()
    
    // Get updated stats after cleanup
    const stats = await queueClient.getStats()
    const health = await queueClient.healthCheck()
    
    const duration = Date.now() - startTime

    const response = {
      success: true,
      message: 'Queue cleanup completed successfully',
      results: {
        cleanup: cleanupResult,
        stats,
        health: {
          healthy: health.healthy,
          issues: health.issues
        },
        duration
      },
      timestamp: new Date().toISOString()
    }

    console.log(`✅ Queue cleanup completed`, {
      cleaned: cleanupResult.cleaned,
      reset: cleanupResult.reset,
      duration,
      pending: stats.pending,
      processing: stats.processing
    })

    return NextResponse.json(response)

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error(`🚨 Queue cleanup failed`, {
      error: errorMessage,
      duration,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Queue cleanup failed',
        details: errorMessage,
        duration,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// GET endpoint for manual cleanup trigger
export async function GET(_request: NextRequest) {
  try {
    console.log(`🧹 Manual queue cleanup triggered`, {
      timestamp: new Date().toISOString()
    })

    // Perform cleanup
    const cleanupResult = await queueClient.cleanup()
    
    return NextResponse.json({
      success: true,
      message: 'Manual cleanup completed',
      results: cleanupResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error(`🚨 Manual queue cleanup failed`, {
      error: errorMessage,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Manual cleanup failed',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}