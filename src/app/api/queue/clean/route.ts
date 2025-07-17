import { NextResponse } from 'next/server'
import { queueManager } from '@/lib/queue/bull-queue'

export async function POST() {
  try {
    console.log('🧹 Starting queue cleanup...')
    
    // Clean old jobs
    await queueManager.clean()
    
    console.log('✅ Queue cleanup completed')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Queue cleaned successfully' 
    })
  } catch (error) {
    console.error('❌ Queue cleanup failed:', error)
    
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}