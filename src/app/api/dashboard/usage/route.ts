import { NextRequest, NextResponse } from 'next/server'
import { getTeamUsageStats, getUpgradeMessage } from '@/lib/subscription-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      )
    }

    const usageStats = await getTeamUsageStats(teamId)
    const warning = getUpgradeMessage(usageStats)

    return NextResponse.json({
      ...usageStats,
      warning
    })
  } catch (error) {
    console.error('Failed to get usage stats:', error)
    return NextResponse.json(
      { error: 'Failed to get usage stats' },
      { status: 500 }
    )
  }
}