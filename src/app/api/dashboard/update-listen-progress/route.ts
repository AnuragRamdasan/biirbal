import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { 
      linkId, 
      listenId, 
      currentTime, 
      duration, 
      completed = false,
      completionPercentage 
    } = await request.json()


    if (!linkId || !listenId) {
      return NextResponse.json(
        { error: 'linkId and listenId are required' },
        { status: 400 }
      )
    }

    if (typeof currentTime !== 'number' || currentTime < 0) {
      return NextResponse.json(
        { error: 'Valid currentTime is required' },
        { status: 400 }
      )
    }

    const db = await getDbClient()
    
    // Prepare update data
    const updateData: {
      resumePosition: number
      listenDuration?: number
      completed?: boolean
    } = {
      resumePosition: Math.round(currentTime)
    }

    // Add duration if provided - ensure we don't overwrite with smaller values
    if (typeof duration === 'number' && duration > 0) {
      // Get current listen record to check existing duration
      const currentListen = await db.audioListen.findUnique({
        where: { id: listenId },
        select: { listenDuration: true }
      })
      
      const newDuration = Math.round(duration)
      const existingDuration = currentListen?.listenDuration || 0
      
      
      // Only update if new duration is greater (prevents overwrites from out-of-order updates)
      if (newDuration > existingDuration) {
        updateData.listenDuration = newDuration
      } else {
      }
    }

    // Mark as completed if specified or if completion percentage >= 85%
    const isCompleted = completed || (completionPercentage && completionPercentage >= 85)
    
    if (isCompleted) {
      updateData.completed = true
    }


    // Update the listen record
    const updatedListen = await db.audioListen.update({
      where: { id: listenId },
      data: updateData
    })


    // No global archiving needed - completion is tracked per-user in audioListens table

    const response = { 
      listen: updatedListen,
      archived: false, // No global archiving - completion is per-user
      message: isCompleted ? 'Listen completed' : 'Progress updated'
    }


    return NextResponse.json(response)

  } catch (error) {
    console.error('Failed to update listen progress:', error)
    return NextResponse.json(
      { error: 'Failed to update listen progress' },
      { status: 500 }
    )
  }
}