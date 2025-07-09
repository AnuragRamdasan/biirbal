import { prisma } from '../prisma'
import { withTimeout } from '../prisma'
import type { Team, Subscription, TeamWithSubscription } from './types'

export class TeamModel {
  /**
   * Find team by Slack team ID with optional subscription
   */
  static async findBySlackId(slackTeamId: string): Promise<TeamWithSubscription | null> {
    console.log('🔍 Looking for team with Slack ID:', slackTeamId)
    
    return withTimeout(async () => {
      const team = await prisma.team.findUnique({
        where: { slackTeamId },
        include: { subscription: true }
      })
      
      console.log('🔍 Found team:', !!team)
      return team
    })
  }

  /**
   * Find team by internal ID with optional subscription
   */
  static async findById(id: string): Promise<TeamWithSubscription | null> {
    console.log('🔍 Looking for team with ID:', id)
    
    return withTimeout(async () => {
      const team = await prisma.team.findUnique({
        where: { id },
        include: { subscription: true }
      })
      
      console.log('🔍 Found team:', !!team)
      return team
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
      return await prisma.team.create({
        data: {
          slackTeamId: data.slackTeamId,
          teamName: data.teamName,
          accessToken: data.accessToken,
          botUserId: data.botUserId
        }
      })
    })
  }

  /**
   * Update team data
   */
  static async update(id: string, data: Partial<Team>): Promise<Team | null> {
    return withTimeout(async () => {
      try {
        return await prisma.team.update({
          where: { id },
          data: {
            teamName: data.teamName,
            accessToken: data.accessToken,
            botUserId: data.botUserId,
            isActive: data.isActive
          }
        })
      } catch (error) {
        console.error('Failed to update team:', error)
        return null
      }
    })
  }
}