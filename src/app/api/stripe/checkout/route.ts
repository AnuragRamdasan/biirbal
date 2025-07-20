import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { createStripeCustomer, createCheckoutSession, PRICING_PLANS } from '@/lib/stripe'
import { getBaseUrl } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      )
    }

    const { teamId, planId } = await request.json()

    if (!teamId || !planId) {
      return NextResponse.json(
        { error: 'Missing teamId or planId' },
        { status: 400 }
      )
    }

    const plan = Object.values(PRICING_PLANS).find(p => p.id === planId)
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

    // Get team and subscription info
    const db = await getDbClient()
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: { subscription: true }
    })

    if (!team) {
      console.log(`Team lookup failed for ID: ${teamId}`)
      
      // Check if any teams exist at all
      const teamCount = await db.team.count()
      console.log(`Total teams in database: ${teamCount}`)
      
      return NextResponse.json(
        { 
          error: 'Team not found',
          details: `No team found with ID: ${teamId}. Total teams in database: ${teamCount}`,
          suggestion: 'Please ensure the biirbal.ai Slack app is properly installed for your workspace.'
        },
        { status: 404 }
      )
    }

    let customerId = team.subscription?.stripeCustomerId

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await createStripeCustomer(
        team.id,
        team.teamName || 'Unknown Team'
      )
      customerId = customer.id

      // Update subscription with customer ID
      await db.subscription.upsert({
        where: { teamId: team.id },
        update: { stripeCustomerId: customerId },
        create: {
          teamId: team.id,
          stripeCustomerId: customerId,
          status: 'TRIAL',
          planId: 'free',
          monthlyLimit: 50,
          monthlyLinkLimit: 30,
          userLimit: 2,
          linksProcessed: 0
        }
      })
    }

    // Create checkout session
    const baseUrl = getBaseUrl()
    const session = await createCheckoutSession(
      customerId,
      plan.stripePriceId,
      team.id,
      `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      `${baseUrl}/pricing?canceled=true`
    )

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Checkout session creation failed:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}