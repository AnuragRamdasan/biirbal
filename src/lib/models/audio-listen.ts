import { sql, withTimeout } from './db'
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
      const result = await sql`
        INSERT INTO audio_listens (
          id, "processedLinkId", "userId", "slackUserId", "userAgent", 
          "ipAddress", completed, "listenDuration", "listenedAt"
        )
        VALUES (
          'al_' || substr(md5(random()::text), 1, 23),
          ${data.processedLinkId}, ${data.userId || null}, ${data.slackUserId || null}, 
          ${data.userAgent || null}, ${data.ipAddress || null}, ${data.completed || false}, 
          ${data.listenDuration || null}, NOW()
        )
        RETURNING *
      `

      if (result.length === 0) return null
      
      const listen = result[0]
      return {
        id: listen.id,
        processedLinkId: listen.processedLinkId,
        userId: listen.userId,
        slackUserId: listen.slackUserId,
        userAgent: listen.userAgent,
        ipAddress: listen.ipAddress,
        listenedAt: new Date(listen.listenedAt),
        completed: listen.completed,
        listenDuration: listen.listenDuration
      }
    })
  }

  /**
   * Update audio listen record
   */
  static async update(id: string, data: Partial<AudioListen>): Promise<AudioListen | null> {
    return withTimeout(async () => {
      const updateFields = []
      const values = []
      
      if (data.completed !== undefined) {
        updateFields.push('completed = $' + (values.length + 1))
        values.push(data.completed)
      }
      if (data.listenDuration !== undefined) {
        updateFields.push('"listenDuration" = $' + (values.length + 1))
        values.push(data.listenDuration)
      }
      
      if (updateFields.length === 0) return null
      
      const query = `
        UPDATE audio_listens 
        SET ${updateFields.join(', ')} 
        WHERE id = $${values.length + 1} 
        RETURNING *
      `
      
      values.push(id)
      
      const result = await sql.unsafe(query, values)
      const listen = result[0]
      
      if (!listen) return null
      
      return {
        id: listen.id,
        processedLinkId: listen.processedLinkId,
        userId: listen.userId,
        slackUserId: listen.slackUserId,
        userAgent: listen.userAgent,
        ipAddress: listen.ipAddress,
        listenedAt: new Date(listen.listenedAt),
        completed: listen.completed,
        listenDuration: listen.listenDuration
      }
    })
  }

  /**
   * Find audio listen records by processed link ID
   */
  static async findByProcessedLinkId(processedLinkId: string): Promise<AudioListen[]> {
    return withTimeout(async () => {
      const result = await sql`
        SELECT * FROM audio_listens 
        WHERE "processedLinkId" = ${processedLinkId}
        ORDER BY "listenedAt" DESC
      `
      
      return result.map(listen => ({
        id: listen.id,
        processedLinkId: listen.processedLinkId,
        userId: listen.userId,
        slackUserId: listen.slackUserId,
        userAgent: listen.userAgent,
        ipAddress: listen.ipAddress,
        listenedAt: new Date(listen.listenedAt),
        completed: listen.completed,
        listenDuration: listen.listenDuration
      }))
    })
  }

  /**
   * Find audio listen record by ID
   */
  static async findById(id: string): Promise<AudioListen | null> {
    return withTimeout(async () => {
      const result = await sql`
        SELECT * FROM audio_listens WHERE id = ${id}
      `
      
      if (result.length === 0) return null
      
      const listen = result[0]
      return {
        id: listen.id,
        processedLinkId: listen.processedLinkId,
        userId: listen.userId,
        slackUserId: listen.slackUserId,
        userAgent: listen.userAgent,
        ipAddress: listen.ipAddress,
        listenedAt: new Date(listen.listenedAt),
        completed: listen.completed,
        listenDuration: listen.listenDuration
      }
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
      const result = await sql`
        SELECT 
          COUNT(*) as total_listens,
          COUNT(CASE WHEN completed = true THEN 1 END) as completed_listens,
          AVG("listenDuration") as avg_duration
        FROM audio_listens 
        WHERE "processedLinkId" = ${processedLinkId}
      `
      
      const stats = result[0]
      return {
        totalListens: parseInt(stats.total_listens) || 0,
        completedListens: parseInt(stats.completed_listens) || 0,
        averageDuration: stats.avg_duration ? parseFloat(stats.avg_duration) : null
      }
    })
  }

  /**
   * Get recent listens for a team
   */
  static async getRecentByTeamId(teamId: string, limit: number = 10): Promise<AudioListen[]> {
    return withTimeout(async () => {
      const result = await sql`
        SELECT al.* 
        FROM audio_listens al
        JOIN processed_links pl ON al."processedLinkId" = pl.id
        WHERE pl."teamId" = ${teamId}
        ORDER BY al."listenedAt" DESC
        LIMIT ${limit}
      `
      
      return result.map(listen => ({
        id: listen.id,
        processedLinkId: listen.processedLinkId,
        userId: listen.userId,
        slackUserId: listen.slackUserId,
        userAgent: listen.userAgent,
        ipAddress: listen.ipAddress,
        listenedAt: new Date(listen.listenedAt),
        completed: listen.completed,
        listenDuration: listen.listenDuration
      }))
    })
  }
}