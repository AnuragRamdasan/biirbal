import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    const db = await getDbClient()
    
    if (teamId) {
      // Get specific team
      const team = await db.team.findUnique({
        where: { id: teamId },
        include: { 
          subscription: true,
          users: { select: { id: true, slackUserId: true, isActive: true } },
          processedLinks: { 
            select: { id: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      })

      return NextResponse.json({
        teamId,
        found: !!team,
        team: team ? {
          id: team.id,
          slackTeamId: team.slackTeamId,
          teamName: team.teamName,
          isActive: team.isActive,
          subscription: team.subscription,
          userCount: team.users.length,
          linkCount: team.processedLinks.length,
          recentLinks: team.processedLinks
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
              linksProcessed: true,
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