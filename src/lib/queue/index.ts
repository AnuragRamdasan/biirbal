/**
 * Queue System Exports
 * 
 * Main entry point for the Vercel KV-based queue system.
 * Provides clean imports for the entire queue functionality.
 */

// Core queue functionality
export { queueClient } from './client'
export { processJobs, workerHealthCheck } from './worker'

// Types
export type {
  JobPayload,
  JobStatus,
  QueueStats,
  WorkerConfig,
  QueueConfig
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
    priority: 1 // Default priority for link processing
  })
}