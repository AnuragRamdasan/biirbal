import { NextRequest, NextResponse } from 'next/server'
import { getTeamUsageStats, getUpgradeMessage, canUserConsume } from '@/lib/subscription-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const userId = searchParams.get('userId')

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      )
    }

    const usageStats = await getTeamUsageStats(teamId)
    const warning = getUpgradeMessage(usageStats)
    
    // Check if specific user can consume (for dashboard access control)
    let userCanConsume = true
    if (userId) {
      userCanConsume = await canUserConsume(teamId, userId)
    }

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