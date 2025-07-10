import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { linkId, userId, slackUserId } = await request.json()

    if (!linkId) {
      return NextResponse.json(
        { error: 'linkId is required' },
        { status: 400 }
      )
    }

    // Get user agent and IP for tracking (optional)
    const userAgent = request.headers.get('user-agent') || undefined
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : 
      request.headers.get('x-real-ip') || undefined

    // Create a new listen record
    const db = await getDbClient()
    const listen = await db.audioListen.create({
      data: {
        processedLinkId: linkId,
        userId, // Keep for backwards compatibility
        slackUserId, // New field for authenticated users
        userAgent,
        ipAddress
      }
    })

    return NextResponse.json({ listen })
  } catch (error) {
    console.error('Failed to track listen:', error)
    return NextResponse.json(
      { error: 'Failed to track listen' },
      { status: 500 }
    )
  }
}