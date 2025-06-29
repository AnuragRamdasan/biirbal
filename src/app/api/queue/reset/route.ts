import { NextRequest, NextResponse } from 'next/server'
import { jobQueue } from '@/lib/job-queue'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Manual queue reset requested')
    
    const result = await jobQueue.resetAllStuckJobs()
    
    return NextResponse.json({
      success: true,
      message: 'Stuck jobs have been reset',
      resetCounts: result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to reset stuck jobs:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to reset stuck jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}