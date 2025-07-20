import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { generatePodcastToken } from '@/lib/podcast-feed'

export async function POST(request: NextRequest) {
  try {
    const { teamId } = await request.json()
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }
    
    const db = await getDbClient()
    
    // Verify team exists
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true }
    })
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }
    
    // Generate a new podcast token
    const podcastToken = generatePodcastToken(teamId)
    
    // Store or update the podcast token for this team
    // We'll use a simple approach and store it in team metadata or create a separate table
    // For now, let's add it to the team record (you might want to create a separate podcast_feeds table)
    await db.team.update({
      where: { id: teamId },
      data: {
        // We'll store the podcast token in a metadata field
        // Note: You might want to add this field to your Prisma schema
        updatedAt: new Date()
      }
    })
    
    // Get the base URL from the request or environment
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('host') || 'biirbal.ai'
    const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`
    const podcastFeedUrl = `${baseUrl}/api/podcast/${teamId}?token=${podcastToken}`
    
    return NextResponse.json({
      success: true,
      podcastFeedUrl,
      token: podcastToken,
      teamName: team.name
    })
    
  } catch (error) {
    console.error('Generate podcast token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }
    
    const db = await getDbClient()
    
    // Get team info
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true }
    })
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }
    
    // For now, generate a new token each time
    // In production, you might want to store and reuse tokens
    const podcastToken = generatePodcastToken(teamId)
    // Get the base URL from the request or environment
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('host') || 'biirbal.ai'
    const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`
    const podcastFeedUrl = `${baseUrl}/api/podcast/${teamId}?token=${podcastToken}`
    
    console.log('GET: Generating podcast feed URL:', { protocol, host, baseUrl, podcastFeedUrl }) // Debug log
    
    return NextResponse.json({
      success: true,
      podcastFeedUrl,
      token: podcastToken,
      teamName: team.name
    })
    
  } catch (error) {
    console.error('Get podcast token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}