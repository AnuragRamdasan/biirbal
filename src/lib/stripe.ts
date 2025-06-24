import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export const PRICING_PLANS = {
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: 9.99,
    monthlyLimit: 100,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter'
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 29.99,
    monthlyLimit: 500,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro'
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    monthlyLimit: 2000,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise'
  }
}

export async function createStripeCustomer(teamId: string, teamName: string, email?: string) {
  const customer = await stripe.customers.create({
    metadata: {
      teamId,
      teamName
    },
    email,
    description: `Slack Team: ${teamName}`
  })

  return customer
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  teamId: string,
  successUrl: string,
  cancelUrl: string
) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      teamId
    },
    subscription_data: {
      metadata: {
        teamId
      }
    }
  })

  return session
}

export async function createPortalSession(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  })

  return session
}

export function constructWebhookEvent(body: string, signature: string) {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}