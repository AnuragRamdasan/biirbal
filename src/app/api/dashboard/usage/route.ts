import { NextRequest, NextResponse } from 'next/server'
import { getTeamUsageStats, getUpgradeMessage, canUserConsume } from '@/lib/subscription-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get user's team ID from database
    const { getDbClient } = await import('@/lib/db')
    const db = await getDbClient()
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { 
        teamId: true,
        team: {
          select: { slackTeamId: true }
        }
      }
    })
    
    if (!user || !user.team) {
      return NextResponse.json(
        { error: 'User or team not found' },
        { status: 404 }
      )
    }

    const usageStats = await getTeamUsageStats(user.team.slackTeamId)
    const warning = getUpgradeMessage(usageStats)
    const userCanConsume = await canUserConsume(user.team.slackTeamId, userId)

    return NextResponse.json({
      ...usageStats,
      warning,
      userCanConsume
    })
  } catch (error) {
    console.error('Failed to get usage stats:', error)
    return NextResponse.json(
      { error: 'Failed to get usage stats' },
      { status: 500 }
    )
  }
}