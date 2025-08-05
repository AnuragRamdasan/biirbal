import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDbClient } from '@/lib/db'

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

    // Get all teams the user is a member of
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
                },
                _count: {
                  select: {
                    processedLinks: {
                      where: {
                        createdAt: {
                          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user || user.memberships.length === 0) {
      return NextResponse.json(
        { error: 'User not found or no team memberships' },
        { status: 404 }
      )
    }

    const teams = user.memberships.map(membership => membership.team)

    // Format teams for extension
    const formattedTeams = teams.map(team => ({
      id: team.id,
      slackTeamId: team.slackTeamId || team.id, // Use team.id as fallback for web-only teams
      teamName: team.teamName || 'My Team',
      isActive: team.isActive,
      subscription: team.subscription,
      usage: team._count.processedLinks,
      canAddLinks: team.subscription?.status === 'TRIAL' || team.subscription?.status === 'ACTIVE'
    }))

    return NextResponse.json({
      teams: formattedTeams,
      totalTeams: formattedTeams.length
    })

  } catch (error) {
    console.error('Failed to fetch teams for extension:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}