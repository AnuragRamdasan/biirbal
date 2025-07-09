import { prisma } from '../prisma'
import { withTimeout } from '../prisma'
import type { ProcessedLink } from './types'

export class ProcessedLinkModel {
  /**
   * Upsert processed link (create if doesn't exist, update if exists)
   */
  static async upsert(data: {
    url: string
    messageTs: string
    channelId: string
    teamId: string
    title?: string
    extractedText?: string
    processingStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  }): Promise<ProcessedLink | null> {
    return withTimeout(async () => {
      try {
        return await prisma.processedLink.upsert({
          where: {
            url_messageTs_channelId: {
              url: data.url,
              messageTs: data.messageTs,
              channelId: data.channelId
            }
          },
          update: {
            processingStatus: data.processingStatus || 'PENDING',
            title: data.title,
            extractedText: data.extractedText
          },
          create: {
            url: data.url,
            messageTs: data.messageTs,
            channelId: data.channelId,
            teamId: data.teamId,
            title: data.title,
            extractedText: data.extractedText,
            processingStatus: data.processingStatus || 'PENDING'
          }
        })
      } catch (error) {
        console.error('Failed to upsert processed link:', error)
        return null
      }
    })
  }

  /**
   * Update processed link by ID
   */
  static async update(id: string, data: Partial<ProcessedLink>): Promise<ProcessedLink | null> {
    return withTimeout(async () => {
      try {
        return await prisma.processedLink.update({
          where: { id },
          data: {
            title: data.title,
            extractedText: data.extractedText,
            audioFileUrl: data.audioFileUrl,
            audioFileKey: data.audioFileKey,
            ttsScript: data.ttsScript,
            processingStatus: data.processingStatus,
            errorMessage: data.errorMessage
          }
        })
      } catch (error) {
        console.error('Failed to update processed link:', error)
        return null
      }
    })
  }

  /**
   * Find processed link by ID
   */
  static async findById(id: string): Promise<ProcessedLink | null> {
    return withTimeout(async () => {
      return await prisma.processedLink.findUnique({
        where: { id }
      })
    })
  }

  /**
   * Find processed links by team ID
   */
  static async findByTeamId(teamId: string, limit: number = 50): Promise<ProcessedLink[]> {
    return withTimeout(async () => {
      return await prisma.processedLink.findMany({
        where: { teamId },
        orderBy: { createdAt: 'desc' },
        take: limit
      })
    })
  }

  /**
   * Find processed link by unique combination
   */
  static async findByUnique(url: string, messageTs: string, channelId: string): Promise<ProcessedLink | null> {
    return withTimeout(async () => {
      return await prisma.processedLink.findUnique({
        where: {
          url_messageTs_channelId: {
            url,
            messageTs,
            channelId
          }
        }
      })
    })
  }
}