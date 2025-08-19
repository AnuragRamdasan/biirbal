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
      // Find team by ID or slackTeamId and verify user has access via membership
      const userMembership = await db.teamMembership.findFirst({
        where: {
          userId: session.user.id,
          isActive: true,
          team: {
            OR: [
              { id: teamId },
              { slackTeamId: teamId }
            ]
          }
        },
        include: {
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
      })
      
      team = userMembership?.team
    } else {
      // Use user's first active team membership
      const userMembership = await db.teamMembership.findFirst({
        where: {
          userId: session.user.id,
          isActive: true
        },
        include: {
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
      })
      
      team = userMembership?.team
    }
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Handle teams with or without channels
    let channelId = null;
    if (team.channels.length > 0) {
      channelId = team.channels[0].id
    } else {
      // No channels found - create a virtual channel for both web-only and Slack teams
      // This handles cases where Slack integration exists but no channels are synced yet
      const virtualChannel = await db.channel.findFirst({
        where: { 
          teamId: team.id,
          slackChannelId: {
            in: [`web_${team.id}`, `ext_${team.id}`]
          }
        }
      })
      
      if (!virtualChannel) {
        // Create a virtual channel for extension submissions
        const channelIdPrefix = team.slackTeamId ? 'ext' : 'web'
        const channelName = team.slackTeamId ? 'Extension Links' : 'Web Links'
        
        const newChannel = await db.channel.create({
          data: {
            slackChannelId: `${channelIdPrefix}_${team.id}`,
            channelName: channelName,
            teamId: team.id,
            isActive: true
          }
        })
        channelId = newChannel.id
      } else {
        channelId = virtualChannel.id
      }
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
          status: existingLink.processingStatus,
          audioUrl: existingLink.audioFileUrl // Include audio URL if available
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

    // Check if this is the user's first link
    const userLinkCount = await db.processedLink.count({
      where: {
        team: {
          memberships: {
            some: {
              userId: session.user.id,
              isActive: true
            }
          }
        }
      }
    })

    // Extension link tracking handled client-side

    return NextResponse.json({
      message: 'Link saved successfully',
      linkId: processedLink.id,
      status: 'PENDING',
      isFirstLink: userLinkCount === 1,
      // Note: audioUrl will be null for new links, extension should poll /api/extension/link-status
      audioUrl: null
    })

  } catch (error) {
    console.error('Failed to save link from extension:', error)
    return NextResponse.json(
      { error: 'Failed to save link' },
      { status: 500 }
    )
  }
}