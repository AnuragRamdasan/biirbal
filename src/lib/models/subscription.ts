import { getPrismaClient, dbWithTimeout } from './connection'
import type { Subscription } from './types'

export class SubscriptionModel {
  /**
   * Update subscription by team ID
   */
  static async update(teamId: string, data: Partial<Subscription>): Promise<Subscription | null> {
    return dbWithTimeout(async () => {
      try {
        return await getPrismaClient().subscription.update({
          where: { teamId },
          data: {
            stripeCustomerId: data.stripeCustomerId,
            stripeSubscriptionId: data.stripeSubscriptionId,
            status: data.status,
            currentPeriodEnd: data.currentPeriodEnd,
            linksProcessed: data.linksProcessed,
            monthlyLimit: data.monthlyLimit
          }
        })
      } catch (error) {
        console.error('Failed to update subscription:', error)
        return null
      }
    })
  }

  /**
   * Find subscription by team ID
   */
  static async findByTeamId(teamId: string): Promise<Subscription | null> {
    return dbWithTimeout(async () => {
      return await getPrismaClient().subscription.findUnique({
        where: { teamId }
      })
    })
  }

  /**
   * Create a new subscription
   */
  static async create(data: {
    teamId: string
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    status?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'UNPAID'
    currentPeriodEnd?: Date
    linksProcessed?: number
    monthlyLimit?: number
  }): Promise<Subscription> {
    return dbWithTimeout(async () => {
      return await getPrismaClient().subscription.create({
        data: {
          teamId: data.teamId,
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: data.stripeSubscriptionId,
          status: data.status || 'TRIAL',
          currentPeriodEnd: data.currentPeriodEnd,
          linksProcessed: data.linksProcessed || 0,
          monthlyLimit: data.monthlyLimit || 50
        }
      })
    })
  }

  /**
   * Increment links processed count
   */
  static async incrementLinksProcessed(teamId: string): Promise<Subscription | null> {
    return dbWithTimeout(async () => {
      try {
        return await getPrismaClient().subscription.update({
          where: { teamId },
          data: {
            linksProcessed: {
              increment: 1
            }
          }
        })
      } catch (error) {
        console.error('Failed to increment links processed:', error)
        return null
      }
    })
  }

  /**
   * Reset links processed count (for new month)
   */
  static async resetLinksProcessed(teamId: string): Promise<Subscription | null> {
    return dbWithTimeout(async () => {
      try {
        return await getPrismaClient().subscription.update({
          where: { teamId },
          data: {
            linksProcessed: 0
          }
        })
      } catch (error) {
        console.error('Failed to reset links processed:', error)
        return null
      }
    })
  }
}