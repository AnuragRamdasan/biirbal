// Import database utilities from prisma
import { withTimeout, healthCheck } from '../prisma'

// Export database utilities
export { withTimeout, healthCheck }
export { healthCheck as dbHealthCheck }

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

  // Health check
  healthCheck
}