import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { queueClient } from '@/lib/queue/client'

export async function POST(request: NextRequest) {
  try {
    const { url, title, teamId, source = 'chrome-extension' } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    const db = await getDbClient()
    
    // Find the team by slackTeamId to get the database team ID
    const team = await db.team.findUnique({
      where: { slackTeamId: teamId },
      select: { 
        id: true, 
        accessToken: true,
        channels: {
          select: { id: true },
          take: 1 // Get any channel for this team
        }
      }
    })
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    if (team.channels.length === 0) {
      return NextResponse.json(
        { error: 'No channels found for team' },
        { status: 400 }
      )
    }

    // Use the first available channel
    const channelId = team.channels[0].id

    // Generate a unique messageTs for extension submissions
    const messageTs = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Check if link already exists for this team
    const existingLink = await db.processedLink.findFirst({
      where: {
        url,
        teamId: team.id
      }
    })

    if (existingLink) {
      return NextResponse.json(
        { 
          message: 'Link already exists for this team',
          linkId: existingLink.id,
          status: existingLink.processingStatus
        },
        { status: 200 }
      )
    }

    // Create the processed link record
    const processedLink = await db.processedLink.create({
      data: {
        url,
        title: title || null,
        messageTs,
        channelId,
        teamId: team.id,
        processingStatus: 'PENDING',
        source,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Add to processing queue
    try {
      await queueClient.add('PROCESS_LINK', {
        linkId: processedLink.id,
        url,
        messageTs,
        channelId,
        teamId: team.id,
        accessToken: team.accessToken,
        source
      })
    } catch (queueError) {
      console.error('Failed to add to queue:', queueError)
      
      // Update status to indicate queue failure
      await db.processedLink.update({
        where: { id: processedLink.id },
        data: { 
          processingStatus: 'FAILED',
          errorMessage: 'Failed to add to processing queue'
        }
      })
      
      return NextResponse.json(
        { error: 'Failed to queue for processing' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Link saved successfully',
      linkId: processedLink.id,
      status: 'PENDING'
    })

  } catch (error) {
    console.error('Failed to save link from extension:', error)
    return NextResponse.json(
      { error: 'Failed to save link' },
      { status: 500 }
    )
  }
}