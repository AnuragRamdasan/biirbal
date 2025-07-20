import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { createStripeCustomer, createCheckoutSession, PRICING_PLANS } from '@/lib/stripe'
import { getBaseUrl } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ Stripe secret key not configured')
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      )
    }

    const { teamId, planId } = await request.json()
    console.log(`🚀 Checkout request: planId=${planId}, teamId=${teamId}`)

    if (!teamId || !planId) {
      return NextResponse.json(
        { error: 'Missing teamId or planId' },
        { status: 400 }
      )
    }

    const plan = Object.values(PRICING_PLANS).find(p => p.id === planId)
    console.log(`📋 Plan details:`, plan)
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      )
    }

    // Free plan doesn't need Stripe checkout
    if (plan.id === 'free') {
      return NextResponse.json(
        { error: 'Free plan does not require checkout' },
        { status: 400 }
      )
    }

    if (!plan.stripePriceId) {
      return NextResponse.json(
        { error: 'Plan is not configured for checkout' },
        { status: 400 }
      )
    }

    // Check if the price ID looks like a default/placeholder
    if (plan.stripePriceId.startsWith('price_') && !plan.stripePriceId.startsWith('price_1')) {
      console.error(`❌ Invalid Stripe price ID: ${plan.stripePriceId}. Please set proper environment variables.`)
      return NextResponse.json(
        { 
          error: 'Stripe price ID not configured',
          details: `The plan ${plan.name} has placeholder price ID: ${plan.stripePriceId}. Please configure STRIPE_${plan.id.toUpperCase()}_PRICE_ID environment variable.`
        },
        { status: 503 }
      )
    }

    // Get team and subscription info
    const db = await getDbClient()
    // teamId from localStorage is actually the Slack team ID, not our internal ID
    const team = await db.team.findUnique({
      where: { slackTeamId: teamId },
      include: { subscription: true }
    })

    if (!team) {
      console.log(`Team lookup failed for Slack ID: ${teamId}`)
      
      // Check if any teams exist at all
      const teamCount = await db.team.count()
      console.log(`Total teams in database: ${teamCount}`)
      
      return NextResponse.json(
        { 
          error: 'Team not found',
          details: `No team found with Slack ID: ${teamId}. Total teams in database: ${teamCount}`,
          suggestion: 'Please ensure the biirbal.ai Slack app is properly installed for your workspace.'
        },
        { status: 404 }
      )
    }

    console.log(`✅ Team found: ${team.teamName} (Internal ID: ${team.id}, Slack ID: ${team.slackTeamId})`)

    let customerId = team.subscription?.stripeCustomerId
    console.log(`Current subscription:`, team.subscription)

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      console.log(`Creating new Stripe customer for team: ${team.teamName}`)
      try {
        const customer = await createStripeCustomer(
          team.id,
          team.teamName || 'Unknown Team'
        )
        customerId = customer.id
        console.log(`✅ Created Stripe customer: ${customerId}`)

        // Update subscription with customer ID
        await db.subscription.upsert({
          where: { teamId: team.id },
          update: { stripeCustomerId: customerId },
          create: {
            teamId: team.id,
            stripeCustomerId: customerId,
            status: 'TRIAL',
            planId: 'free',
            monthlyLinkLimit: 10,
            userLimit: 2,
            linksProcessed: 0
          }
        })
        console.log(`✅ Updated subscription with customer ID`)
      } catch (error) {
        console.error(`❌ Failed to create Stripe customer:`, error)
        throw error
      }
    } else {
      console.log(`✅ Using existing Stripe customer: ${customerId}`)
    }

    // Create checkout session
    const baseUrl = getBaseUrl()
    console.log(`Creating checkout session with:`, {
      customerId,
      stripePriceId: plan.stripePriceId,
      teamId: team.id,
      baseUrl
    })

    try {
      const session = await createCheckoutSession(
        customerId,
        plan.stripePriceId,
        team.id,
        `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        `${baseUrl}/pricing?canceled=true`
      )
      console.log(`✅ Created checkout session: ${session.id}`)
      return NextResponse.json({ sessionId: session.id, url: session.url })
    } catch (error) {
      console.error(`❌ Failed to create checkout session:`, error)
      throw error
    }
  } catch (error) {
    console.error('Checkout session creation failed:', error)
    
    // Provide more specific error information
    let errorMessage = 'Failed to create checkout session'
    let details = error instanceof Error ? error.message : 'Unknown error'
    
    if (error instanceof Error) {
      if (error.message.includes('price')) {
        errorMessage = 'Invalid Stripe price configuration'
        details = `The Stripe price ID may not be properly configured. ${error.message}`
      } else if (error.message.includes('customer')) {
        errorMessage = 'Failed to create Stripe customer'
      } else if (error.message.includes('key')) {
        errorMessage = 'Stripe authentication failed'
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details,
        suggestion: 'Please check your Stripe configuration in the environment variables.'
      },
      { status: 500 }
    )
  }
}