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

    // Get user's teams through memberships
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        memberships: {
          where: { isActive: true },
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
        }
      }
    })

    if (!user || user.memberships.length === 0) {
      return NextResponse.json([])
    }

    // Format team data
    const teams = user.memberships.map(membership => ({
      id: membership.team.id,
      slackTeamId: membership.team.slackTeamId || membership.team.id,
      teamName: membership.team.teamName || 'My Team',
      isActive: membership.team.isActive,
      subscription: membership.team.subscription
    }))

    // Return as array to match extension expectations
    return NextResponse.json(teams)

  } catch (error) {
    console.error('Failed to fetch teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}