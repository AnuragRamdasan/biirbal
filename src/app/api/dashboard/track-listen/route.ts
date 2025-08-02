import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { linkId, userId } = await request.json()

    if (!linkId) {
      return NextResponse.json(
        { error: 'linkId is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
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
    
    // Validate that userId exists in users table if provided
    // Handle transition from Slack user IDs to database user IDs
    let validatedUserId = userId
    
    if (userId) {
      // First check if it's a database user ID
      let userExists = await db.user.findUnique({
        where: { id: userId },
        select: { id: true }
      })
      
      // If not found and it looks like a Slack user ID (starts with U), 
      // try to find the user by slackUserId and get their database ID
      if (!userExists && userId.startsWith('U')) {
        const userBySlackId = await db.user.findUnique({
          where: { slackUserId: userId },
          select: { id: true }
        })
        
        if (userBySlackId) {
          validatedUserId = userBySlackId.id
        } else {
          return NextResponse.json(
            { error: 'Invalid userId - user not found' },
            { status: 400 }
          )
        }
      } else if (!userExists) {
        return NextResponse.json(
          { error: 'Invalid userId - user not found' },
          { status: 400 }
        )
      }
    }
    
    let existingListen = null
    
    // Find existing listen session for this user and link
    existingListen = await db.audioListen.findFirst({
      where: {
        processedLinkId: linkId,
        userId: validatedUserId,
        completed: false
      },
      orderBy: { listenedAt: 'desc' }
    })

    if (existingListen) {
      // Return existing incomplete listen record to resume from
      return NextResponse.json({ listen: existingListen })
    }

    // Create a new listen record
    const listen = await db.audioListen.create({
      data: {
        processedLinkId: linkId,
        userId: validatedUserId,
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