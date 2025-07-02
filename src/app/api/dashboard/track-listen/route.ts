import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Validate that the slackUserId exists in our database if provided
    let validatedSlackUserId = null
    if (slackUserId) {
      const user = await prisma.user.findUnique({
        where: { slackUserId },
        select: { slackUserId: true }
      })
      if (user) {
        validatedSlackUserId = slackUserId
      }
    }

    // Create a new listen record
    const listen = await prisma.audioListen.create({
      data: {
        processedLinkId: linkId,
        userId, // Keep for backwards compatibility
        slackUserId: validatedSlackUserId, // New field for authenticated users
        userAgent,
        ipAddress,
        listenedAt: new Date()
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