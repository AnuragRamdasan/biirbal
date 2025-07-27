import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { queueClient } from '@/lib/queue/client'

// This endpoint should be called by Heroku Scheduler every 5-10 minutes
export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting stuck job cleanup...')
    
    const db = await getDbClient()
    
    // Find tasks that have been stuck in PROCESSING status for more than 10 minutes
    const stuckTimeThreshold = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
    
    const stuckLinks = await db.processedLink.findMany({
      where: {
        processingStatus: 'PROCESSING',
        updatedAt: {
          lt: stuckTimeThreshold
        }
      },
      include: {
        team: true,
        channel: true
      }
    })

    console.log(`🔍 Found ${stuckLinks.length} stuck processing jobs`)
    
    if (stuckLinks.length === 0) {
      return NextResponse.json({ 
        message: 'No stuck jobs found',
        cleanedUp: 0
      })
    }

    let cleanedUpCount = 0
    const errors: string[] = []

    for (const link of stuckLinks) {
      try {
        console.log(`🔄 Restarting stuck job for link: ${link.url}`)
        
        // Reset the processing status to PENDING
        await db.processedLink.update({
          where: { id: link.id },
          data: {
            processingStatus: 'PENDING',
            errorMessage: null,
            updatedAt: new Date()
          }
        })

        // Re-queue the job for processing
        const jobData = {
          url: link.url,
          messageTs: link.messageTs,
          channelId: link.channel.slackChannelId,
          teamId: link.team.id,
          slackTeamId: link.team.slackTeamId,
          linkId: link.id // Include the existing link ID to update instead of create
        }

        await queueClient.add('PROCESS_LINK', jobData, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000
          },
          removeOnComplete: 10,
          removeOnFail: 5
        })

        cleanedUpCount++
        console.log(`✅ Successfully restarted job for link ID: ${link.id}`)
        
      } catch (error) {
        const errorMsg = `Failed to restart job for link ${link.id}: ${error}`
        console.error(`❌ ${errorMsg}`)
        errors.push(errorMsg)
        
        // Mark as failed if we can't restart it
        try {
          await db.processedLink.update({
            where: { id: link.id },
            data: {
              processingStatus: 'FAILED',
              errorMessage: 'Job stuck and failed to restart',
              updatedAt: new Date()
            }
          })
        } catch (updateError) {
          console.error(`❌ Failed to mark link ${link.id} as failed:`, updateError)
        }
      }
    }

    // Also check for very old PENDING jobs (more than 1 hour) and mark them as failed
    const oldPendingThreshold = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    
    const oldPendingLinks = await db.processedLink.findMany({
      where: {
        processingStatus: 'PENDING',
        createdAt: {
          lt: oldPendingThreshold
        }
      }
    })

    console.log(`🕐 Found ${oldPendingLinks.length} old pending jobs`)
    
    let failedOldCount = 0
    for (const link of oldPendingLinks) {
      try {
        await db.processedLink.update({
          where: { id: link.id },
          data: {
            processingStatus: 'FAILED',
            errorMessage: 'Job abandoned - too old',
            updatedAt: new Date()
          }
        })
        failedOldCount++
      } catch (error) {
        console.error(`❌ Failed to mark old pending link ${link.id} as failed:`, error)
      }
    }

    // Get queue stats for monitoring
    const queueStats = await queueClient.getStats()

    const result = {
      message: 'Stuck job cleanup completed',
      stuckJobsFound: stuckLinks.length,
      cleanedUp: cleanedUpCount,
      oldPendingJobsMarkedFailed: failedOldCount,
      errors: errors.length > 0 ? errors : undefined,
      queueStats,
      timestamp: new Date().toISOString()
    }

    console.log('🧹 Cleanup completed:', result)

    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Stuck job cleanup failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Cleanup job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}