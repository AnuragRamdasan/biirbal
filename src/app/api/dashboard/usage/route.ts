import { NextRequest, NextResponse } from 'next/server'
import { getTeamUsageStats, getUpgradeMessage, canUserConsume } from '@/lib/subscription-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const userId = searchParams.get('userId')

    console.log(`[DEBUG usage endpoint] teamId: ${teamId}, userId: ${userId}`)

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      )
    }

    const usageStats = await getTeamUsageStats(teamId)
    console.log(`[DEBUG usage endpoint] usageStats.userLimitExceeded: ${usageStats.userLimitExceeded}`)
    
    const warning = getUpgradeMessage(usageStats)
    console.log(`[DEBUG usage endpoint] warning: ${warning}`)
    
    // Check if specific user can consume (for dashboard access control)
    let userCanConsume = true
    if (userId) {
      console.log(`[DEBUG usage endpoint] Checking canUserConsume for teamId: ${teamId}, userId: ${userId}`)
      userCanConsume = await canUserConsume(teamId, userId)
      console.log(`[DEBUG usage endpoint] canUserConsume result: ${userCanConsume}`)
    } else {
      console.log(`[DEBUG usage endpoint] No userId provided, defaulting userCanConsume to true`)
    }

    const response = {
      ...usageStats,
      warning,
      userCanConsume
    }
    
    console.log(`[DEBUG usage endpoint] Final response userCanConsume: ${response.userCanConsume}`)
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to get usage stats:', error)
    return NextResponse.json(
      { error: 'Failed to get usage stats' },
      { status: 500 }
    )
  }
}