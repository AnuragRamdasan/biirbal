import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') // Database user ID

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const db = await getDbClient()
    
    // Get user and their team in one query
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        teamId: true,
        team: {
          select: { id: true }
        }
      }
    })
    
    if (!user || !user.team) {
      return NextResponse.json(
        { error: 'User or team not found' },
        { status: 404 }
      )
    }
    
    // Get all links for the team, but filter listens by the current user
    const links = await db.processedLink.findMany({
      where: {
        teamId: user.team.id
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