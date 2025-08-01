import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teamId = searchParams.get('teamId')
    const userId = searchParams.get('userId') // Primary user identifier (database user.id)
    const slackUserId = searchParams.get('slackUserId') // Legacy parameter for backwards compatibility

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      )
    }

    const db = await getDbClient()
    
    // Find the team by slackTeamId to get the database team ID
    const team = await db.team.findUnique({
      where: { slackTeamId: teamId },
      select: { id: true }
    })
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Get total links count
    const totalLinks = await db.processedLink.count({
      where: { teamId: team.id }
    })

    // Get completed links count
    const completedLinks = await db.processedLink.count({
      where: { 
        teamId: team.id,
        processingStatus: 'COMPLETED'
      }
    })

    // Calculate total minutes curated from TTS script length
    // Average speaking rate is ~150 words per minute
    const completedLinksWithScript = await db.processedLink.findMany({
      where: { 
        teamId: team.id,
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

    // Get total listens and minutes listened - include ALL listening sessions for cumulative historic total
    let totalListens = 0
    let totalMinutesListened = 0

    if (userId || slackUserId) {
      // User-specific stats - include all sessions, even incomplete ones with substantial listening time
      // Prioritize userId (database user ID) over slackUserId
      const whereCondition = userId 
        ? { userId: userId }
        : { slackUserId: slackUserId }
      
      const userListens = await db.audioListen.findMany({
        where: {
          ...whereCondition,
          processedLink: {
            teamId: team.id
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
      
      totalListens = meaningfulListens.length
      totalMinutesListened = Math.round(
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
    } else {
      // Team-wide stats - include all sessions for cumulative historic total
      const teamListens = await db.audioListen.findMany({
        where: {
          processedLink: {
            teamId: team.id
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

      // Count all listens that have meaningful engagement
      const meaningfulListens = teamListens.filter(listen => 
        listen.completed || 
        (listen.listenDuration && listen.listenDuration > 10) ||
        (listen.resumePosition && listen.resumePosition > 10)
      )
      
      totalListens = meaningfulListens.length
      totalMinutesListened = Math.round(
        teamListens.reduce((total, listen) => {
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
    }

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