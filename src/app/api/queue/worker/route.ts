/**
 * Queue Worker API Route
 * 
 * This route processes jobs from the Vercel KV queue.
 * It's designed to be called by:
 * 1. Vercel cron jobs for regular processing
 * 2. Manual triggers for immediate processing
 * 3. External monitoring systems
 */

import { NextRequest, NextResponse } from 'next/server'
import { processJobs } from '@/lib/queue/worker'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Parse request options
    const body = await request.json().catch(() => ({}))
    const {
      maxJobs = 5, // Conservative default for Vercel
      timeout = 280000, // 4m 40s (Vercel has 5min timeout)
      workerId
    } = body

    console.log(`🚀 Queue worker API called`, {
      maxJobs,
      timeout,
      workerId,
      timestamp: new Date().toISOString()
    })

    // Process jobs
    const results = await processJobs({
      maxJobs,
      timeout,
      workerId
    })

    const totalDuration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'Job processing completed',
      results: {
        ...results,
        totalDuration,
        efficiency: results.processed > 0 ? results.completed / results.processed : 0
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const totalDuration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error(`🚨 Queue worker API failed`, {
      error: errorMessage,
      duration: totalDuration,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Worker processing failed',
        details: errorMessage,
        duration: totalDuration,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const maxJobs = parseInt(searchParams.get('maxJobs') || '3')
    const timeout = parseInt(searchParams.get('timeout') || '280000')

    console.log(`🚀 Queue worker GET request`, {
      maxJobs,
      timeout,
      timestamp: new Date().toISOString()
    })

    // Process jobs with GET parameters
    const results = await processJobs({
      maxJobs,
      timeout
    })

    return NextResponse.json({
      success: true,
      message: 'Job processing completed via GET',
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error(`🚨 Queue worker GET failed`, {
      error: errorMessage,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Worker GET processing failed',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}