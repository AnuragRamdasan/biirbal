import { neon } from '@neondatabase/serverless'

// Initialize Neon serverless client
const sql = neon(process.env.DATABASE_URL!)

// Database interface for type safety
export interface Team {
  id: string
  slackTeamId: string
  teamName?: string
  accessToken: string
  botUserId?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  slackUserId: string
  teamId: string
  name?: string
  displayName?: string
  realName?: string
  email?: string
  profileImage24?: string
  profileImage32?: string
  profileImage48?: string
  title?: string
  userAccessToken?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Channel {
  id: string
  slackChannelId: string
  channelName?: string
  teamId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProcessedLink {
  id: string
  url: string
  messageTs: string
  channelId: string
  teamId: string
  title?: string
  extractedText?: string
  audioFileUrl?: string
  audioFileKey?: string
  ttsScript?: string
  processingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

export interface Subscription {
  id: string
  teamId: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'UNPAID'
  currentPeriodEnd?: Date
  linksProcessed: number
  monthlyLimit: number
  createdAt: Date
  updatedAt: Date
}

export interface AudioListen {
  id: string
  processedLinkId: string
  userId?: string
  slackUserId?: string
  userAgent?: string
  ipAddress?: string
  listenedAt: Date
  completed: boolean
  listenDuration?: number
}

// Database operations using Neon serverless
export const db = {
  // Team operations
  async findTeamBySlackId(slackTeamId: string): Promise<(Team & { subscription?: Subscription }) | null> {
    const teams = await sql`
      SELECT t.*, s.* 
      FROM teams t 
      LEFT JOIN subscriptions s ON t.id = s."teamId"
      WHERE t."slackTeamId" = ${slackTeamId}
    `
    
    if (teams.length === 0) return null
    
    const team = teams[0]
    return {
      id: team.id,
      slackTeamId: team.slackTeamId,
      teamName: team.teamName,
      accessToken: team.accessToken,
      botUserId: team.botUserId,
      isActive: team.isActive,
      createdAt: new Date(team.createdAt),
      updatedAt: new Date(team.updatedAt),
      subscription: team.teamId ? {
        id: team.teamId,
        teamId: team.teamId,
        stripeCustomerId: team.stripeCustomerId,
        stripeSubscriptionId: team.stripeSubscriptionId,
        status: team.status,
        currentPeriodEnd: team.currentPeriodEnd ? new Date(team.currentPeriodEnd) : undefined,
        linksProcessed: team.linksProcessed,
        monthlyLimit: team.monthlyLimit,
        createdAt: new Date(team.createdAt),
        updatedAt: new Date(team.updatedAt)
      } : undefined
    }
  },

  async findTeamById(id: string): Promise<(Team & { subscription?: Subscription }) | null> {
    const teams = await sql`
      SELECT t.*, s.* 
      FROM teams t 
      LEFT JOIN subscriptions s ON t.id = s."teamId"
      WHERE t.id = ${id}
    `
    
    if (teams.length === 0) return null
    
    const team = teams[0]
    return {
      id: team.id,
      slackTeamId: team.slackTeamId,
      teamName: team.teamName,
      accessToken: team.accessToken,
      botUserId: team.botUserId,
      isActive: team.isActive,
      createdAt: new Date(team.createdAt),
      updatedAt: new Date(team.updatedAt),
      subscription: team.teamId ? {
        id: team.teamId,
        teamId: team.teamId,
        stripeCustomerId: team.stripeCustomerId,
        stripeSubscriptionId: team.stripeSubscriptionId,
        status: team.status,
        currentPeriodEnd: team.currentPeriodEnd ? new Date(team.currentPeriodEnd) : undefined,
        linksProcessed: team.linksProcessed,
        monthlyLimit: team.monthlyLimit,
        createdAt: new Date(team.createdAt),
        updatedAt: new Date(team.updatedAt)
      } : undefined
    }
  },

  // Channel operations
  async upsertChannel(slackChannelId: string, teamId: string, channelName?: string): Promise<Channel> {
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
  },

  // ProcessedLink operations
  async upsertProcessedLink(data: {
    url: string
    messageTs: string
    channelId: string
    teamId: string
    title?: string
    extractedText?: string
    processingStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  }): Promise<ProcessedLink> {
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
  },

  async updateProcessedLink(id: string, data: Partial<ProcessedLink>): Promise<ProcessedLink> {
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
  },

  // Subscription operations
  async updateSubscription(teamId: string, data: Partial<Subscription>): Promise<Subscription> {
    const updateFields = []
    const values = []
    
    if (data.linksProcessed !== undefined) {
      updateFields.push('"linksProcessed" = $' + (values.length + 1))
      values.push(data.linksProcessed)
    }
    if (data.status !== undefined) {
      updateFields.push('status = $' + (values.length + 1))
      values.push(data.status)
    }
    
    updateFields.push('"updatedAt" = NOW()')
    
    const query = `
      UPDATE subscriptions 
      SET ${updateFields.join(', ')} 
      WHERE "teamId" = $${values.length + 1} 
      RETURNING *
    `
    
    values.push(teamId)
    
    const result = await sql.unsafe(query, values)
    const subscription = result[0]
    
    return {
      id: subscription.id,
      teamId: subscription.teamId,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : undefined,
      linksProcessed: subscription.linksProcessed,
      monthlyLimit: subscription.monthlyLimit,
      createdAt: new Date(subscription.createdAt),
      updatedAt: new Date(subscription.updatedAt)
    }
  },

  // AudioListen operations
  async createAudioListen(data: {
    processedLinkId: string
    userId?: string
    slackUserId?: string
    userAgent?: string
    ipAddress?: string
    completed?: boolean
    listenDuration?: number
  }): Promise<AudioListen> {
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
  },

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await sql`SELECT 1`
      return true
    } catch (error) {
      console.error('Neon database health check failed:', error)
      return false
    }
  }
}

// Export the sql client for direct queries if needed
export { sql }