import { getDbClient } from './db'
import type { SubscriptionStatus } from '@prisma/client'
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
    if (isExceptionTeam(teamId)) {
      return true
    }
    
    const db = await getDbClient()
    const user = await db.user.findFirst({
      where: { 
        slackUserId: userId,
        team: { slackTeamId: teamId }
      }
    })

    if (!user?.isActive) {
      return false
    }
    
    const team = await db.team.findUnique({
      where: { slackTeamId: teamId },
      include: { 
        subscription: true,
        users: { 
          where: { isActive: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!team?.subscription) {
      return false
    }

    const plan = getPlanById(team.subscription.planId) || PRICING_PLANS.FREE
    
    // Early returns for simple cases
    if (plan.id === 'free' || plan.userLimit === -1) {
      return true
    }
    
    // Check seat limit for paid plans with user limits
    const userIndex = team.users.findIndex(u => u.slackUserId === userId)
    return userIndex !== -1 && userIndex < plan.userLimit
    
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

function createLimitResponse(allowed: boolean, reason?: string) {
  return { allowed, ...(reason && { reason }) }
}

export async function canProcessNewLink(teamId: string, userId?: string): Promise<{ allowed: boolean, reason?: string }> {
  try {
    // CRITICAL: Link processing should ALWAYS be unlimited for ALL plans
    // Free plans: unlimited link processing, but listen access limited after 20 links
    // Paid plans: unlimited link processing and listen access (subject to user limits only)
    // This ensures unlimited link processing as per business requirements
    
    if (isExceptionTeam(teamId)) {
      return createLimitResponse(true)
    }

    // ALL PLANS: NEVER block link processing - it's always unlimited
    // Link limits and user limits only affect listen access, not link processing
    return createLimitResponse(true)
  } catch (error) {
    console.error('Error checking usage limits:', error)
    return createLimitResponse(false, 'Unable to verify usage limits')
  }
}

export async function canUserListen(teamId: string, userId?: string): Promise<{ allowed: boolean, reason?: string }> {
  try {
    // Exception teams have unlimited access
    if (isExceptionTeam(teamId)) {
      return createLimitResponse(true)
    }
    
    const stats = await getTeamUsageStats(teamId)
    const isPaidPlan = stats.plan.id !== 'free'
    
    if (isPaidPlan) {
      if (stats.userLimitExceeded) {
        return createLimitResponse(false, `User limit of ${stats.plan.userLimit} reached. Upgrade your plan to add more users.`)
      }
      
      if (userId && !(await canUserConsume(teamId, userId))) {
        return createLimitResponse(false, 'User access disabled due to seat limit exceeded. Contact admin to upgrade plan.')
      }
    } else {
      // Free plan checks both link and user limits for listening
      if (stats.linkLimitExceeded) {
        return createLimitResponse(false, `Monthly link limit of ${stats.plan.monthlyLinkLimit} reached. Upgrade your plan to process more links.`)
      }
      
      if (stats.userLimitExceeded) {
        return createLimitResponse(false, `User limit of ${stats.plan.userLimit} reached. Upgrade your plan to add more users.`)
      }
    }

    return createLimitResponse(true)
  } catch (error) {
    console.error('Error checking user listen access:', error)
    return createLimitResponse(false, 'Unable to verify usage limits')
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

const UPGRADE_MESSAGES = {
  STARTER_USER_LIMIT: 'Starter plan is for individual use only. Upgrade to Pro for up to 10 team members or Business for unlimited users.',
  PRO_USER_LIMIT: 'You\'ve reached your Pro plan limit of 10 users. Upgrade to Business for unlimited users.',
  FREE_LINK_LIMIT: 'You\'ve reached your free plan limit of 20 links. Upgrade to Starter for unlimited links.',
  FREE_USER_LIMIT: 'You\'ve reached your free plan limit of 1 user. Upgrade to Starter for individual use or Pro for up to 10 team members.'
}

function getPaidPlanMessage(stats: UsageStats): string | null {
  if (stats.userLimitExceeded) {
    return stats.plan.id === 'starter' ? UPGRADE_MESSAGES.STARTER_USER_LIMIT :
           stats.plan.id === 'pro' ? UPGRADE_MESSAGES.PRO_USER_LIMIT : null
  }
  
  if (stats.userWarning && stats.plan.id === 'pro') {
    return `You're approaching your user limit (${stats.currentUsers}/${stats.plan.userLimit}). Consider upgrading to Business for unlimited users.`
  }
  
  return null
}

function getFreePlanMessage(stats: UsageStats): string | null {
  if (stats.linkLimitExceeded) return UPGRADE_MESSAGES.FREE_LINK_LIMIT
  if (stats.userLimitExceeded) return UPGRADE_MESSAGES.FREE_USER_LIMIT
  if (stats.linkWarning) return `You've used ${stats.linkUsagePercentage}% of your free plan links. Consider upgrading to Starter for unlimited links.`
  if (stats.userWarning) return `You're approaching your user limit (${stats.currentUsers}/${stats.plan.userLimit}). Consider upgrading for more users.`
  return null
}

export function getUpgradeMessage(stats: UsageStats): string | null {
  const isPaidPlan = stats.plan.id !== 'free'
  return isPaidPlan ? getPaidPlanMessage(stats) : getFreePlanMessage(stats)
}

// Additional functions expected by tests
export async function getCurrentPlan(teamId: string) {
  try {
    const stats = await getTeamUsageStats(teamId)
    return stats.plan
  } catch (error) {
    return PRICING_PLANS.FREE
  }
}

export async function canProcessMoreLinks(teamId: string): Promise<boolean> {
  try {
    const result = await canProcessNewLink(teamId)
    return result.allowed
  } catch (error) {
    return false
  }
}

export async function canAddMoreUsers(teamId: string): Promise<boolean> {
  try {
    const result = await canAddNewUser(teamId)
    return result.allowed
  } catch (error) {
    return false
  }
}

export async function updateSubscription(teamId: string, data: {
  planId?: string
  status?: SubscriptionStatus
  stripeCustomerId?: string
  stripeSubscriptionId?: string
}): Promise<{ success: boolean, error?: string }> {
  try {
    const db = await getDbClient()
    
    await db.subscription.upsert({
      where: { teamId },
      update: {
        ...(data.planId && { planId: data.planId }),
        ...(data.status && { status: data.status }),
        ...(data.stripeCustomerId && { stripeCustomerId: data.stripeCustomerId }),
        ...(data.stripeSubscriptionId && { stripeSubscriptionId: data.stripeSubscriptionId })
      },
      create: {
        teamId,
        planId: data.planId || 'free',
        status: data.status || 'ACTIVE',
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        monthlyLinkLimit: 20,
        userLimit: 1,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    })
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function cancelSubscription(teamId: string): Promise<{ success: boolean, error?: string }> {
  try {
    const db = await getDbClient()
    
    await db.subscription.update({
      where: { teamId },
      data: {
        status: 'CANCELED',
        planId: 'free',
        monthlyLinkLimit: 20,
        userLimit: 1
      }
    })
    
    trackSubscriptionCancelled({
      team_id: teamId,
      plan_type: 'free' as any,
      previous_plan: undefined,
      currency: 'USD',
      value: 0
    })
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
