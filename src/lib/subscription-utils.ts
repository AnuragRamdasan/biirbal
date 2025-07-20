import { getDbClient } from './db'
import { PRICING_PLANS, getPlanById, checkUsageLimits } from './stripe'

export interface UsageStats {
  currentLinks: number
  currentUsers: number
  plan: typeof PRICING_PLANS.FREE
  canProcessMore: boolean
  linkLimitExceeded: boolean
  userLimitExceeded: boolean
  linkWarning: boolean
  userWarning: boolean
  linkUsagePercentage: number
  userUsagePercentage: number
}

export async function getTeamUsageStats(teamId: string): Promise<UsageStats> {
  const db = await getDbClient()
  
  // Get team subscription - teamId is actually the Slack team ID
  const team = await db.team.findUnique({
    where: { slackTeamId: teamId },
    include: { 
      subscription: true,
      users: { where: { isActive: true } },
      processedLinks: {
        where: {
          createdAt: {
            gte: getFirstDayOfCurrentMonth()
          }
        }
      }
    }
  })

  if (!team) {
    throw new Error('Team not found')
  }

  const subscription = team.subscription
  if (!subscription) {
    throw new Error('Team subscription not found')
  }

  // Get plan details
  const plan = getPlanById(subscription.planId) || PRICING_PLANS.FREE
  
  // Calculate current usage
  const currentLinks = team.processedLinks.length
  const currentUsers = team.users.length

  // Check limits
  const limits = checkUsageLimits(plan, currentLinks, currentUsers)

  // Calculate usage percentages
  const linkUsagePercentage = plan.monthlyLinkLimit === -1 ? 0 : 
    Math.round((currentLinks / plan.monthlyLinkLimit) * 100)
  const userUsagePercentage = plan.userLimit === -1 ? 0 : 
    Math.round((currentUsers / plan.userLimit) * 100)

  return {
    currentLinks,
    currentUsers,
    plan,
    canProcessMore: limits.canProcessMore,
    linkLimitExceeded: limits.linkLimitExceeded,
    userLimitExceeded: limits.userLimitExceeded,
    linkWarning: limits.linkWarning,
    userWarning: limits.userWarning,
    linkUsagePercentage,
    userUsagePercentage
  }
}

export async function canProcessNewLink(teamId: string): Promise<{ allowed: boolean, reason?: string }> {
  try {
    const stats = await getTeamUsageStats(teamId)
    
    if (stats.linkLimitExceeded) {
      return {
        allowed: false,
        reason: `Monthly link limit of ${stats.plan.monthlyLinkLimit} reached. Upgrade your plan to process more links.`
      }
    }

    if (stats.userLimitExceeded) {
      return {
        allowed: false,
        reason: `User limit of ${stats.plan.userLimit} reached. Upgrade your plan to add more users.`
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Error checking usage limits:', error)
    return { allowed: false, reason: 'Unable to verify usage limits' }
  }
}

export async function updateSubscriptionFromStripe(
  teamId: string,
  stripeSubscriptionId: string,
  planId: string,
  status: string
) {
  const db = await getDbClient()
  const plan = getPlanById(planId)
  
  if (!plan) {
    throw new Error(`Invalid plan ID: ${planId}`)
  }

  await db.subscription.upsert({
    where: { teamId },
    update: {
      stripeSubscriptionId,
      planId,
      status: mapStripeStatusToSubscriptionStatus(status),
      monthlyLinkLimit: plan.monthlyLinkLimit,
      userLimit: plan.userLimit,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    },
    create: {
      teamId,
      stripeSubscriptionId,
      planId,
      status: mapStripeStatusToSubscriptionStatus(status),
      monthlyLinkLimit: plan.monthlyLinkLimit,
      userLimit: plan.userLimit,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  })
}

function getFirstDayOfCurrentMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function mapStripeStatusToSubscriptionStatus(stripeStatus: string) {
  switch (stripeStatus) {
    case 'active':
      return 'ACTIVE'
    case 'past_due':
      return 'PAST_DUE'
    case 'canceled':
    case 'cancelled':
      return 'CANCELED'
    case 'incomplete':
      return 'INCOMPLETE'
    case 'incomplete_expired':
      return 'INCOMPLETE_EXPIRED'
    case 'unpaid':
      return 'UNPAID'
    default:
      return 'TRIAL'
  }
}

export function getUpgradeMessage(stats: UsageStats): string | null {
  if (stats.linkLimitExceeded) {
    if (stats.plan.id === 'free') {
      return 'You\'ve reached your free plan limit of 30 links. Upgrade to Pro for 100 links/month or Enterprise for unlimited links.'
    }
    if (stats.plan.id === 'pro') {
      return 'You\'ve reached your Pro plan limit of 100 links. Upgrade to Enterprise for unlimited links.'
    }
  }

  if (stats.userLimitExceeded) {
    if (stats.plan.id === 'free') {
      return 'You\'ve reached your free plan limit of 2 users. Upgrade to Pro for 5 users or Enterprise for unlimited users.'
    }
    if (stats.plan.id === 'pro') {
      return 'You\'ve reached your Pro plan limit of 5 users. Upgrade to Enterprise for unlimited users.'
    }
  }

  if (stats.linkWarning && stats.plan.id === 'free') {
    return `You've used ${stats.linkUsagePercentage}% of your free plan links. Consider upgrading to Pro for more capacity.`
  }

  if (stats.userWarning && stats.plan.id === 'free') {
    return `You're approaching your user limit (${stats.currentUsers}/${stats.plan.userLimit}). Consider upgrading for more users.`
  }

  return null
}