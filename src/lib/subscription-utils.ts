import { getDbClient } from './db'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
  : null

// Plan configurations
export const PLAN_CONFIGS = {
  free: {
    monthlyLinkLimit: 20,
    userLimit: 1,
    name: 'Free',
  },
  starter: {
    monthlyLinkLimit: 100,
    userLimit: 3,
    name: 'Starter',
  },
  pro: {
    monthlyLinkLimit: 500,
    userLimit: 10,
    name: 'Pro',
  },
  enterprise: {
    monthlyLinkLimit: -1, // unlimited
    userLimit: -1, // unlimited
    name: 'Enterprise',
  },
}

export type PlanId = keyof typeof PLAN_CONFIGS

interface UsageCheckResult {
  allowed: boolean
  reason?: string
  currentUsage?: number
  limit?: number
}

export async function canProcessNewLink(slackTeamId: string): Promise<UsageCheckResult> {
  try {
    const db = await getDbClient()
    
    const team = await db.team.findUnique({
      where: { slackTeamId },
      include: { subscription: true }
    })

    if (!team) {
      return { allowed: false, reason: 'Team not found' }
    }

    if (!team.subscription) {
      // No subscription - allow with free limits
      return { allowed: true }
    }

    const subscription = team.subscription
    
    // Check if subscription is active
    if (subscription.status === 'CANCELLED') {
      return { allowed: false, reason: 'Subscription cancelled' }
    }

    // Get monthly limit
    const monthlyLimit = subscription.monthlyLinkLimit
    
    // -1 means unlimited
    if (monthlyLimit === -1) {
      return { allowed: true }
    }

    // Check current month usage
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const currentUsage = await db.processedLink.count({
      where: {
        teamId: team.id,
        createdAt: { gte: startOfMonth },
        processingStatus: { in: ['COMPLETED', 'PROCESSING'] }
      }
    })

    if (currentUsage >= monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly limit of ${monthlyLimit} links exceeded`,
        currentUsage,
        limit: monthlyLimit,
      }
    }

    return { allowed: true, currentUsage, limit: monthlyLimit }
  } catch (error) {
    console.error('Error checking link processing limit:', error)
    // Fail open - allow processing if we can't check
    return { allowed: true }
  }
}

export async function canAddNewUser(slackTeamId: string): Promise<UsageCheckResult> {
  try {
    const db = await getDbClient()
    
    const team = await db.team.findUnique({
      where: { slackTeamId },
      include: { 
        subscription: true,
        memberships: { where: { isActive: true } }
      }
    })

    if (!team) {
      return { allowed: false, reason: 'Team not found' }
    }

    if (!team.subscription) {
      // No subscription - allow with free limits (1 user)
      const currentUsers = team.memberships.length
      if (currentUsers >= 1) {
        return { 
          allowed: false, 
          reason: 'Free plan allows only 1 user',
          currentUsage: currentUsers,
          limit: 1
        }
      }
      return { allowed: true, currentUsage: currentUsers, limit: 1 }
    }

    const subscription = team.subscription
    const userLimit = subscription.userLimit

    // -1 means unlimited
    if (userLimit === -1) {
      return { allowed: true }
    }

    const currentUsers = team.memberships.length

    if (currentUsers >= userLimit) {
      return {
        allowed: false,
        reason: `User limit of ${userLimit} exceeded`,
        currentUsage: currentUsers,
        limit: userLimit,
      }
    }

    return { allowed: true, currentUsage: currentUsers, limit: userLimit }
  } catch (error) {
    console.error('Error checking user limit:', error)
    // Fail open - allow adding user if we can't check
    return { allowed: true }
  }
}

export async function getTeamSubscriptionStatus(teamId: string) {
  try {
    const db = await getDbClient()
    
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: { subscription: true }
    })

    if (!team || !team.subscription) {
      return null
    }

    return team.subscription
  } catch (error) {
    console.error('Error getting team subscription:', error)
    return null
  }
}

export async function syncSubscriptionFromStripe(stripeSubscriptionId: string) {
  if (!stripe) {
    console.warn('Stripe not configured, skipping subscription sync')
    return
  }

  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
    
    const db = await getDbClient()
    
    // Find the team with this subscription
    const subscription = await db.subscription.findFirst({
      where: { stripeSubscriptionId }
    })

    if (!subscription) {
      console.error('No subscription found for Stripe subscription:', stripeSubscriptionId)
      return
    }

    // Get plan details from price
    const priceId = stripeSubscription.items.data[0]?.price.id
    let planId = 'starter'
    let monthlyLinkLimit = 100
    let userLimit = 3

    // Map price IDs to plans (configure these in your environment)
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
      planId = 'pro'
      monthlyLinkLimit = 500
      userLimit = 10
    } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
      planId = 'enterprise'
      monthlyLinkLimit = -1
      userLimit = -1
    }

    // Map Stripe status to our status
    let status: string
    switch (stripeSubscription.status) {
      case 'active':
        status = 'ACTIVE'
        break
      case 'past_due':
        status = 'PAST_DUE'
        break
      case 'canceled':
        status = 'CANCELLED'
        break
      case 'trialing':
        status = 'TRIAL'
        break
      default:
        status = 'ACTIVE'
    }

    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        status,
        planId,
        monthlyLinkLimit,
        userLimit,
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        updatedAt: new Date(),
      }
    })

    console.log(`✅ Synced subscription ${stripeSubscriptionId} - Status: ${status}, Plan: ${planId}`)
  } catch (error) {
    console.error('Error syncing subscription from Stripe:', error)
    throw error
  }
}

export async function createSubscriptionFromStripe(
  teamId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  planId: string,
  status: string
) {
  try {
    const db = await getDbClient()
    
    const planConfig = PLAN_CONFIGS[planId as PlanId] || PLAN_CONFIGS.starter
    
    await db.subscription.upsert({
      where: { teamId },
      update: {
        stripeCustomerId,
        stripeSubscriptionId,
        planId,
        status,
        monthlyLinkLimit: planConfig.monthlyLinkLimit,
        userLimit: planConfig.userLimit,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        updatedAt: new Date(),
      },
      create: {
        teamId,
        stripeCustomerId,
        stripeSubscriptionId,
        planId,
        status,
        monthlyLinkLimit: planConfig.monthlyLinkLimit,
        userLimit: planConfig.userLimit,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      }
    })

    console.log(`✅ Created/updated subscription for team ${teamId}`)
  } catch (error) {
    console.error('Error creating subscription from Stripe:', error)
    throw error
  }
}

export async function updateSubscriptionFromStripe(
  teamId: string,
  stripeSubscriptionId: string,
  planId: string,
  status: string,
  currentPeriodEnd?: Date
) {
  try {
    const db = await getDbClient()
    
    const planConfig = PLAN_CONFIGS[planId as PlanId] || PLAN_CONFIGS.starter
    
    await db.subscription.upsert({
      where: { teamId },
      update: {
        stripeSubscriptionId,
        planId,
        status,
        monthlyLinkLimit: planConfig.monthlyLinkLimit,
        userLimit: planConfig.userLimit,
        currentPeriodEnd: currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
      create: {
        teamId,
        stripeSubscriptionId,
        planId,
        status,
        monthlyLinkLimit: planConfig.monthlyLinkLimit,
        userLimit: planConfig.userLimit,
        currentPeriodEnd: currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    })

    console.log(`✅ Updated subscription for team ${teamId}`)
  } catch (error) {
    console.error('Error updating subscription from Stripe:', error)
    throw error
  }
}

export async function cancelSubscription(teamId: string) {
  try {
    const db = await getDbClient()
    
    await db.subscription.update({
      where: { teamId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      }
    })

    console.log(`✅ Cancelled subscription for team ${teamId}`)
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    throw error
  }
}

export async function getUsageStats(teamId: string) {
  try {
    const db = await getDbClient()
    
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: { 
        subscription: true,
        memberships: { where: { isActive: true } }
      }
    })

    if (!team) {
      return null
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const linksThisMonth = await db.processedLink.count({
      where: {
        teamId,
        createdAt: { gte: startOfMonth },
        processingStatus: 'COMPLETED'
      }
    })

    const monthlyLimit = team.subscription?.monthlyLinkLimit || 20
    const userLimit = team.subscription?.userLimit || 1
    const currentUsers = team.memberships.length

    return {
      linksThisMonth,
      monthlyLimit,
      linksRemaining: monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - linksThisMonth),
      currentUsers,
      userLimit,
      usersRemaining: userLimit === -1 ? -1 : Math.max(0, userLimit - currentUsers),
      subscription: team.subscription,
    }
  } catch (error) {
    console.error('Error getting usage stats:', error)
    return null
  }
}
