import { NextRequest, NextResponse } from 'next/server'
import { queueLinkProcessing } from '@/lib/job-queue'

export async function POST(request: NextRequest) {
  try {
    const { url, messageTs, channelId, teamId, slackTeamId } = await request.json()
    
    if (!url || !messageTs || !channelId || !teamId || !slackTeamId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    console.log(`📤 Queueing link processing for: ${url}`)
    
    const jobId = await queueLinkProcessing({
      url,
      messageTs,
      channelId,
      teamId,
      slackTeamId
    })

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Link processing queued successfully'
    })
    
  } catch (error) {
    console.error('Failed to queue link processing:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to queue link processing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}