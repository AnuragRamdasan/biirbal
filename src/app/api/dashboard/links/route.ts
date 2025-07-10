import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // For now, we'll return all links. In production, you'd want to add authentication
    // and filter by the authenticated user's team
    const db = await getDbClient()
    const links = await db.processedLink.findMany({
      include: {
        listens: {
          orderBy: {
            listenedAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ links })
  } catch (error) {
    console.error('Failed to fetch links:', error)
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    )
  }
}