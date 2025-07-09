import { sql, withTimeout } from './db'
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
      // First try to find existing link
      const existing = await sql`
        SELECT * FROM processed_links 
        WHERE url = ${data.url} AND "messageTs" = ${data.messageTs} AND "channelId" = ${data.channelId}
      `
      
      if (existing.length > 0) {
        // Update existing link
        const result = await sql`
          UPDATE processed_links 
          SET 
            "processingStatus" = ${data.processingStatus || 'PENDING'},
            "title" = COALESCE(${data.title}, title),
            "extractedText" = COALESCE(${data.extractedText}, "extractedText"),
            "updatedAt" = NOW()
          WHERE url = ${data.url} AND "messageTs" = ${data.messageTs} AND "channelId" = ${data.channelId}
          RETURNING *
        `
        
        if (result.length === 0) return null

        const link = result[0]
        return {
          id: link.id,
          url: link.url,
          messageTs: link.messageTs,
          channelId: link.channelId,
          teamId: link.teamId,
          title: link.title,
          extractedText: link.extractedText,
          audioFileUrl: link.audioFileUrl,
          audioFileKey: link.audioFileKey,
          ttsScript: link.ttsScript,
          processingStatus: link.processingStatus,
          errorMessage: link.errorMessage,
          createdAt: new Date(link.createdAt),
          updatedAt: new Date(link.updatedAt)
        }
      } else {
        // Create new link with generated ID
        const result = await sql`
          INSERT INTO processed_links (
            id, url, "messageTs", "channelId", "teamId", title, "extractedText", 
            "processingStatus", "createdAt", "updatedAt"
          )
          VALUES (
            'pl_' || substr(md5(random()::text), 1, 23),
            ${data.url}, ${data.messageTs}, ${data.channelId}, ${data.teamId}, 
            ${data.title || null}, ${data.extractedText || null}, 
            ${data.processingStatus || 'PENDING'}, NOW(), NOW()
          )
          RETURNING *
        `
        
        if (result.length === 0) return null

        const link = result[0]
        return {
          id: link.id,
          url: link.url,
          messageTs: link.messageTs,
          channelId: link.channelId,
          teamId: link.teamId,
          title: link.title,
          extractedText: link.extractedText,
          audioFileUrl: link.audioFileUrl,
          audioFileKey: link.audioFileKey,
          ttsScript: link.ttsScript,
          processingStatus: link.processingStatus,
          errorMessage: link.errorMessage,
          createdAt: new Date(link.createdAt),
          updatedAt: new Date(link.updatedAt)
        }
      }
    })
  }

  /**
   * Update processed link by ID
   */
  static async update(id: string, data: Partial<ProcessedLink>): Promise<ProcessedLink | null> {
    return withTimeout(async () => {
      const updateFields = []
      const values = []
      
      if (data.title !== undefined) {
        updateFields.push('"title" = $' + (values.length + 1))
        values.push(data.title)
      }
      if (data.extractedText !== undefined) {
        updateFields.push('"extractedText" = $' + (values.length + 1))
        values.push(data.extractedText)
      }
      if (data.audioFileUrl !== undefined) {
        updateFields.push('"audioFileUrl" = $' + (values.length + 1))
        values.push(data.audioFileUrl)
      }
      if (data.audioFileKey !== undefined) {
        updateFields.push('"audioFileKey" = $' + (values.length + 1))
        values.push(data.audioFileKey)
      }
      if (data.ttsScript !== undefined) {
        updateFields.push('"ttsScript" = $' + (values.length + 1))
        values.push(data.ttsScript)
      }
      if (data.processingStatus !== undefined) {
        updateFields.push('"processingStatus" = $' + (values.length + 1))
        values.push(data.processingStatus)
      }
      if (data.errorMessage !== undefined) {
        updateFields.push('"errorMessage" = $' + (values.length + 1))
        values.push(data.errorMessage)
      }
      
      updateFields.push('"updatedAt" = NOW()')
      
      const query = `
        UPDATE processed_links 
        SET ${updateFields.join(', ')} 
        WHERE id = $${values.length + 1} 
        RETURNING *
      `
      
      values.push(id)
      
      const result = await sql.unsafe(query, values)
      const link = result[0]
      
      if (!link) return null
      
      return {
        id: link.id,
        url: link.url,
        messageTs: link.messageTs,
        channelId: link.channelId,
        teamId: link.teamId,
        title: link.title,
        extractedText: link.extractedText,
        audioFileUrl: link.audioFileUrl,
        audioFileKey: link.audioFileKey,
        ttsScript: link.ttsScript,
        processingStatus: link.processingStatus,
        errorMessage: link.errorMessage,
        createdAt: new Date(link.createdAt),
        updatedAt: new Date(link.updatedAt)
      }
    })
  }

  /**
   * Find processed link by ID
   */
  static async findById(id: string): Promise<ProcessedLink | null> {
    return withTimeout(async () => {
      const result = await sql`
        SELECT * FROM processed_links WHERE id = ${id}
      `
      
      if (result.length === 0) return null
      
      const link = result[0]
      return {
        id: link.id,
        url: link.url,
        messageTs: link.messageTs,
        channelId: link.channelId,
        teamId: link.teamId,
        title: link.title,
        extractedText: link.extractedText,
        audioFileUrl: link.audioFileUrl,
        audioFileKey: link.audioFileKey,
        ttsScript: link.ttsScript,
        processingStatus: link.processingStatus,
        errorMessage: link.errorMessage,
        createdAt: new Date(link.createdAt),
        updatedAt: new Date(link.updatedAt)
      }
    })
  }

  /**
   * Find processed links by team ID
   */
  static async findByTeamId(teamId: string, limit: number = 50): Promise<ProcessedLink[]> {
    return withTimeout(async () => {
      const result = await sql`
        SELECT * FROM processed_links 
        WHERE "teamId" = ${teamId} 
        ORDER BY "createdAt" DESC 
        LIMIT ${limit}
      `
      
      return result.map(link => ({
        id: link.id,
        url: link.url,
        messageTs: link.messageTs,
        channelId: link.channelId,
        teamId: link.teamId,
        title: link.title,
        extractedText: link.extractedText,
        audioFileUrl: link.audioFileUrl,
        audioFileKey: link.audioFileKey,
        ttsScript: link.ttsScript,
        processingStatus: link.processingStatus,
        errorMessage: link.errorMessage,
        createdAt: new Date(link.createdAt),
        updatedAt: new Date(link.updatedAt)
      }))
    })
  }

  /**
   * Find processed link by unique combination
   */
  static async findByUnique(url: string, messageTs: string, channelId: string): Promise<ProcessedLink | null> {
    return withTimeout(async () => {
      const result = await sql`
        SELECT * FROM processed_links 
        WHERE url = ${url} AND "messageTs" = ${messageTs} AND "channelId" = ${channelId}
      `
      
      if (result.length === 0) return null
      
      const link = result[0]
      return {
        id: link.id,
        url: link.url,
        messageTs: link.messageTs,
        channelId: link.channelId,
        teamId: link.teamId,
        title: link.title,
        extractedText: link.extractedText,
        audioFileUrl: link.audioFileUrl,
        audioFileKey: link.audioFileKey,
        ttsScript: link.ttsScript,
        processingStatus: link.processingStatus,
        errorMessage: link.errorMessage,
        createdAt: new Date(link.createdAt),
        updatedAt: new Date(link.updatedAt)
      }
    })
  }
}