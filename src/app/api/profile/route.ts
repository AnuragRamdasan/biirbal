import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // For now, get team ID from query params
    // In a real app, this would come from authenticated session
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    
    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID required' },
        { status: 400 }
      )
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        subscription: true,
        _count: {
          select: {
            processedLinks: true
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Get usage statistics
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const monthlyUsage = await prisma.processedLink.count({
      where: {
        teamId: team.id,
        createdAt: {
          gte: currentMonth
        }
      }
    })

    const totalListens = await prisma.audioListen.count({
      where: {
        processedLink: {
          teamId: team.id
        }
      }
    })

    return NextResponse.json({
      team: {
        id: team.id,
        slackTeamId: team.slackTeamId,
        teamName: team.teamName,
        isActive: team.isActive,
        createdAt: team.createdAt,
        totalLinks: team._count.processedLinks
      },
      subscription: team.subscription,
      usage: {
        monthlyUsage,
        totalListens,
        monthlyLimit: team.subscription?.monthlyLimit || 50
      }
    })
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile data' },
      { status: 500 }
    )
  }
}