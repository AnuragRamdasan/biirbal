import { prisma } from './prisma'

export async function withQueryTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 20000,
  operationName: string = 'query'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout: ${operationName} exceeded ${timeoutMs}ms`))
      }, timeoutMs)
    })
  ])
}

export async function safeQuery<T>(
  query: () => Promise<T>,
  fallback?: T,
  operationName: string = 'database-query'
): Promise<T> {
  try {
    return await withQueryTimeout(query, 15000, operationName)
  } catch (error) {
    console.error(`Safe query failed for ${operationName}:`, error)
    
    if (fallback !== undefined) {
      return fallback
    }
    
    throw error
  }
}

export const queries = {
  async findTeamSafe(teamId: string) {
    return safeQuery(
      () => prisma.team.findUnique({
        where: { slackTeamId: teamId },
        include: { subscription: true }
      }),
      null,
      'find-team'
    )
  },

  async upsertChannelSafe(channelId: string, teamId: string) {
    return safeQuery(
      () => prisma.channel.upsert({
        where: { slackChannelId: channelId },
        update: { updatedAt: new Date() },
        create: {
          slackChannelId: channelId,
          teamId,
          isActive: true
        }
      }),
      undefined,
      'upsert-channel'
    )
  },

  async createListenSafe(data: any) {
    return safeQuery(
      () => prisma.audioListen.create({ data }),
      undefined,
      'create-listen'
    )
  },

  async updateSubscriptionSafe(teamId: string, data: any) {
    return safeQuery(
      () => prisma.subscription.update({
        where: { teamId },
        data
      }),
      undefined,
      'update-subscription'
    )
  }
}