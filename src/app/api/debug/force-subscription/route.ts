import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PRICING_PLANS } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { teamId, planId, adminKey } = await request.json()
    
    // Security check
    if (adminKey !== 'emergency-fix-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!teamId || !planId) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        required: ['teamId (Slack team ID)', 'planId', 'adminKey']
      }, { status: 400 })
    }

    const plan = Object.values(PRICING_PLANS).find(p => p.id === planId)
    if (!plan) {
      return NextResponse.json({ 
        error: 'Invalid plan ID',
        availablePlans: Object.values(PRICING_PLANS).map(p => ({ id: p.id, name: p.name }))
      }, { status: 400 })
    }

    // Find team by Slack team ID
    const team = await prisma.team.findUnique({
      where: { slackTeamId: teamId },
      include: { subscription: true }
    })

    if (!team) {
      return NextResponse.json({ 
        error: 'Team not found',
        teamId 
      }, { status: 404 })
    }

    console.log(`🚨 MANUAL SUBSCRIPTION UPDATE: ${team.teamName} (${teamId}) -> ${plan.name}`)

    // Update subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { teamId: team.id },
      data: {
        planId: plan.id,
        status: 'ACTIVE',
        monthlyLinkLimit: plan.monthlyLinkLimit,
        userLimit: plan.userLimit,
        linksProcessed: 0 // Reset usage
      }
    })

    console.log(`✅ Manual subscription update completed`)

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${team.teamName} to ${plan.name} plan`,
      details: {
        teamName: team.teamName,
        slackTeamId: team.slackTeamId,
        databaseTeamId: team.id,
        previousPlan: team.subscription?.planId || 'unknown',
        newPlan: plan.id,
        newLimits: {
          monthlyLinks: plan.monthlyLinkLimit,
          users: plan.userLimit
        }
      }
    })

  } catch (error) {
    console.error('Manual subscription update failed:', error)
    return NextResponse.json({ 
      error: 'Failed to update subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}