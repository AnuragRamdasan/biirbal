import { NextRequest, NextResponse } from 'next/server'
import { getTeamUsageStats, getUpgradeMessage, canUserConsume } from '@/lib/subscription-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const teamId = searchParams.get('teamId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get user's team memberships from database
    const { getDbClient } = await import('@/lib/db')
    const db = await getDbClient()
    
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

    const usageStats = await getTeamUsageStats(targetTeam.slackTeamId || targetTeam.id)
    const warning = getUpgradeMessage(usageStats)
    const userCanConsumeStats = await canUserConsume(targetTeam.slackTeamId || targetTeam.id, userId)

    return NextResponse.json({
      ...usageStats,
      warning,
      userCanConsume: userCanConsumeStats
    })
  } catch (error) {
    console.error('Failed to get usage stats:', error)
    return NextResponse.json(
      { error: 'Failed to get usage stats' },
      { status: 500 }
    )
  }
}