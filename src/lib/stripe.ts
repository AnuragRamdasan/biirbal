import Stripe from 'stripe'

// Initialize Stripe only if the secret key is available
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    })
  : null

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
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  
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
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  
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
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  })

  return session
}

export function constructWebhookEvent(body: string, signature: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook secret is not configured')
  }
  
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  )
}