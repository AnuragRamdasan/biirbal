import Stripe from 'stripe'

// Initialize Stripe only if the secret key is available
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-05-28.basil'
    })
  : null

export const PRICING_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    monthlyLinkLimit: 20, // Keep link limit for free tier only
    userLimit: 1,
    stripePriceId: null
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: 9.00,
    annualPrice: 99.00,
    monthlyLinkLimit: -1, // Unlimited links for all paid plans
    userLimit: 1,
    stripePriceId: {
      monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || 'price_starter_monthly',
      annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || 'price_starter_annual'
    }
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 39.00,
    annualPrice: 399.00,
    monthlyLinkLimit: -1, // Unlimited links for all paid plans
    userLimit: 10,
    stripePriceId: {
      monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
      annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual'
    }
  },
  BUSINESS: {
    id: 'business',
    name: 'Business',
    price: 99.00,
    annualPrice: 900.00,
    monthlyLinkLimit: -1, // Unlimited links for all paid plans
    userLimit: -1, // Unlimited users
    stripePriceId: {
      monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || 'price_business_monthly',
      annual: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID || 'price_business_annual'
    }
  }
}

// Helper function to get plan details
export function getPlanById(planId: string) {
  return Object.values(PRICING_PLANS).find(plan => plan.id === planId)
}

// Helper function to get price ID based on billing cycle
export function getPriceId(plan: any, isAnnual: boolean): string | null {
  if (!plan.stripePriceId) return null
  
  if (typeof plan.stripePriceId === 'string') {
    // Backward compatibility for old format
    return plan.stripePriceId
  }
  
  if (typeof plan.stripePriceId === 'object' && plan.stripePriceId.monthly && plan.stripePriceId.annual) {
    return isAnnual ? plan.stripePriceId.annual : plan.stripePriceId.monthly
  }
  
  return null
}

// Helper function to get plan price based on billing cycle
export function getPlanPrice(plan: any, isAnnual: boolean): number {
  if (isAnnual && 'annualPrice' in plan) {
    return plan.annualPrice
  }
  return plan.price
}

// Helper function to check if usage is within limits
export function checkUsageLimits(plan: typeof PRICING_PLANS.FREE, currentLinks: number, currentUsers: number) {
  const linkLimitExceeded = plan.monthlyLinkLimit !== -1 && currentLinks >= plan.monthlyLinkLimit
  const userLimitExceeded = plan.userLimit !== -1 && currentUsers > plan.userLimit
  
  // For paid plans, prioritize seat limits over link limits
  const isPaidPlan = plan.id !== 'free'
  const canProcessMore = isPaidPlan 
    ? !userLimitExceeded // Paid plans: only check user limits
    : !linkLimitExceeded && !userLimitExceeded // Free plan: check both
  
  return {
    linkLimitExceeded: isPaidPlan ? false : linkLimitExceeded, // Ignore link limits for paid plans
    userLimitExceeded,
    canProcessMore,
    linkWarning: isPaidPlan ? false : (plan.monthlyLinkLimit !== -1 && currentLinks >= (plan.monthlyLinkLimit * 0.8)), // 80% warning
    userWarning: plan.userLimit !== -1 && currentUsers >= (plan.userLimit * 0.8) // 80% warning
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
  cancelUrl: string,
  couponCode?: string
) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  
  // Build session configuration
  const sessionConfig: any = {
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
  }

  // Add coupon if provided
  if (couponCode) {
    try {
      // First try to find promotion code
      const promotionCodes = await stripe.promotionCodes.list({
        code: couponCode.trim().toUpperCase(),
        limit: 1
      })

      if (promotionCodes.data.length > 0) {
        // Use promotion code
        sessionConfig.discounts = [{
          promotion_code: promotionCodes.data[0].id
        }]
        console.log(`✅ Applied promotion code: ${promotionCodes.data[0].id}`)
      } else {
        // Try as coupon ID
        try {
          const coupon = await stripe.coupons.retrieve(couponCode.trim())
          if (coupon.valid) {
            sessionConfig.discounts = [{
              coupon: coupon.id
            }]
            console.log(`✅ Applied coupon: ${coupon.id}`)
          }
        } catch (error) {
          console.log(`❌ Invalid coupon code: ${couponCode}`)
          // Don't throw error, just proceed without coupon
        }
      }
    } catch (error) {
      console.log(`❌ Failed to apply coupon: ${couponCode}`, error)
      // Don't throw error, just proceed without coupon
    }
  }

  const session = await stripe.checkout.sessions.create(sessionConfig)

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