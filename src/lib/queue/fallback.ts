/**
 * Queue Fallback System
 * 
 * When Vercel KV is not available, this provides a fallback mechanism
 * that processes jobs directly without queuing.
 */

import { processLink } from '@/lib/link-processor'
import { JobPayload } from './types'

/**
 * Process a link directly without queuing (fallback mode)
 * 
 * This is used when Vercel KV is not configured and ensures
 * the application continues to work even without the queue system.
 * 
 * @param data - Link processing data
 * @returns Promise that resolves after processing
 */
export async function processFallback(data: JobPayload['data']): Promise<void> {
  console.log(`🔄 Processing link directly (fallback mode)`, {
    url: data.url,
    channelId: data.channelId
  })

  try {
    // Process the link directly using the existing processor
    await processLink(data)
    
    console.log(`✅ Direct processing completed for ${data.url}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ Direct processing failed for ${data.url}:`, errorMessage)
    
    // In fallback mode, we don't retry - just log the failure
    // The user will need to manually retry or the next link will work
  }
}

/**
 * Check if we should use fallback mode
 * 
 * @returns True if Redis is not configured and we should use fallback
 */
export function shouldUseFallback(): boolean {
  // Only URL is required, token is optional for some Redis instances
  const redisConfigured = !!(process.env.KV_REST_API_URL || process.env.REDIS_URL)
  
  return !redisConfigured
}