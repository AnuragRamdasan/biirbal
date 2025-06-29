import { NextRequest, NextResponse } from 'next/server'
import { jobQueue } from '@/lib/job-queue'

export async function GET(request: NextRequest) {
  try {
    // Force a health check and ensure processing is running
    await (jobQueue as any).ensureProcessingIsRunning()
    
    // Add a test job to verify the queue is working
    const testJobId = await jobQueue.addJob({
      type: 'PROCESS_LINK',
      payload: {
        url: 'https://example.com/test',
        messageTs: 'test-' + Date.now(),
        channelId: 'test-channel',
        teamId: 'test-team',
        slackTeamId: 'test-slack-team'
      },
      priority: 10 // High priority test job
    })

    return NextResponse.json({
      success: true,
      message: 'Queue health check completed and processing ensured',
      testJobId,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Queue health check failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Queue health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}