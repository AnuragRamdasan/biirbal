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

    // Add duration if provided
    if (typeof duration === 'number' && duration > 0) {
      updateData.listenDuration = Math.round(duration)
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

    // If marked as completed, check if we should archive the link
    let archivedLink = null
    if (isCompleted) {
      try {
        // Get the processed link to check if it should be archived
        const processedLink = await db.processedLink.findUnique({
          where: { id: linkId },
          include: {
            listens: {
              where: { completed: true }
            }
          }
        })

        // Archive the link if it has completed listens and isn't already archived
        if (processedLink && processedLink.listens.length > 0 && !processedLink.isAccessRestricted) {
          archivedLink = await db.processedLink.update({
            where: { id: linkId },
            data: { 
              isAccessRestricted: true,
              updatedAt: new Date()
            }
          })
          console.log(`📁 Archived link ${linkId} after completion`)
        }
      } catch (archiveError) {
        // Don't fail the whole request if archiving fails
        console.error('Failed to archive link:', archiveError)
      }
    }

    return NextResponse.json({ 
      listen: updatedListen,
      archived: !!archivedLink,
      message: isCompleted ? 'Listen completed and link archived' : 'Progress updated'
    })

  } catch (error) {
    console.error('Failed to update listen progress:', error)
    return NextResponse.json(
      { error: 'Failed to update listen progress' },
      { status: 500 }
    )
  }
}