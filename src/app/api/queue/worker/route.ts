import { NextResponse } from 'next/server'
import { processJobs, workerHealthCheck } from '@/lib/queue/bull-worker'


export async function POST() {
  try {
    console.log('🔄 Bull worker API called')
    
    // Use Bull worker to process Redis jobs
    const results = await processJobs({
      concurrency: 2,
      workerId: `api-worker-${Date.now()}`
    })
    
    return NextResponse.json({
      success: true,
      message: 'Bull worker processed Redis jobs',
      results,
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

export async function GET() {
  try {
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