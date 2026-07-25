import { getDbClient } from './db'

export interface UsageCheckResult {
  allowed: boolean
  reason?: string
  currentUsage?: number
  limit?: number
}

export async function canProcessNewLink(slackTeamId: string): Promise<UsageCheckResult> {
  const db = await getDbClient()
  
  // Find the team by Slack team ID
  const team = await db.team.findUnique({
    where: { slackTeamId },
    include: { subscription: true }
  })

  if (!team) {
    return { allowed: false, reason: 'Team not found' }
  }

  if (!team.subscription) {
    // No subscription, use free tier limits
    const monthlyCount = await getMonthlyLinkCount(slackTeamId)
    const freeLimit = Number(process.env.FREE_TIER_100_LINKS) || 100
    if (monthlyCount >= freeLimit) {
      return {
        allowed: false,
        reason: `Free tier limit reached (${monthlyCount}/${freeLimit} links this month)`,
        currentUsage: monthlyCount,
        limit: freeLimit
      }
    }
    return { allowed: true, currentUsage: monthlyCount, limit: freeLimit }
  }

  if (team.subscription.status !== 'active' && team.subscription.status !== 'trialing') {
    return { allowed: false, reason: `Subscription status: ${team.subscription.status}` }
  }

  const monthlyCount = await getMonthlyLinkCount(slackTeamId)
  const monthlyLimit = team.subscription.monthlyLinkLimit
  
  if (monthlyLimit && monthlyCount >= monthlyLimit) {
    return {
      allowed: false,
      reason: `Monthly link limit reached (${monthlyCount}/${monthlyLimit})`,
      currentUsage: monthlyCount,
      limit: monthlyLimit
    }
  }

  return { allowed: true, currentUsage: monthlyCount, limit: monthlyLimit || undefined }
}

async function getMonthlyLinkCount(slackTeamId: string): Promise<number> {
  const db = await getDbClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const team = await db.team.findUnique({
    where: { slackTeamId }
  })

  if (!team) return 0

  const count = await db.processedLink.count({
    where: {
      teamId: team.id,
      createdAt: {
        gte: startOfMonth
      },
      processingStatus: 'COMPLETED'
    }
  })

  return count
}

export async function canAddNewUser(teamId: string): Promise<UsageCheckResult> {
  const db = await getDbClient()

  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      subscription: true,
      memberships: true
    }
  })

  if (!team) {
    return { allowed: false, reason: 'Team not found' }
  }

  const currentMemberCount = team.memberships.filter((m) => m.isActive).length

  if (!team.subscription) {
    const freeSeatLimit = Number(process.env.FREE_TIER_SEAT_LIMIT) || 1
    if (currentMemberCount >= freeSeatLimit) {
      return {
        allowed: false,
        reason: `Free tier seat limit reached (${currentMemberCount}/${freeSeatLimit})`,
        currentUsage: currentMemberCount,
        limit: freeSeatLimit
      }
    }
    return { allowed: true, currentUsage: currentMemberCount, limit: freeSeatLimit }
  }

  const seatLimit = team.subscription.seatLimit
  if (seatLimit && currentMemberCount >= seatLimit) {
    return {
      allowed: false,
      reason: `Seat limit reached (${currentMemberCount}/${seatLimit})`,
      currentUsage: currentMemberCount,
      limit: seatLimit
    }
  }
  return { allowed: true, currentUsage: currentMemberCount, limit: seatLimit || undefined }
}

export async function updateSubscriptionFromStripe(
  teamId: string,
  stripeSubscriptionId: string,
  planId: string,
  status: string,
  // FIX Bug 5: Accept the real current_period_end from Stripe instead of always
  // computing "now + 30 days". Stripe's value is a Unix timestamp (seconds),
  // so callers must pass `new Date(stripeEvent.current_period_end * 1000)`.
  // Falls back to 30-day estimate only when Stripe doesn't provide the field.
  currentPeriodEnd?: Date
): Promise<void> {
  const db = await getDbClient()
  
  const planConfig = getPlanConfig(planId)
  const periodEnd = currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  
  await db.subscription.upsert({
    where: { teamId, },
    update: {
      stripeSubscriptionId,
      planId,
      status,
      monthlyLinkLimit: planConfig.monthlyLinkLimit,
      seatLimit: planConfig.seatLimit,
      currentPeriodEnd: periodEnd
    },
    create: {
      teamId,
      stripeSubscriptionId,
      planId,
      status,
      monthlyLinkLimit: planConfig.monthlyLinkLimit,
      seatLimit: planConfig.seatLimit,
      currentPeriodEnd: periodEnd
    }
  })
}

function getPlanConfig(planId: string): { monthlyLinkLimit: number; seatLimit: number } {
  switch (planId) {
    case 'basic':
      return { monthlyLinkLimit: 500, seatLimit: 5 }
    case 'pro':
      return { monthlyLinkLimit: 2000, seatLimit: 25 }
    case 'enterprise':
      return { monthlyLinkLimit: 10000, seatLimit: 100 }
    default:
      return { monthlyLinkLimit: 100, seatLimit: 1 }
  }
}
