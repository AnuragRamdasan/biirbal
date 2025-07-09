import { sql, withTimeout } from './db'
import type { Subscription } from './types'

export class SubscriptionModel {
  /**
   * Update subscription by team ID
   */
  static async update(teamId: string, data: Partial<Subscription>): Promise<Subscription | null> {
    return withTimeout(async () => {
      const updateFields = []
      const values = []
      
      if (data.stripeCustomerId !== undefined) {
        updateFields.push('"stripeCustomerId" = $' + (values.length + 1))
        values.push(data.stripeCustomerId)
      }
      if (data.stripeSubscriptionId !== undefined) {
        updateFields.push('"stripeSubscriptionId" = $' + (values.length + 1))
        values.push(data.stripeSubscriptionId)
      }
      if (data.status !== undefined) {
        updateFields.push('status = $' + (values.length + 1))
        values.push(data.status)
      }
      if (data.currentPeriodEnd !== undefined) {
        updateFields.push('"currentPeriodEnd" = $' + (values.length + 1))
        values.push(data.currentPeriodEnd)
      }
      if (data.linksProcessed !== undefined) {
        updateFields.push('"linksProcessed" = $' + (values.length + 1))
        values.push(data.linksProcessed)
      }
      if (data.monthlyLimit !== undefined) {
        updateFields.push('"monthlyLimit" = $' + (values.length + 1))
        values.push(data.monthlyLimit)
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
      
      if (!subscription) return null
      
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
    })
  }

  /**
   * Find subscription by team ID
   */
  static async findByTeamId(teamId: string): Promise<Subscription | null> {
    return withTimeout(async () => {
      const result = await sql`
        SELECT * FROM subscriptions WHERE "teamId" = ${teamId}
      `
      
      if (result.length === 0) return null
      
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
    return withTimeout(async () => {
      const result = await sql`
        INSERT INTO subscriptions (
          id, "teamId", "stripeCustomerId", "stripeSubscriptionId", 
          status, "currentPeriodEnd", "linksProcessed", "monthlyLimit", 
          "createdAt", "updatedAt"
        )
        VALUES (
          'sub_' || substr(md5(random()::text), 1, 22),
          ${data.teamId}, ${data.stripeCustomerId || null}, ${data.stripeSubscriptionId || null},
          ${data.status || 'TRIAL'}, ${data.currentPeriodEnd || null}, 
          ${data.linksProcessed || 0}, ${data.monthlyLimit || 50},
          NOW(), NOW()
        )
        RETURNING *
      `
      
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
    })
  }

  /**
   * Increment links processed count
   */
  static async incrementLinksProcessed(teamId: string): Promise<Subscription | null> {
    return withTimeout(async () => {
      const result = await sql`
        UPDATE subscriptions 
        SET 
          "linksProcessed" = "linksProcessed" + 1,
          "updatedAt" = NOW()
        WHERE "teamId" = ${teamId} 
        RETURNING *
      `
      
      if (result.length === 0) return null
      
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
    })
  }

  /**
   * Reset links processed count (for new month)
   */
  static async resetLinksProcessed(teamId: string): Promise<Subscription | null> {
    return withTimeout(async () => {
      const result = await sql`
        UPDATE subscriptions 
        SET 
          "linksProcessed" = 0,
          "updatedAt" = NOW()
        WHERE "teamId" = ${teamId} 
        RETURNING *
      `
      
      if (result.length === 0) return null
      
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
    })
  }
}