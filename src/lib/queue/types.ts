/**
 * Queue Types for Redis-based job processing
 * 
 * This module defines the core types and interfaces for the simple
 * Redis job queue system.
 */

export interface JobPayload {
  /** Job identifier */
  id: string
  /** Job type - determines which worker processes it */
  type: 'PROCESS_LINK'
  /** Job data payload */
  data: {
    url: string
    messageTs: string
    channelId: string
    teamId: string
    slackTeamId: string
  }
  /** Job priority (higher = processed first) */
  priority: number
  /** Maximum retry attempts */
  maxRetries: number
  /** Current retry count */
  retryCount: number
  /** Job creation timestamp */
  createdAt: number
  /** Last updated timestamp */
  updatedAt: number
  /** When job was first attempted */
  startedAt?: number
  /** When job completed */
  completedAt?: number
  /** Error message if failed */
  error?: string
}

export interface JobStatus {
  /** Job identifier */
  id: string
  /** Current job status */
  status: 'pending' | 'processing' | 'completed' | 'failed'
  /** Progress information */
  progress?: {
    phase: string
    percentage: number
    message: string
  }
  /** Result data (for completed jobs) */
  result?: unknown
  /** Error information (for failed jobs) */
  error?: {
    message: string
    stack?: string
    retryable: boolean
  }
  /** Processing timestamps */
  timestamps: {
    created: number
    started?: number
    completed?: number
  }
}

export interface QueueStats {
  /** Number of pending jobs */
  pending: number
  /** Number of processing jobs */
  processing: number
  /** Number of completed jobs (last 24h) */
  completed: number
  /** Number of failed jobs (last 24h) */
  failed: number
  /** Average processing time (ms) */
  avgProcessingTime: number
  /** Queue health status */
  healthy: boolean
}

