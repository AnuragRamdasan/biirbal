import { getDbClient } from './db'
import { PRICING_PLANS, getPlanById, checkUsageLimits } from './stripe'
import { isExceptionTeam } from './exception-teams'
import { trackSubscriptionStarted, trackSubscriptionCancelled } from './analytics'

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
  isExceptionTeam: boolean
}

export async function getTeamUsageStats(teamId: string): Promise<UsageStats> {
  const db = await getDbClient()
  
  // Check if this is an exception team first
  const isException = isExceptionTeam(teamId)
  
  // Get team subscription - teamId is actually the Slack team ID
  const team = await db.team.findUnique({
    where: { slackTeamId: teamId },
    include: { 
      subscription: true,
      users: { 
        where: { isActive: true },
        orderBy: { createdAt: 'asc' }
      },
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
  const currentUsers = team.users.filter(user => user.isActive).length

  // For exception teams, bypass all limits
  if (isException) {
    return {
      currentLinks,
      currentUsers,
      plan,
      canProcessMore: true,
      linkLimitExceeded: false,
      userLimitExceeded: false,
      linkWarning: false,
      userWarning: false,
      linkUsagePercentage: 0,
      userUsagePercentage: 0,
      isExceptionTeam: true
    }
  }

  // Check limits for regular teams
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
    userUsagePercentage,
    isExceptionTeam: false
  }
}

export async function canUserConsume(teamId: string, userId: string): Promise<boolean> {
  try {
    // Exception teams are always allowed
    if (isExceptionTeam(teamId)) {
      return true
    }
    
    const db = await getDbClient()
    
    // Get the specific user first to check if they're active
    const user = await db.user.findFirst({
      where: { 
        slackUserId: userId,
        team: { slackTeamId: teamId }
      }
    })

    // If user doesn't exist or is disabled, they can't consume
    if (!user || !user.isActive) {
      return false
    }
    
    // Get team and active user info
    const team = await db.team.findUnique({
      where: { slackTeamId: teamId },
      include: { 
        subscription: true,
        users: { 
          where: { isActive: true },
          orderBy: { createdAt: 'asc' } // First users get priority
        }
      }
    })

    if (!team || !team.subscription) {
      return false
    }

    const plan = getPlanById(team.subscription.planId) || PRICING_PLANS.FREE
    
    // Free plan: check both active status and basic access
    if (plan.id === 'free') {
      return user.isActive
    }
    
    // Unlimited users plan: just check if user is active
    if (plan.userLimit === -1) {
      return user.isActive
    }
    
    // Check if user is within the seat limit (first N active users get access)
    const userIndex = team.users.findIndex(u => u.slackUserId === userId)
    const result = userIndex !== -1 && userIndex < plan.userLimit
    
    console.log(`[DEBUG canUserConsume] teamId: ${teamId}, userId: ${userId}`)
    console.log(`[DEBUG canUserConsume] plan: ${plan.id}, userLimit: ${plan.userLimit}`)
    console.log(`[DEBUG canUserConsume] active users: ${team.users.length}, userIds: [${team.users.map(u => u.slackUserId).join(', ')}]`)
    console.log(`[DEBUG canUserConsume] userIndex: ${userIndex}, result: ${result}`)
    
    return result
    
  } catch (error) {
    console.error('Error checking user consumption access:', error)
    return false
  }
}

export async function canAddNewUser(teamId: string): Promise<{ allowed: boolean, reason?: string }> {
  try {
    // Exception teams are always allowed
    if (isExceptionTeam(teamId)) {
      return { allowed: true }
    }
    
    const stats = await getTeamUsageStats(teamId)
    
    if (stats.userLimitExceeded) {
      return {
        allowed: false,
        reason: `User limit of ${stats.plan.userLimit} reached. Upgrade your plan to add more users.`
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Error checking if can add user:', error)
    return { allowed: false, reason: 'Unable to verify user limits' }
  }
}

export async function canProcessNewLink(teamId: string, userId?: string): Promise<{ allowed: boolean, reason?: string }> {
  try {
    // Exception teams are always allowed
    if (isExceptionTeam(teamId)) {
      return { allowed: true }
    }
    
    const stats = await getTeamUsageStats(teamId)
    
    // For paid plans, only check seat limits
    const isPaidPlan = stats.plan.id !== 'free'
    
    if (isPaidPlan) {
      // For paid plans, check if user seat limit is exceeded
      if (stats.userLimitExceeded) {
        return {
          allowed: false,
          reason: `User limit of ${stats.plan.userLimit} reached. Upgrade your plan to add more users.`
        }
      }
      
      // If a specific user is provided, check if they have access
      if (userId) {
        const hasAccess = await canUserConsume(teamId, userId)
        if (!hasAccess) {
          return {
            allowed: false,
            reason: 'User access disabled due to seat limit exceeded. Contact admin to upgrade plan.'
          }
        }
      }
    } else {
      // For free plan, check both link and user limits
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

  // Get current subscription to track changes
  const currentSubscription = await db.subscription.findUnique({
    where: { teamId }
  })

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

  // Track subscription events
  const mappedStatus = mapStripeStatusToSubscriptionStatus(status)
  
  if (mappedStatus === 'ACTIVE') {
    // Track subscription started or upgraded
    trackSubscriptionStarted({
      team_id: teamId,
      plan_type: planId as 'pro' | 'enterprise',
      previous_plan: currentSubscription?.planId as 'free' | 'pro' | undefined,
      currency: 'USD',
      value: plan.price || 0
    })
  } else if (mappedStatus === 'CANCELED') {
    // Track subscription cancelled
    trackSubscriptionCancelled({
      team_id: teamId,
      plan_type: planId as 'pro' | 'enterprise',
      previous_plan: currentSubscription?.planId as 'free' | 'pro' | undefined,
      currency: 'USD',
      value: plan.price || 0
    })
  }
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
  // For paid plans, prioritize seat-based warnings
  const isPaidPlan = stats.plan.id !== 'free'
  
  if (isPaidPlan) {
    if (stats.userLimitExceeded) {
      if (stats.plan.id === 'starter') {
        return 'Starter plan is for individual use only. Upgrade to Pro for up to 10 team members or Business for unlimited users.'
      }
      if (stats.plan.id === 'pro') {
        return 'You\'ve reached your Pro plan limit of 10 users. Upgrade to Business for unlimited users.'
      }
    }

    if (stats.userWarning) {
      if (stats.plan.id === 'pro') {
        return `You're approaching your user limit (${stats.currentUsers}/${stats.plan.userLimit}). Consider upgrading to Business for unlimited users.`
      }
    }
  } else {
    // Free plan - check both limits but prioritize links
    if (stats.linkLimitExceeded) {
      return 'You\'ve reached your free plan limit of 20 links. Upgrade to Starter for unlimited links.'
    }

    if (stats.userLimitExceeded) {
      return 'You\'ve reached your free plan limit of 1 user. Upgrade to Starter for individual use or Pro for up to 10 team members.'
    }

    if (stats.linkWarning) {
      return `You've used ${stats.linkUsagePercentage}% of your free plan links. Consider upgrading to Starter for unlimited links.`
    }

    if (stats.userWarning) {
      return `You're approaching your user limit (${stats.currentUsers}/${stats.plan.userLimit}). Consider upgrading for more users.`
    }
  }

  return null
}