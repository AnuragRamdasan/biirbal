import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { queueClient } from '@/lib/queue/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Check authentication first
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { url, title, teamId, source = 'chrome-extension' } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
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
    
    // Get user's team - if teamId is provided, use it, otherwise use user's default team
    let team;
    if (teamId) {
      // Find team by ID or slackTeamId and verify user has access
      team = await db.team.findFirst({
        where: {
          AND: [
            {
              OR: [
                { id: teamId },
                { slackTeamId: teamId }
              ]
            },
            {
              users: {
                some: { id: session.user.id }
              }
            }
          ]
        },
        select: { 
          id: true, 
          accessToken: true,
          slackTeamId: true,
          channels: {
            select: { id: true },
            take: 1
          }
        }
      })
    } else {
      // Use user's default team
      team = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          team: {
            select: {
              id: true,
              accessToken: true,
              slackTeamId: true,
              channels: {
                select: { id: true },
                take: 1
              }
            }
          }
        }
      }).then(user => user?.team)
    }
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // For web-only teams (no Slack integration), we need to handle the lack of channels differently
    let channelId = null;
    if (team.channels.length > 0) {
      channelId = team.channels[0].id
    } else if (!team.slackTeamId) {
      // This is a web-only team, create a virtual channel if needed
      const virtualChannel = await db.channel.findFirst({
        where: { 
          teamId: team.id,
          slackChannelId: null 
        }
      })
      
      if (!virtualChannel) {
        const newChannel = await db.channel.create({
          data: {
            slackChannelId: `web_${team.id}`,
            channelName: 'Web Links',
            teamId: team.id,
            isActive: true
          }
        })
        channelId = newChannel.id
      } else {
        channelId = virtualChannel.id
      }
    } else {
      return NextResponse.json(
        { error: 'No channels found for team' },
        { status: 400 }
      )
    }

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
        accessToken: team.accessToken || null,
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