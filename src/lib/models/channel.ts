import { prisma } from '../prisma'
import { withTimeout } from '../prisma'
import type { Channel } from './types'

export class ChannelModel {
  /**
   * Upsert channel (create if doesn't exist, update if exists)
   */
  static async upsert(slackChannelId: string, teamId: string, channelName?: string): Promise<Channel | null> {
    return withTimeout(async () => {
      try {
        return await prisma.channel.upsert({
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
    return withTimeout(async () => {
      return await prisma.channel.findUnique({
        where: { slackChannelId }
      })
    })
  }

  /**
   * Find channel by internal ID
   */
  static async findById(id: string): Promise<Channel | null> {
    return withTimeout(async () => {
      return await prisma.channel.findUnique({
        where: { id }
      })
    })
  }

  /**
   * Update channel data
   */
  static async update(id: string, data: Partial<Channel>): Promise<Channel | null> {
    return withTimeout(async () => {
      try {
        return await prisma.channel.update({
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