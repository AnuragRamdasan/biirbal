import { NextRequest, NextResponse } from 'next/server'
import { jobQueue } from '@/lib/job-queue'

export async function GET(request: NextRequest) {
  try {
    console.log('🧹 Starting cleanup job...')
    
    // Clean up job queue
    await jobQueue.cleanup()
    
    console.log('✅ Cleanup completed successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cleanup completed',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}