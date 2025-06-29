/**
 * Simple Redis Queue System
 * 
 * Basic Redis-only queue with fallback to direct processing.
 * Just needs REDIS_URL environment variable.
 */

// Core queue functionality
export { queueClient } from './client'
export { processJobs, workerHealthCheck } from './worker'

// Types
export type {
  JobPayload,
  JobStatus,
  QueueStats
} from './types'

// Convenience function for link processing
export async function queueLinkProcessing(params: {
  url: string
  messageTs: string
  channelId: string
  teamId: string
  slackTeamId: string
}): Promise<string> {
  const { queueClient } = await import('./client')
  
  return queueClient.add('PROCESS_LINK', params, {
    priority: 1
  })
}