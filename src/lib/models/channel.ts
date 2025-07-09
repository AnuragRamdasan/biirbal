import { sql, withTimeout } from './db'
import type { Channel } from './types'

export class ChannelModel {
  /**
   * Upsert channel (create if doesn't exist, update if exists)
   */
  static async upsert(slackChannelId: string, teamId: string, channelName?: string): Promise<Channel | null> {
    return withTimeout(async () => {
      // First try to find existing channel
      const existing = await sql`
        SELECT * FROM channels WHERE "slackChannelId" = ${slackChannelId}
      `
      
      if (existing.length > 0) {
        // Update existing channel
        const result = await sql`
          UPDATE channels 
          SET "updatedAt" = NOW(), "isActive" = true, "channelName" = COALESCE(${channelName}, "channelName")
          WHERE "slackChannelId" = ${slackChannelId}
          RETURNING *
        `

        if (result.length === 0) return null
        
        const channel = result[0]
        return {
          id: channel.id,
          slackChannelId: channel.slackChannelId,
          channelName: channel.channelName,
          teamId: channel.teamId,
          isActive: channel.isActive,
          createdAt: new Date(channel.createdAt),
          updatedAt: new Date(channel.updatedAt)
        }
      } else {
        // Create new channel with generated ID
        const result = await sql`
          INSERT INTO channels (id, "slackChannelId", "teamId", "channelName", "isActive", "createdAt", "updatedAt")
          VALUES (
            'c' || substr(md5(random()::text), 1, 24), 
            ${slackChannelId}, 
            ${teamId}, 
            ${channelName || null}, 
            true, 
            NOW(), 
            NOW()
          )
          RETURNING *
        `
        
        if (result.length === 0) return null
        
        const channel = result[0]
        return {
          id: channel.id,
          slackChannelId: channel.slackChannelId,
          channelName: channel.channelName,
          teamId: channel.teamId,
          isActive: channel.isActive,
          createdAt: new Date(channel.createdAt),
          updatedAt: new Date(channel.updatedAt)
        }
      }
    })
  }

  /**
   * Find channel by Slack channel ID
   */
  static async findBySlackId(slackChannelId: string): Promise<Channel | null> {
    return withTimeout(async () => {
      const result = await sql`
        SELECT * FROM channels WHERE "slackChannelId" = ${slackChannelId}
      `
      
      if (result.length === 0) return null
      
      const channel = result[0]
      return {
        id: channel.id,
        slackChannelId: channel.slackChannelId,
        channelName: channel.channelName,
        teamId: channel.teamId,
        isActive: channel.isActive,
        createdAt: new Date(channel.createdAt),
        updatedAt: new Date(channel.updatedAt)
      }
    })
  }

  /**
   * Find channel by internal ID
   */
  static async findById(id: string): Promise<Channel | null> {
    return withTimeout(async () => {
      const result = await sql`
        SELECT * FROM channels WHERE id = ${id}
      `
      
      if (result.length === 0) return null
      
      const channel = result[0]
      return {
        id: channel.id,
        slackChannelId: channel.slackChannelId,
        channelName: channel.channelName,
        teamId: channel.teamId,
        isActive: channel.isActive,
        createdAt: new Date(channel.createdAt),
        updatedAt: new Date(channel.updatedAt)
      }
    })
  }

  /**
   * Update channel data
   */
  static async update(id: string, data: Partial<Channel>): Promise<Channel | null> {
    return withTimeout(async () => {
      const updateFields = []
      const values = []
      
      if (data.channelName !== undefined) {
        updateFields.push('"channelName" = $' + (values.length + 1))
        values.push(data.channelName)
      }
      if (data.isActive !== undefined) {
        updateFields.push('"isActive" = $' + (values.length + 1))
        values.push(data.isActive)
      }
      
      updateFields.push('"updatedAt" = NOW()')
      
      const query = `
        UPDATE channels 
        SET ${updateFields.join(', ')} 
        WHERE id = $${values.length + 1} 
        RETURNING *
      `
      
      values.push(id)
      
      const result = await sql.unsafe(query, values)
      const channel = result[0]
      
      if (!channel) return null
      
      return {
        id: channel.id,
        slackChannelId: channel.slackChannelId,
        channelName: channel.channelName,
        teamId: channel.teamId,
        isActive: channel.isActive,
        createdAt: new Date(channel.createdAt),
        updatedAt: new Date(channel.updatedAt)
      }
    })
  }
}