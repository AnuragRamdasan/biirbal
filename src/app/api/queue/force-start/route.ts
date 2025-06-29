import { NextRequest, NextResponse } from 'next/server'
import { jobQueue } from '@/lib/job-queue'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 FORCE STARTING queue processing')
    
    // Force restart the queue processing
    await (jobQueue as any).ensureProcessingIsRunning()
    
    return NextResponse.json({
      success: true,
      message: 'Queue processing force started',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to force start queue:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to force start queue',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}