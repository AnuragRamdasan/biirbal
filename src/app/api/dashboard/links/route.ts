import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teamId = searchParams.get('teamId')
    const slackUserId = searchParams.get('slackUserId')

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      )
    }

    const db = await getDbClient()
    
    // Get all links for the team, but filter listens by the current user
    const links = await db.processedLink.findMany({
      where: {
        teamId: teamId
      },
      include: {
        listens: slackUserId ? {
          where: {
            slackUserId: slackUserId
          },
          orderBy: {
            listenedAt: 'desc'
          }
        } : {
          where: {
            // If no user ID provided, return empty listens array
            id: 'never-matches'
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