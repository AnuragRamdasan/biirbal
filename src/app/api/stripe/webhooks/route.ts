import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { constructWebhookEvent, PRICING_PLANS } from '@/lib/stripe'
import { adminNotifications } from '@/lib/admin-notifications'
import Stripe from 'stripe'

function findPlanByPriceId(priceId?: string) {
  if (!priceId) return null
  
  console.log('🔍 Looking for plan with priceId:', priceId)
  console.log('📋 Available plans:', Object.values(PRICING_PLANS).map(p => ({ id: p.id, name: p.name, stripePriceId: p.stripePriceId })))
  
  return Object.values(PRICING_PLANS).find(p => {
    if (!p.stripePriceId) return false
    
    // Handle object format (monthly/annual)
    if (typeof p.stripePriceId === 'object') {
      return p.stripePriceId.monthly === priceId || p.stripePriceId.annual === priceId
    }
    
    // Handle old string format for backward compatibility
    return p.stripePriceId === priceId
  }) || null
}

async function notifySubscriptionEvent(
  event: string, 
  team: any, 
  plan: any, 
  extra: any = {}
): Promise<void> {
  try {
    await adminNotifications.notifySubscriptionEvent({
      event,
      teamId: team.slackTeamId || team.id,
      teamName: team.teamName,
      planId: plan.id,
      planName: plan.name,
      amount: extra.amount ?? plan.price,
      currency: extra.currency || 'USD',
      ...extra
    })
  } catch (error) {
    console.error(`Failed to send ${event} notification:`, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Stripe webhook received')
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ Missing stripe signature')
      return NextResponse.json(
        { error: 'Missing stripe signature' },
        { status: 400 }
      )
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ Stripe not configured')
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      )
    }

    const event = constructWebhookEvent(body, signature)
    console.log(`📩 Processing webhook event: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing failed:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('🎉 Processing checkout completion:', session.id)
  const teamId = session.metadata?.teamId
  console.log('📋 Checkout metadata teamId:', teamId)
  if (!teamId) {
    console.error('❌ No teamId in checkout session metadata')
    return
  }

  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  // Get the subscription details from Stripe
  const stripe = new (require('stripe'))(process.env.STRIPE_SECRET_KEY!)
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  console.log('💳 Subscription details:', {
    id: subscription.id,
    status: subscription.status,
    current_period_end: subscription.current_period_end,
    current_period_end_date: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
    items: subscription.items.data.map(item => ({
      price_id: item.price.id,
      product: item.price.product
    }))
  })

  const plan = findPlanByPriceId(subscription.items.data[0]?.price.id)
  
  if (!plan) {
    console.error('❌ No plan found for priceId:', priceId)
    console.error('❌ This means the Stripe price ID is not configured in PRICING_PLANS')
    console.error('❌ Please check your environment variables for Stripe price IDs')
    return
  }

  // Get team info for notification - teamId from metadata should be internal DB ID
  const team = await prisma.team.findUnique({
    where: { id: teamId }
  })

  if (!team) {
    console.error(`Team not found for checkout completion: ${teamId}`)
    return
  }

  console.log(`Processing checkout for team: ${team.teamName} (ID: ${team.id}, Slack ID: ${team.slackTeamId})`)
  console.log(`Plan to activate: ${plan?.name} (${plan?.id})`)

  // Handle currentPeriodEnd safely
  const currentPeriodEnd = subscription.current_period_end 
    ? new Date(subscription.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default to 30 days from now

  console.log('📅 Current period end:', {
    raw: subscription.current_period_end,
    date: currentPeriodEnd
  })

  await prisma.subscription.update({
    where: { teamId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: 'ACTIVE',
      planId: plan?.id || 'free',
      currentPeriodEnd,
      monthlyLinkLimit: plan?.monthlyLinkLimit || 10,
      userLimit: plan?.userLimit || 2
    }
  })

  // Send admin notification for new subscription
  if (plan) {
    await notifySubscriptionEvent('subscription_started', team, plan, { stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId })
  }

  console.log(`✅ Subscription activated successfully for team: ${teamId} with plan: ${plan?.id}`)
  
  // Verify the update worked
  const updatedSubscription = await prisma.subscription.findUnique({
    where: { teamId }
  })
  console.log('🔍 Updated subscription:', {
    teamId: updatedSubscription?.teamId,
    planId: updatedSubscription?.planId,
    status: updatedSubscription?.status,
    userLimit: updatedSubscription?.userLimit
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const teamId = subscription.metadata?.teamId
  if (!teamId) {
    console.error('No teamId in subscription metadata for update')
    return
  }

  // Get current subscription to check for plan changes
  const currentSubscription = await prisma.subscription.findUnique({
    where: { teamId }
  })

  // Also get team info
  const team = await prisma.team.findUnique({
    where: { id: teamId }
  })

  if (!team) {
    console.error(`Team not found for subscription update: ${teamId}`)
    return
  }

  console.log(`Updating subscription for team: ${team.teamName} (ID: ${team.id}, Slack ID: ${team.slackTeamId})`)

  const plan = findPlanByPriceId(subscription.items.data[0]?.price.id)
  const previousPlan = currentSubscription?.planId ? Object.values(PRICING_PLANS).find(p => p.id === currentSubscription.planId) : null

  const status = mapStripeStatus(subscription.status)

  // Handle currentPeriodEnd safely
  const currentPeriodEnd = subscription.current_period_end 
    ? new Date(subscription.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default to 30 days from now

  await prisma.subscription.update({
    where: { teamId },
    data: {
      status,
      planId: plan?.id || 'free',
      currentPeriodEnd,
      monthlyLinkLimit: plan?.monthlyLinkLimit || 100,
      userLimit: plan?.userLimit || 2
    }
  })

  // Send admin notification for subscription change
  if (plan && currentSubscription && plan.id !== currentSubscription.planId) {
    const isUpgrade = plan.price > (previousPlan?.price || 0)
    const eventType = isUpgrade ? 'subscription_upgraded' : 'subscription_downgraded'
    await notifySubscriptionEvent(eventType, team, plan, { 
      stripeSubscriptionId: subscription.id,
      previousPlan: previousPlan?.name 
    })
  }

  console.log(`Subscription updated for team: ${teamId}, status: ${status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const teamId = subscription.metadata?.teamId
  if (!teamId) {
    console.error('No teamId in subscription metadata for deletion')
    return
  }

  // Get current subscription and team info for notification
  const currentSubscription = await prisma.subscription.findUnique({
    where: { teamId }
  })

  const team = await prisma.team.findUnique({
    where: { id: teamId }
  })

  if (!team) {
    console.error(`Team not found for subscription deletion: ${teamId}`)
    return
  }

  console.log(`Deleting subscription for team: ${team.teamName} (ID: ${team.id}, Slack ID: ${team.slackTeamId})`)

  const plan = currentSubscription?.planId ? Object.values(PRICING_PLANS).find(p => p.id === currentSubscription.planId) : null

  await prisma.subscription.update({
    where: { teamId },
    data: {
      status: 'CANCELED',
      planId: 'free',
      monthlyLinkLimit: 10, // Back to free tier limits
      userLimit: 2, // Back to free tier limits
      stripeSubscriptionId: null
    }
  })

  // Send admin notification for subscription cancellation
  if (plan) {
    await notifySubscriptionEvent('subscription_cancelled', team, plan, {
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id
    })
  }

  console.log(`Subscription canceled for team: ${teamId}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  // Reset monthly usage counter on successful payment
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    include: {
      team: true
    }
  })

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE'
      }
    })

    // Send admin notification for successful payment
    const plan = Object.values(PRICING_PLANS).find(p => p.id === subscription.planId)
    if (plan && subscription.team) {
      await notifySubscriptionEvent('subscription_payment', subscription.team, plan, {
        amount: (invoice.amount_paid || 0) / 100,
        currency: invoice.currency?.toUpperCase() || 'USD',
        stripeCustomerId: invoice.customer as string
      })
    }

    console.log(`Payment succeeded, usage reset for subscription: ${subscriptionId}`)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId }
  })

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'PAST_DUE'
      }
    })

    console.log(`Payment failed for subscription: ${subscriptionId}`)
  }
}

function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'ACTIVE',
    'past_due': 'PAST_DUE',
    'canceled': 'CANCELED',
    'incomplete': 'INCOMPLETE',
    'incomplete_expired': 'INCOMPLETE_EXPIRED',
    'unpaid': 'UNPAID',
    'trialing': 'ACTIVE'
  }

  return statusMap[stripeStatus] || 'INCOMPLETE'
}