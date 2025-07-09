import { sql, withTimeout } from './db'
import type { Team, Subscription, TeamWithSubscription } from './types'

export class TeamModel {
  /**
   * Find team by Slack team ID with optional subscription
   */
  static async findBySlackId(slackTeamId: string): Promise<TeamWithSubscription | null> {
    console.log('🔍 Looking for team with Slack ID:', slackTeamId)
    
    return withTimeout(async () => {
      const teams = await sql`
        SELECT 
          t.id, t."slackTeamId", t."teamName", t."accessToken", t."botUserId", 
          t."isActive", t."createdAt", t."updatedAt",
          s.id as sub_id, s."teamId" as sub_teamId, s."stripeCustomerId", 
          s."stripeSubscriptionId", s.status as sub_status, s."currentPeriodEnd", 
          s."linksProcessed", s."monthlyLimit", 
          s."createdAt" as sub_createdAt, s."updatedAt" as sub_updatedAt
        FROM teams t 
        LEFT JOIN subscriptions s ON t.id = s."teamId"
        WHERE t."slackTeamId" = ${slackTeamId}
      `
      
      console.log('🔍 Found teams:', teams.length)
      
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
        subscription: team.sub_id ? {
          id: team.sub_id,
          teamId: team.sub_teamId,
          stripeCustomerId: team.stripeCustomerId,
          stripeSubscriptionId: team.stripeSubscriptionId,
          status: team.sub_status,
          currentPeriodEnd: team.currentPeriodEnd ? new Date(team.currentPeriodEnd) : undefined,
          linksProcessed: team.linksProcessed,
          monthlyLimit: team.monthlyLimit,
          createdAt: new Date(team.sub_createdAt),
          updatedAt: new Date(team.sub_updatedAt)
        } : undefined
      }
    })
  }

  /**
   * Find team by internal ID with optional subscription
   */
  static async findById(id: string): Promise<TeamWithSubscription | null> {
    console.log('🔍 Looking for team with ID:', id)
    
    return withTimeout(async () => {
      const teams = await sql`
        SELECT 
          t.id, t."slackTeamId", t."teamName", t."accessToken", t."botUserId", 
          t."isActive", t."createdAt", t."updatedAt",
          s.id as sub_id, s."teamId" as sub_teamId, s."stripeCustomerId", 
          s."stripeSubscriptionId", s.status as sub_status, s."currentPeriodEnd", 
          s."linksProcessed", s."monthlyLimit", 
          s."createdAt" as sub_createdAt, s."updatedAt" as sub_updatedAt
        FROM teams t 
        LEFT JOIN subscriptions s ON t.id = s."teamId"
        WHERE t.id = ${id}
      `
      
      console.log('🔍 Found teams:', teams.length)
      
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
        subscription: team.sub_id ? {
          id: team.sub_id,
          teamId: team.sub_teamId,
          stripeCustomerId: team.stripeCustomerId,
          stripeSubscriptionId: team.stripeSubscriptionId,
          status: team.sub_status,
          currentPeriodEnd: team.currentPeriodEnd ? new Date(team.currentPeriodEnd) : undefined,
          linksProcessed: team.linksProcessed,
          monthlyLimit: team.monthlyLimit,
          createdAt: new Date(team.sub_createdAt),
          updatedAt: new Date(team.sub_updatedAt)
        } : undefined
      }
    })
  }

  /**
   * Create a new team
   */
  static async create(data: {
    slackTeamId: string
    teamName?: string
    accessToken: string
    botUserId?: string
  }): Promise<Team> {
    return withTimeout(async () => {
      const result = await sql`
        INSERT INTO teams (
          id, "slackTeamId", "teamName", "accessToken", "botUserId", 
          "isActive", "createdAt", "updatedAt"
        )
        VALUES (
          't_' || substr(md5(random()::text), 1, 23),
          ${data.slackTeamId}, ${data.teamName || null}, ${data.accessToken}, 
          ${data.botUserId || null}, true, NOW(), NOW()
        )
        RETURNING *
      `
      
      const team = result[0]
      return {
        id: team.id,
        slackTeamId: team.slackTeamId,
        teamName: team.teamName,
        accessToken: team.accessToken,
        botUserId: team.botUserId,
        isActive: team.isActive,
        createdAt: new Date(team.createdAt),
        updatedAt: new Date(team.updatedAt)
      }
    })
  }

  /**
   * Update team data
   */
  static async update(id: string, data: Partial<Team>): Promise<Team | null> {
    return withTimeout(async () => {
      const updateFields = []
      const values = []
      
      if (data.teamName !== undefined) {
        updateFields.push('"teamName" = $' + (values.length + 1))
        values.push(data.teamName)
      }
      if (data.accessToken !== undefined) {
        updateFields.push('"accessToken" = $' + (values.length + 1))
        values.push(data.accessToken)
      }
      if (data.botUserId !== undefined) {
        updateFields.push('"botUserId" = $' + (values.length + 1))
        values.push(data.botUserId)
      }
      if (data.isActive !== undefined) {
        updateFields.push('"isActive" = $' + (values.length + 1))
        values.push(data.isActive)
      }
      
      updateFields.push('"updatedAt" = NOW()')
      
      const query = `
        UPDATE teams 
        SET ${updateFields.join(', ')} 
        WHERE id = $${values.length + 1} 
        RETURNING *
      `
      
      values.push(id)
      
      const result = await sql.unsafe(query, values)
      const team = result[0]
      
      if (!team) return null
      
      return {
        id: team.id,
        slackTeamId: team.slackTeamId,
        teamName: team.teamName,
        accessToken: team.accessToken,
        botUserId: team.botUserId,
        isActive: team.isActive,
        createdAt: new Date(team.createdAt),
        updatedAt: new Date(team.updatedAt)
      }
    })
  }
}