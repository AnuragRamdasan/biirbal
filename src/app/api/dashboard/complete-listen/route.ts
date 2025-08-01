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

    // If marked as completed, archive the link
    let archivedLink = null
    if (completed === true) {
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
        }
      } catch (archiveError) {
        // Don't fail the whole request if archiving fails
        console.error('Failed to archive link:', archiveError)
      }
    }

    return NextResponse.json({ 
      listen: updatedListen,
      archived: !!archivedLink,
      message: completed ? 'Listen completed and link archived' : 'Progress updated'
    })
  } catch (error) {
    console.error('Failed to update listen progress:', error)
    return NextResponse.json(
      { error: 'Failed to update listen progress' },
      { status: 500 }
    )
  }
}