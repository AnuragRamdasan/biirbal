import { getPrismaClient, dbWithTimeout } from './connection'
import type { Channel } from './types'

export class ChannelModel {
  /**
   * Upsert channel (create if doesn't exist, update if exists)
   */
  static async upsert(slackChannelId: string, teamId: string, channelName?: string): Promise<Channel | null> {
    return dbWithTimeout(async () => {
      try {
        return await getPrismaClient().channel.upsert({
          where: { slackChannelId },
          update: {
            teamId,
            channelName,
            isActive: true
          },
          create: {
            slackChannelId,
            teamId,
            channelName,
            isActive: true
          }
        })
      } catch (error) {
        console.error('Failed to upsert channel:', error)
        return null
      }
    })
  }

  /**
   * Find channel by Slack channel ID
   */
  static async findBySlackId(slackChannelId: string): Promise<Channel | null> {
    return dbWithTimeout(async () => {
      return await getPrismaClient().channel.findUnique({
        where: { slackChannelId }
      })
    })
  }

  /**
   * Find channel by internal ID
   */
  static async findById(id: string): Promise<Channel | null> {
    return dbWithTimeout(async () => {
      return await getPrismaClient().channel.findUnique({
        where: { id }
      })
    })
  }

  /**
   * Update channel data
   */
  static async update(id: string, data: Partial<Channel>): Promise<Channel | null> {
    return dbWithTimeout(async () => {
      try {
        return await getPrismaClient().channel.update({
          where: { id },
          data: {
            channelName: data.channelName,
            isActive: data.isActive
          }
        })
      } catch (error) {
        console.error('Failed to update channel:', error)
        return null
      }
    })
  }
}