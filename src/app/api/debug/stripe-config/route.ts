import { NextRequest, NextResponse } from 'next/server'
import { PRICING_PLANS } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  // Only allow in development or with admin key
  const adminKey = request.nextUrl.searchParams.get('admin')
  if (process.env.NODE_ENV === 'production' && adminKey !== 'debug-stripe-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response = {
      environment: process.env.NODE_ENV,
      webhookUrl: `${process.env.NEXTAUTH_URL || 'https://biirbal-6ad22f05bd28.herokuapp.com'}/api/stripe/webhooks`,
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 12) + '...',
      requiredWebhookEvents: [
        'checkout.session.completed',
        'customer.subscription.updated', 
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed'
      ],
      pricingPlans: Object.values(PRICING_PLANS).map(plan => ({
        id: plan.id,
        name: plan.name,
        stripePriceId: plan.stripePriceId,
        configured: !!plan.stripePriceId && !plan.stripePriceId.startsWith('price_placeholder')
      })),
      troubleshootingSteps: [
        '1. Verify webhook endpoint is configured in Stripe Dashboard',
        '2. Ensure webhook URL points to: [webhookUrl above]',
        '3. Check that all required events are selected in Stripe webhook config',
        '4. Verify webhook endpoint status is "Enabled" in Stripe',
        '5. Check Stripe webhook logs for delivery attempts and errors'
      ],
      testInstructions: [
        '1. Go to Stripe Dashboard > Webhooks',
        '2. Find your webhook endpoint for this app',
        '3. Click "Send test webhook" and send a checkout.session.completed event',
        '4. Check Heroku logs: heroku logs --tail | grep webhook'
      ]
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to generate debug info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}