import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { generateRSSFeed } from '@/lib/podcast-feed'

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!teamId) {
      return new NextResponse('Team ID is required', { status: 400 })
    }

    // Simple token validation - check format and length
    if (!token || token.length < 20 || !token.includes('-')) {
      return new NextResponse('Valid token is required', { status: 401 })
    }

    const db = await getDbClient()
    
    // Get team info
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: {
        name: true,
        id: true
      }
    })

    if (!team) {
      return new NextResponse('Team not found', { status: 404 })
    }

    // Get all processed links with audio for this team (last 50 items)
    const processedLinks = await db.processedLink.findMany({
      where: {
        teamId: teamId,
        processingStatus: 'COMPLETED',
        audioFileUrl: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50,
      select: {
        id: true,
        title: true,
        url: true,
        extractedText: true,
        audioFileUrl: true,
        createdAt: true,
        ogImage: true
      }
    })

    // Generate RSS feed
    const rssXml = generateRSSFeed({
      title: `${team.name} - Audio Summaries`,
      description: `Audio summaries of links shared in ${team.name} workspace`,
      teamId: teamId,
      items: processedLinks.map(link => ({
        id: link.id,
        title: link.title || 'Untitled',
        description: link.extractedText || 'Audio summary',
        audioUrl: link.audioFileUrl!,
        originalUrl: link.url,
        pubDate: link.createdAt,
        imageUrl: link.ogImage
      }))
    })

    return new NextResponse(rssXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      }
    })

  } catch (error) {
    console.error('Podcast feed error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}