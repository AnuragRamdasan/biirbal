import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teamId = searchParams.get('teamId')
    const userId = searchParams.get('userId') // Primary user identifier (database user.id)
    const slackUserId = searchParams.get('slackUserId') // Legacy parameter for backwards compatibility

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      )
    }

    const db = await getDbClient()
    
    // First find the team by slackTeamId to get the database team ID
    const team = await db.team.findUnique({
      where: { slackTeamId: teamId },
      select: { id: true }
    })
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }
    
    // Get all links for the team, but filter listens by the current user
    const links = await db.processedLink.findMany({
      where: {
        teamId: team.id
      },
      include: {
        channel: {
          select: {
            channelName: true,
            slackChannelId: true
          }
        },
        listens: userId ? {
          where: {
            userId: userId
          },
          orderBy: {
            listenedAt: 'desc'
          }
        } : slackUserId ? {
          where: {
            slackUserId: slackUserId
          },
          orderBy: {
            listenedAt: 'desc'
          }
        } : {
          // If no user ID provided, return all listens (for backwards compatibility)
          orderBy: {
            listenedAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ links })
  } catch (error) {
    console.error('Failed to fetch links:', error)
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    )
  }
}