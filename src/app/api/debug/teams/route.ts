import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const db = await getDbClient()
    
    if (userId) {
      // Get user's team info
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { 
          team: {
            include: {
              subscription: true,
              users: { select: { id: true, slackUserId: true, isActive: true } },
              processedLinks: { 
                select: { id: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                take: 5
              }
            }
          }
        }
      })

      return NextResponse.json({
        userId,
        found: !!(user && user.team),
        team: user?.team ? {
          id: user.team.id,
          slackTeamId: user.team.slackTeamId,
          teamName: user.team.teamName,
          isActive: user.team.isActive,
          subscription: user.team.subscription,
          userCount: user.team.users.length,
          linkCount: user.team.processedLinks.length,
          recentLinks: user.team.processedLinks
        } : null
      })
    } else {
      // List all teams
      const teams = await db.team.findMany({
        select: {
          id: true,
          slackTeamId: true,
          teamName: true,
          isActive: true,
          createdAt: true,
          subscription: {
            select: {
              planId: true,
              status: true,
              monthlyLinkLimit: true
            }
          },
          _count: {
            select: {
              users: true,
              processedLinks: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })

      return NextResponse.json({
        totalTeams: teams.length,
        teams
      })
    }
  } catch (error) {
    console.error('Debug teams API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}