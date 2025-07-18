import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { linkId, listenId } = await request.json()

    if (!linkId || !listenId) {
      return NextResponse.json(
        { error: 'linkId and listenId are required' },
        { status: 400 }
      )
    }

    // Update the listen record to mark as completed
    const db = await getDbClient()
    const updatedListen = await db.audioListen.update({
      where: { id: listenId },
      data: {
        completed: true
      }
    })

    return NextResponse.json({ listen: updatedListen })
  } catch (error) {
    console.error('Failed to mark listen as completed:', error)
    return NextResponse.json(
      { error: 'Failed to mark listen as completed' },
      { status: 500 }
    )
  }
}