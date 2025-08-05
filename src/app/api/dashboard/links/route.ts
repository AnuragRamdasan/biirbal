import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') // Database user ID
    const teamId = searchParams.get('teamId') // Optional team ID

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const db = await getDbClient()
    
    // Get user and their team memberships
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { 
        memberships: {
          where: { isActive: true },
          include: {
            team: {
              select: { id: true, teamName: true, slackTeamId: true }
            }
          }
        }
      }
    })
    
    if (!user || user.memberships.length === 0) {
      return NextResponse.json(
        { error: 'User or team membership not found' },
        { status: 404 }
      )
    }
    
    // Determine which team to use
    let targetTeam
    if (teamId) {
      // Use specified team if user is a member
      const membership = user.memberships.find(m => m.team.id === teamId)
      if (!membership) {
        return NextResponse.json(
          { error: 'User is not a member of the specified team' },
          { status: 403 }
        )
      }
      targetTeam = membership.team
    } else {
      // Use first team if no team specified
      targetTeam = user.memberships[0].team
    }
    
    // Get all links for the team, but filter listens by the current user
    const links = await db.processedLink.findMany({
      where: {
        teamId: targetTeam.id
      },
      include: {
        channel: {
          select: {
            channelName: true,
            slackChannelId: true
          }
        },
        listens: {
          where: {
            userId: userId
          },
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