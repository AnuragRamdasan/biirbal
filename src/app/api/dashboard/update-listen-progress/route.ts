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

    console.log('🚀 [SERVER] Update listen progress called:', {
      linkId,
      listenId,
      currentTime,
      duration,
      completed,
      completionPercentage
    })

    if (!linkId || !listenId) {
      console.log('❌ [SERVER] Missing required fields')
      return NextResponse.json(
        { error: 'linkId and listenId are required' },
        { status: 400 }
      )
    }

    if (typeof currentTime !== 'number' || currentTime < 0) {
      console.log('❌ [SERVER] Invalid currentTime')
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
      console.log('⏱️ [SERVER] Checking duration update')
      // Get current listen record to check existing duration
      const currentListen = await db.audioListen.findUnique({
        where: { id: listenId },
        select: { listenDuration: true }
      })
      
      const newDuration = Math.round(duration)
      const existingDuration = currentListen?.listenDuration || 0
      
      console.log('⏱️ [SERVER] Duration comparison:', { newDuration, existingDuration })
      
      // Only update if new duration is greater (prevents overwrites from out-of-order updates)
      if (newDuration > existingDuration) {
        updateData.listenDuration = newDuration
        console.log('✅ [SERVER] Duration will be updated')
      } else {
        console.log('⚠️ [SERVER] Duration NOT updated (new <= existing)')
      }
    }

    // Mark as completed if specified or if completion percentage >= 85%
    const isCompleted = completed || (completionPercentage && completionPercentage >= 85)
    console.log('🏁 [SERVER] Completion check:', { completed, completionPercentage, isCompleted })
    
    if (isCompleted) {
      updateData.completed = true
    }

    console.log('💾 [SERVER] Update data prepared:', updateData)

    // Update the listen record
    const updatedListen = await db.audioListen.update({
      where: { id: listenId },
      data: updateData
    })

    console.log('✅ [SERVER] Listen record updated:', updatedListen)

    // If marked as completed, check if we should archive the link
    let archivedLink = null
    if (isCompleted) {
      console.log('📁 [SERVER] Checking if link should be archived')
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

        console.log('📋 [SERVER] Processed link found:', {
          id: processedLink?.id,
          isAccessRestricted: processedLink?.isAccessRestricted,
          completedListensCount: processedLink?.listens?.length
        })

        // Archive the link if it has completed listens and isn't already archived
        if (processedLink && processedLink.listens.length > 0 && !processedLink.isAccessRestricted) {
          console.log('🗃️ [SERVER] Archiving link...')
          archivedLink = await db.processedLink.update({
            where: { id: linkId },
            data: { 
              isAccessRestricted: true,
              updatedAt: new Date()
            }
          })
          console.log('✅ [SERVER] Link archived successfully:', archivedLink.id)
        } else {
          console.log('⚠️ [SERVER] Link NOT archived:', {
            reason: !processedLink ? 'Link not found' :
                   processedLink.listens.length === 0 ? 'No completed listens' :
                   processedLink.isAccessRestricted ? 'Already archived' : 'Unknown'
          })
        }
      } catch (archiveError) {
        // Don't fail the whole request if archiving fails
        console.error('❌ [SERVER] Failed to archive link:', archiveError)
      }
    } else {
      console.log('⏭️ [SERVER] Skipping archive check (not completed)')
    }

    const response = { 
      listen: updatedListen,
      archived: !!archivedLink,
      message: isCompleted ? 'Listen completed and link archived' : 'Progress updated'
    }

    console.log('📤 [SERVER] Sending response:', response)

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ [SERVER] Failed to update listen progress:', error)
    return NextResponse.json(
      { error: 'Failed to update listen progress' },
      { status: 500 }
    )
  }
}