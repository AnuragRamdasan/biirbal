import { NextRequest, NextResponse } from 'next/server'
import { processJobs, workerHealthCheck } from '@/lib/queue/bull-worker'

export async function POST(request: NextRequest) {
  try {
    console.log('🐂 Bull worker API called')
    
    // Bull handles job processing automatically, this just monitors/manages
    const results = await processJobs({
      concurrency: 3, // Process up to 3 jobs concurrently
      workerId: `bull-api-worker-${Date.now()}`
    })

    return NextResponse.json({
      success: true,
      results,
      message: 'Bull queue is processing jobs automatically',
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

export async function GET(request: NextRequest) {
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