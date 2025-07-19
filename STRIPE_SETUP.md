# Stripe Integration Setup Guide

This guide walks you through setting up Stripe payment processing for biirbal.ai's subscription plans.

## Prerequisites

- Stripe account (create at [stripe.com](https://stripe.com))
- Access to your project's environment variables
- Admin access to your Stripe dashboard

## Pricing Plans Overview

biirbal.ai offers three subscription tiers:

| Plan | Price | Monthly Links | Users | Features |
|------|-------|---------------|-------|----------|
| **Free** | $0 | 30 | 2 | Basic Slack integration, Community support |
| **Pro** | $19.99 | 100 | 5 | Priority processing, Team analytics, Email support |
| **Enterprise** | $69.99 | Unlimited | Unlimited | Custom integrations, Dedicated support, SLA |

## Stripe Setup Steps

### 1. Create Stripe Products and Prices

In your Stripe Dashboard:

#### Pro Plan ($19.99/month)
1. Go to **Products** → **Create Product**
2. Name: "biirbal.ai Pro"
3. Description: "Pro plan with 100 links/month and 5 users"
4. **Add Price**:
   - Price: $19.99
   - Billing period: Monthly
   - Currency: USD
5. Copy the **Price ID** (starts with `price_`)

#### Enterprise Plan ($69.99/month)
1. Go to **Products** → **Create Product**
2. Name: "biirbal.ai Enterprise"
3. Description: "Enterprise plan with unlimited links and users"
4. **Add Price**:
   - Price: $69.99
   - Billing period: Monthly
   - Currency: USD
5. Copy the **Price ID** (starts with `price_`)

### 2. Configure Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. **Add endpoint**:
   - URL: `https://your-domain.com/api/stripe/webhooks`
   - Events to send:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. Copy the **Webhook Signing Secret**

### 3. Environment Variables

Add these environment variables to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_... # or sk_test_... for development
STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_... for development
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```

### 4. Test Mode vs Live Mode

#### Development/Testing
- Use **test** keys (`sk_test_`, `pk_test_`)
- Use test card numbers from [Stripe's documentation](https://stripe.com/docs/testing#cards)
- Test successful payments: `4242 4242 4242 4242`
- Test declined payments: `4000 0000 0000 0002`

#### Production
- Use **live** keys (`sk_live_`, `pk_live_`)
- Ensure webhooks are configured for your live domain
- Test with small amounts before going fully live

## Usage Limits Implementation

### Database Schema

The subscription limits are enforced through the database:

```sql
-- Subscription table includes:
planId VARCHAR -- 'free', 'pro', 'enterprise'
monthlyLinkLimit INTEGER -- 30, 100, -1 (unlimited)
userLimit INTEGER -- 2, 5, -1 (unlimited)
linksProcessed INTEGER -- Current month usage
```

### Enforcement Points

1. **Link Processing**: Before processing any shared link
2. **User Addition**: When new users join the Slack workspace
3. **Dashboard Warnings**: When approaching limits (80% threshold)

### API Endpoints

- `GET /api/dashboard/usage?teamId=xxx` - Get current usage stats
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/webhooks` - Handle Stripe events

## Monitoring and Analytics

### Key Metrics to Track

1. **Subscription Metrics**:
   - Monthly Recurring Revenue (MRR)
   - Churn rate
   - Upgrade/downgrade patterns

2. **Usage Metrics**:
   - Links processed per plan
   - Feature adoption rates
   - Support ticket volume by plan

3. **Technical Metrics**:
   - Payment success/failure rates
   - Webhook delivery success
   - API response times

### Stripe Dashboard

Monitor these sections regularly:
- **Payments** - Transaction history and failures
- **Subscriptions** - Active, canceled, and churned subscriptions
- **Analytics** - Revenue trends and customer insights
- **Logs** - API request logs and webhook deliveries

## Troubleshooting

### Common Issues

#### Webhook Failures
```bash
# Check webhook logs in Stripe Dashboard
# Verify endpoint URL is accessible
# Ensure webhook secret matches environment variable
```

#### Payment Declined
- Customer's card was declined
- Insufficient funds
- Card expired or invalid
- Regional restrictions

#### Subscription Sync Issues
```bash
# Manually sync subscription from Stripe
POST /api/admin/sync-subscription
{
  "teamId": "team_xxx",
  "stripeSubscriptionId": "sub_xxx"
}
```

### Testing Checklist

- [ ] Free plan limits enforced (30 links, 2 users)
- [ ] Pro plan checkout flow works
- [ ] Enterprise plan checkout flow works
- [ ] Webhook events properly update database
- [ ] Usage warnings appear at 80% threshold
- [ ] Link processing blocked when limits exceeded
- [ ] Stripe dashboard shows correct subscription data

## Security Considerations

1. **Environment Variables**: Never commit Stripe keys to version control
2. **Webhook Verification**: Always verify webhook signatures
3. **HTTPS Only**: Stripe requires HTTPS for webhooks in production
4. **Rate Limiting**: Implement rate limiting on payment endpoints
5. **Logging**: Log payment events but never log sensitive data

## Support and Documentation

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Webhook Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Subscription Lifecycle](https://stripe.com/docs/billing/subscriptions/overview)

## Emergency Procedures

### Payment Failures
1. Check Stripe Dashboard for error details
2. Verify webhook endpoint is receiving events
3. Check application logs for processing errors
4. Contact Stripe support if needed

### Subscription Issues
1. Verify database subscription status matches Stripe
2. Use Stripe Dashboard to manually update subscription
3. Trigger webhook manually if sync is broken
4. Implement manual override for critical customers

---

**Last Updated**: July 2025
**Version**: 1.0