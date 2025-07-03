/**
 * Queue Fallback System
 * 
 * When Redis is not available, this provides a fallback mechanism
 * that processes jobs directly without queuing.
 */

import { processLink } from '@/lib/link-processor'

// Simple interface for fallback processing
interface ProcessLinkData {
  url: string
  messageTs: string
  channelId: string
  teamId: string
  slackTeamId: string
}

/**
 * Process a link directly without queuing (fallback mode)
 */
export async function processFallback(data: ProcessLinkData): Promise<void> {
  console.log(`🔄 Processing link directly (fallback mode)`, {
    url: data.url,
    channelId: data.channelId
  })

  try {
    await processLink(data)
    console.log(`✅ Direct processing completed for ${data.url}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ Direct processing failed for ${data.url}:`, errorMessage)
    
    // In fallback mode, we should retry critical failures
    // Wait 5 seconds and try once more
    console.log(`🔄 Retrying direct processing for ${data.url} in 5 seconds...`)
    setTimeout(async () => {
      try {
        await processLink(data)
        console.log(`✅ Direct processing retry succeeded for ${data.url}`)
      } catch (retryError) {
        console.error(`❌ Direct processing retry failed for ${data.url}:`, retryError)
        
        // Final attempt after 30 seconds
        console.log(`🔄 Final retry for ${data.url} in 30 seconds...`)
        setTimeout(async () => {
          try {
            await processLink(data)
            console.log(`✅ Direct processing final retry succeeded for ${data.url}`)
          } catch (finalError) {
            console.error(`💀 All retries failed for ${data.url}:`, finalError)
          }
        }, 30000)
      }
    }, 5000)
  }
}

/**
 * Check if we should use fallback mode
 */
export function shouldUseFallback(): boolean {
  return !process.env.REDIS_URL
}