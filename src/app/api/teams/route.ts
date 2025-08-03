import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDbClient } from '@/lib/db'

// This endpoint provides the same team data as /api/extension/teams
// but at the /api/teams path that the extension also tries
export async function GET(request: NextRequest) {
  try {
    // Check authentication first
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const db = await getDbClient()

    // Get user's team
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        team: {
          select: {
            id: true,
            slackTeamId: true,
            teamName: true,
            isActive: true,
            subscription: {
              select: {
                status: true,
                planId: true,
                monthlyLinkLimit: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.team) {
      return NextResponse.json([])
    }

    // Format team data
    const team = {
      id: user.team.id,
      slackTeamId: user.team.slackTeamId || user.team.id,
      teamName: user.team.teamName || 'My Team',
      isActive: user.team.isActive,
      subscription: user.team.subscription
    }

    // Return as array to match extension expectations
    return NextResponse.json([team])

  } catch (error) {
    console.error('Failed to fetch teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}