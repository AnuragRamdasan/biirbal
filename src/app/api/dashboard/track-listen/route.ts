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

    // Check if user already has an incomplete listen record for this link
    const db = await getDbClient()
    
    let existingListen = null
    
    if (slackUserId) {
      existingListen = await db.audioListen.findFirst({
        where: {
          processedLinkId: linkId,
          slackUserId: slackUserId,
          completed: false
        },
        orderBy: { listenedAt: 'desc' }
      })
    } else if (userId) {
      existingListen = await db.audioListen.findFirst({
        where: {
          processedLinkId: linkId,
          userId: userId,
          completed: false
        },
        orderBy: { listenedAt: 'desc' }
      })
    }

    if (existingListen) {
      // Return existing incomplete listen record to resume from
      return NextResponse.json({ listen: existingListen })
    }

    // Create a new listen record
    const listen = await db.audioListen.create({
      data: {
        processedLinkId: linkId,
        userId, // Keep for backwards compatibility
        slackUserId, // New field for authenticated users
        userAgent,
        ipAddress,
        resumePosition: 0
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