/**
 * Queue Fallback System
 * 
 * When Redis is not available, this provides a fallback mechanism
 * that processes jobs directly without queuing.
 */

import { processLink } from '@/lib/link-processor'
import { JobPayload } from './types'

/**
 * Process a link directly without queuing (fallback mode)
 */
export async function processFallback(data: JobPayload['data']): Promise<void> {
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
  }
}

/**
 * Check if we should use fallback mode
 */
export function shouldUseFallback(): boolean {
  return !process.env.REDIS_URL
}