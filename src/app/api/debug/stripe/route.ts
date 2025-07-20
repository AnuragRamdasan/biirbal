import { NextResponse } from 'next/server'
import { PRICING_PLANS } from '@/lib/stripe'

export async function GET() {
  try {
    const config = {
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasPublishableKey: !!process.env.STRIPE_PUBLISHABLE_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      secretKeyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 8) + '...' : 'NOT_SET',
      plans: Object.values(PRICING_PLANS).map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        stripePriceId: plan.stripePriceId,
        hasPriceId: !!plan.stripePriceId,
        isPlaceholder: plan.stripePriceId ? 
          (plan.stripePriceId.startsWith('price_') && !plan.stripePriceId.startsWith('price_1')) : 
          false
      })),
      environmentVariables: {
        STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID || 'NOT_SET',
        STRIPE_ENTERPRISE_PRICE_ID: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'NOT_SET'
      }
    }

    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check Stripe configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}