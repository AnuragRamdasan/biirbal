import { prisma } from '../prisma'
import { withTimeout } from '../prisma'
import type { AudioListen } from './types'

export class AudioListenModel {
  /**
   * Create a new audio listen record
   */
  static async create(data: {
    processedLinkId: string
    userId?: string
    slackUserId?: string
    userAgent?: string
    ipAddress?: string
    completed?: boolean
    listenDuration?: number
  }): Promise<AudioListen | null> {
    return withTimeout(async () => {
      try {
        return await prisma.audioListen.create({
          data: {
            processedLinkId: data.processedLinkId,
            userId: data.userId,
            slackUserId: data.slackUserId,
            userAgent: data.userAgent,
            ipAddress: data.ipAddress,
            completed: data.completed || false,
            listenDuration: data.listenDuration
          }
        })
      } catch (error) {
        console.error('Failed to create audio listen:', error)
        return null
      }
    })
  }

  /**
   * Update audio listen record
   */
  static async update(id: string, data: Partial<AudioListen>): Promise<AudioListen | null> {
    return withTimeout(async () => {
      try {
        return await prisma.audioListen.update({
          where: { id },
          data: {
            completed: data.completed,
            listenDuration: data.listenDuration
          }
        })
      } catch (error) {
        console.error('Failed to update audio listen:', error)
        return null
      }
    })
  }

  /**
   * Find audio listen records by processed link ID
   */
  static async findByProcessedLinkId(processedLinkId: string): Promise<AudioListen[]> {
    return withTimeout(async () => {
      return await prisma.audioListen.findMany({
        where: { processedLinkId },
        orderBy: { listenedAt: 'desc' }
      })
    })
  }

  /**
   * Find audio listen record by ID
   */
  static async findById(id: string): Promise<AudioListen | null> {
    return withTimeout(async () => {
      return await prisma.audioListen.findUnique({
        where: { id }
      })
    })
  }

  /**
   * Get listen statistics for a processed link
   */
  static async getStatsByProcessedLinkId(processedLinkId: string): Promise<{
    totalListens: number
    completedListens: number
    averageDuration: number | null
  }> {
    return withTimeout(async () => {
      const [totalStats, completedStats, avgDuration] = await Promise.all([
        prisma.audioListen.count({
          where: { processedLinkId }
        }),
        prisma.audioListen.count({
          where: { processedLinkId, completed: true }
        }),
        prisma.audioListen.aggregate({
          where: { processedLinkId },
          _avg: { listenDuration: true }
        })
      ])

      return {
        totalListens: totalStats,
        completedListens: completedStats,
        averageDuration: avgDuration._avg.listenDuration
      }
    })
  }

  /**
   * Get recent listens for a team
   */
  static async getRecentByTeamId(teamId: string, limit: number = 10): Promise<AudioListen[]> {
    return withTimeout(async () => {
      return await prisma.audioListen.findMany({
        where: {
          processedLink: {
            teamId
          }
        },
        include: {
          processedLink: true,
          user: true
        },
        orderBy: { listenedAt: 'desc' },
        take: limit
      })
    })
  }
}