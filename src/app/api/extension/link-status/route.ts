import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication first
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('linkId')
    const url = searchParams.get('url')
    const teamId = searchParams.get('teamId')

    if (!linkId && !url) {
      return NextResponse.json(
        { error: 'Either linkId or url is required' },
        { status: 400 }
      )
    }

    const db = await getDbClient()

    // Build where clause
    let whereClause: any = {}
    if (linkId) {
      whereClause.id = linkId
    } else if (url && teamId) {
      whereClause.url = url
      whereClause.teamId = teamId
    } else {
      return NextResponse.json(
        { error: 'url requires teamId' },
        { status: 400 }
      )
    }

    // Get the processed link
    const processedLink = await db.processedLink.findFirst({
      where: whereClause,
      include: {
        team: {
          include: {
            memberships: {
              where: {
                userId: session.user.id,
                isActive: true
              }
            }
          }
        }
      }
    })

    if (!processedLink) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this link's team
    if (processedLink.team.memberships.length === 0) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Return link status and audio URL if available
    return NextResponse.json({
      id: processedLink.id,
      url: processedLink.url,
      title: processedLink.title,
      status: processedLink.processingStatus,
      audioUrl: processedLink.audioFileUrl,
      errorMessage: processedLink.errorMessage,
      createdAt: processedLink.createdAt,
      updatedAt: processedLink.updatedAt
    })

  } catch (error) {
    console.error('Failed to get link status:', error)
    return NextResponse.json(
      { error: 'Failed to get link status' },
      { status: 500 }
    )
  }
}