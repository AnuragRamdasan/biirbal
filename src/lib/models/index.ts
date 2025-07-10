// Import database utilities from connection
import { dbWithTimeout, dbHealthCheck, getPrismaClient } from './connection'

// Export database utilities
export { dbWithTimeout, dbHealthCheck, getPrismaClient }
export { dbHealthCheck as healthCheck }

// Export types
export * from './types'

// Import all models
import { TeamModel } from './team'
import { ChannelModel } from './channel'
import { ProcessedLinkModel } from './processed-link'
import { SubscriptionModel } from './subscription'
import { AudioListenModel } from './audio-listen'

// Export all models
export { TeamModel, ChannelModel, ProcessedLinkModel, SubscriptionModel, AudioListenModel }

// Create a unified database object for backward compatibility
export const db = {
  // Team operations
  findTeamBySlackId: TeamModel.findBySlackId,
  findTeamById: TeamModel.findById,
  createTeam: TeamModel.create,
  updateTeam: TeamModel.update,

  // Channel operations
  upsertChannel: ChannelModel.upsert,
  findChannelBySlackId: ChannelModel.findBySlackId,
  findChannelById: ChannelModel.findById,
  updateChannel: ChannelModel.update,

  // ProcessedLink operations
  upsertProcessedLink: ProcessedLinkModel.upsert,
  updateProcessedLink: ProcessedLinkModel.update,
  findProcessedLinkById: ProcessedLinkModel.findById,
  findProcessedLinksByTeamId: ProcessedLinkModel.findByTeamId,
  findProcessedLinkByUnique: ProcessedLinkModel.findByUnique,

  // Subscription operations
  updateSubscription: SubscriptionModel.update,
  findSubscriptionByTeamId: SubscriptionModel.findByTeamId,
  createSubscription: SubscriptionModel.create,
  incrementLinksProcessed: SubscriptionModel.incrementLinksProcessed,
  resetLinksProcessed: SubscriptionModel.resetLinksProcessed,

  // AudioListen operations
  createAudioListen: AudioListenModel.create,
  updateAudioListen: AudioListenModel.update,
  findAudioListenById: AudioListenModel.findById,
  findAudioListensByProcessedLinkId: AudioListenModel.findByProcessedLinkId,
  getAudioListenStats: AudioListenModel.getStatsByProcessedLinkId,
  getRecentAudioListens: AudioListenModel.getRecentByTeamId,

  // QueuedJob operations
  createQueuedJob: async (data: { id: string; type: string; payload: any; status?: string; priority?: number; maxRetries?: number }) => {
    return dbWithTimeout(async () => {
      return await getPrismaClient().queuedJob.create({
        data: {
          ...data,
          status: data.status || 'PENDING',
          priority: data.priority || 1,
          maxRetries: data.maxRetries || 3
        }
      })
    })
  },
  updateQueuedJob: async (id: string, data: { status?: string; error?: string; retryCount?: number; processedAt?: Date }) => {
    return dbWithTimeout(async () => {
      return await getPrismaClient().queuedJob.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      })
    })
  },
  findPendingJobs: async (limit: number = 10) => {
    return dbWithTimeout(async () => {
      return await getPrismaClient().queuedJob.findMany({
        where: { status: 'PENDING' },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ],
        take: limit
      })
    })
  },

  // Health check
  healthCheck: dbHealthCheck
}