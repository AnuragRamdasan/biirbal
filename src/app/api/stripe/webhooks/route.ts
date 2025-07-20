import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { constructWebhookEvent, PRICING_PLANS } from '@/lib/stripe'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe signature' },
        { status: 400 }
      )
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      )
    }

    const event = constructWebhookEvent(body, signature)

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
  const teamId = session.metadata?.teamId
  if (!teamId) return

  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  // Get the subscription details from Stripe
  const stripe = new (require('stripe'))(process.env.STRIPE_SECRET_KEY!)
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Determine plan based on price ID
  const priceId = subscription.items.data[0]?.price.id
  const plan = Object.values(PRICING_PLANS).find(p => p.stripePriceId === priceId)

  await prisma.subscription.update({
    where: { teamId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: 'ACTIVE',
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      monthlyLinkLimit: plan?.monthlyLinkLimit || 100,
      linksProcessed: 0 // Reset counter on new subscription
    }
  })

  console.log(`Subscription activated for team: ${teamId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const teamId = subscription.metadata?.teamId
  if (!teamId) return

  // Determine plan based on price ID
  const priceId = subscription.items.data[0]?.price.id
  const plan = Object.values(PRICING_PLANS).find(p => p.stripePriceId === priceId)

  const status = mapStripeStatus(subscription.status)

  await prisma.subscription.update({
    where: { teamId },
    data: {
      status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      monthlyLinkLimit: plan?.monthlyLinkLimit || 100
    }
  })

  console.log(`Subscription updated for team: ${teamId}, status: ${status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const teamId = subscription.metadata?.teamId
  if (!teamId) return

  await prisma.subscription.update({
    where: { teamId },
    data: {
      status: 'CANCELED',
      monthlyLinkLimit: 10, // Back to free tier limits
      stripeSubscriptionId: null
    }
  })

  console.log(`Subscription canceled for team: ${teamId}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  // Reset monthly usage counter on successful payment
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId }
  })

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        linksProcessed: 0,
        status: 'ACTIVE'
      }
    })

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