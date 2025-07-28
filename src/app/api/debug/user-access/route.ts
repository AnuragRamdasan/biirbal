import { NextRequest, NextResponse } from 'next/server'
import { getTeamUsageStats, canUserConsume } from '@/lib/subscription-utils'
import { getDbClient } from '@/lib/db'
import { getPlanById } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const userId = searchParams.get('userId')

    if (!teamId || !userId) {
      return NextResponse.json(
        { error: 'teamId and userId are required' },
        { status: 400 }
      )
    }

    const db = await getDbClient()
    
    // Get team details
    const team = await db.team.findUnique({
      where: { slackTeamId: teamId },
      include: { 
        subscription: true,
        users: { 
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Get usage stats
    const usageStats = await getTeamUsageStats(teamId)
    
    // Check user access
    const userCanConsume = await canUserConsume(teamId, userId)
    
    // Get plan details
    const plan = getPlanById(team.subscription?.planId || 'free')
    
    // Get active users
    const activeUsers = team.users.filter(u => u.isActive)
    const userIndex = activeUsers.findIndex(u => u.slackUserId === userId)
    
    return NextResponse.json({
      debug: {
        teamId,
        userId,
        subscription: {
          planId: team.subscription?.planId,
          status: team.subscription?.status,
          userLimit: team.subscription?.userLimit,
          monthlyLinkLimit: team.subscription?.monthlyLinkLimit
        },
        plan: {
          id: plan?.id,
          name: plan?.name,
          userLimit: plan?.userLimit,
          monthlyLinkLimit: plan?.monthlyLinkLimit
        },
        users: {
          total: team.users.length,
          active: activeUsers.length,
          activeUserIds: activeUsers.map(u => u.slackUserId),
          userIndex,
          requestedUser: team.users.find(u => u.slackUserId === userId)
        },
        calculations: {
          isUserActive: activeUsers.some(u => u.slackUserId === userId),
          userIndexCheck: userIndex !== -1 && userIndex < (plan?.userLimit || 0),
          userCanConsume,
          userLimitExceeded: usageStats.userLimitExceeded
        }
      }
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to get debug info', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}