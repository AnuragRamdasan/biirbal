import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { linkId, listenId, duration, currentTime, completed = true } = await request.json()

    if (!linkId || !listenId) {
      return NextResponse.json(
        { error: 'linkId and listenId are required' },
        { status: 400 }
      )
    }

    // Update the listen record with progress and completion status
    const db = await getDbClient()
    const updateData: {
      listenDuration?: number
      resumePosition?: number
      completed?: boolean
    } = {}
    
    if (typeof duration === 'number') {
      updateData.listenDuration = Math.round(duration)
    }
    
    if (typeof currentTime === 'number') {
      updateData.resumePosition = Math.round(currentTime)
    }
    
    if (completed === true) {
      updateData.completed = true
    }

    const updatedListen = await db.audioListen.update({
      where: { id: listenId },
      data: updateData
    })

    // No global archiving needed - completion is tracked per-user in audioListens table

    return NextResponse.json({ 
      listen: updatedListen,
      archived: false, // No global archiving - completion is per-user
      message: completed ? 'Listen completed' : 'Progress updated'
    })
  } catch (error) {
    console.error('Failed to update listen progress:', error)
    return NextResponse.json(
      { error: 'Failed to update listen progress' },
      { status: 500 }
    )
  }
}