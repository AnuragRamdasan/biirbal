import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    // Get team and subscription info
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { subscription: true }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
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
      await prisma.subscription.upsert({
        where: { teamId: team.id },
        update: { stripeCustomerId: customerId },
        create: {
          teamId: team.id,
          stripeCustomerId: customerId,
          status: 'TRIAL',
          monthlyLimit: 50,
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