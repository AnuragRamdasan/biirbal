import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') // Database user ID
    const teamId = searchParams.get('teamId') // Optional team ID

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const db = await getDbClient()
    
    // Get user and their team memberships
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

    // Get total links count
    const totalLinks = await db.processedLink.count({
      where: { teamId: targetTeam.id }
    })

    // Get completed links count
    const completedLinks = await db.processedLink.count({
      where: { 
        teamId: targetTeam.id,
        processingStatus: 'COMPLETED'
      }
    })

    // Calculate total minutes curated from TTS script length
    // Average speaking rate is ~150 words per minute
    const completedLinksWithScript = await db.processedLink.findMany({
      where: { 
        teamId: targetTeam.id,
        processingStatus: 'COMPLETED',
        ttsScript: { not: null }
      },
      select: { ttsScript: true }
    })

    const totalMinutesCurated = Math.round(
      completedLinksWithScript.reduce((total, link) => {
        if (link.ttsScript) {
          const wordCount = link.ttsScript.split(' ').length
          const minutes = wordCount / 150 // ~150 words per minute average speaking rate
          return total + minutes
        }
        return total
      }, 0)
    )

    // Get total listens and minutes listened - user-specific stats
    const userListens = await db.audioListen.findMany({
      where: {
        userId: userId,
        processedLink: {
          teamId: targetTeam.id
        }
      },
        select: {
          listenDuration: true,
          completed: true,
          resumePosition: true,
          processedLink: {
            select: {
              ttsScript: true
            }
          }
        }
      })

    // Count all listens that have meaningful engagement (> 10 seconds or completed)
    const meaningfulListens = userListens.filter(listen => 
      listen.completed || 
      (listen.listenDuration && listen.listenDuration > 10) ||
      (listen.resumePosition && listen.resumePosition > 10)
    )
    
    const totalListens = meaningfulListens.length
    const totalMinutesListened = Math.round(
      userListens.reduce((total, listen) => {
        // Use listenDuration if available (actual listening time)
        if (listen.listenDuration && listen.listenDuration > 0) {
          return total + (listen.listenDuration / 60)
        }
        // Use resumePosition as fallback (how far they got)
        if (listen.resumePosition && listen.resumePosition > 0) {
          return total + (listen.resumePosition / 60)
        }
        // Final fallback: if completed but no duration data, estimate from script
        if (listen.completed && listen.processedLink.ttsScript) {
          const wordCount = listen.processedLink.ttsScript.split(' ').length
          const estimatedMinutes = wordCount / 150
          return total + estimatedMinutes
        }
        return total
      }, 0)
    )

    return NextResponse.json({
      totalLinks,
      completedLinks,
      totalListens,
      totalMinutesCurated,
      totalMinutesListened,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}