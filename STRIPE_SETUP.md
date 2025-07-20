# Stripe Setup Guide for Monthly/Annual Pricing

## Environment Variables Required

You need to set up different price IDs for monthly and annual subscriptions. Here's how to configure your environment variables:

### 1. Basic Stripe Configuration
```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 2. Price IDs for Each Plan

#### Starter Plan
```bash
# Monthly subscription ($9.00/month)
STRIPE_STARTER_MONTHLY_PRICE_ID=price_1OqX8X2eZvKYlo2C9QqX8X2e

# Annual subscription ($99.00/year - 8% discount)
STRIPE_STARTER_ANNUAL_PRICE_ID=price_1OqX8X2eZvKYlo2C9QqX8X2e
```

#### Pro Plan
```bash
# Monthly subscription ($39.00/month)
STRIPE_PRO_MONTHLY_PRICE_ID=price_1OqX8X2eZvKYlo2C9QqX8X2e

# Annual subscription ($399.00/year - 15% discount)
STRIPE_PRO_ANNUAL_PRICE_ID=price_1OqX8X2eZvKYlo2C9QqX8X2e
```

#### Business Plan
```bash
# Monthly subscription ($99.00/month)
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_1OqX8X2eZvKYlo2C9QqX8X2e

# Annual subscription ($900.00/year - 24% discount)
STRIPE_BUSINESS_ANNUAL_PRICE_ID=price_1OqX8X2eZvKYlo2C9QqX8X2e
```

## How to Create Price IDs in Stripe Dashboard

### Step 1: Create Products
1. Go to your Stripe Dashboard
2. Navigate to **Products** → **Add Product**
3. Create products for each plan:
   - **Starter Plan**
   - **Pro Plan** 
   - **Business Plan**

### Step 2: Create Price IDs
For each product, create two prices:

#### Example: Starter Plan
1. **Monthly Price**:
   - Amount: $9.00
   - Billing: Recurring
   - Billing period: Monthly
   - Copy the price ID (starts with `price_`)

2. **Annual Price**:
   - Amount: $99.00
   - Billing: Recurring
   - Billing period: Yearly
   - Copy the price ID (starts with `price_`)

### Step 3: Update Environment Variables
Replace the placeholder price IDs in your `.env` file with the actual price IDs from Stripe.

## Testing the Integration

### 1. Test Monthly Subscriptions
```bash
# Test with monthly billing
curl -X POST http://localhost:3000/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"planId": "pro", "teamId": "your_team_id", "isAnnual": false}'
```

### 2. Test Annual Subscriptions
```bash
# Test with annual billing
curl -X POST http://localhost:3000/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"planId": "pro", "teamId": "your_team_id", "isAnnual": true}'
```

## Webhook Events to Handle

Make sure your Stripe webhook endpoint handles these events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Pricing Structure Summary

| Plan | Monthly Price | Annual Price | Discount | Monthly Limit | User Limit |
|------|---------------|--------------|----------|---------------|------------|
| Free | $0 | $0 | - | 10 | 2 |
| Starter | $9.00 | $99.00 | 8% | 50 | 3 |
| Pro | $39.00 | $399.00 | 15% | 200 | 10 |
| Business | $99.00 | $900.00 | 24% | 1000 | 25 |

## Troubleshooting

### Common Issues:
1. **"Stripe price ID not configured"**: Check that all environment variables are set correctly
2. **"Invalid Stripe price ID"**: Ensure price IDs start with `price_1` (not placeholder values)
3. **Webhook failures**: Verify webhook secret and endpoint URL in Stripe dashboard

### Testing Cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

## Security Notes

1. **Never commit real Stripe keys** to version control
2. **Use test keys** for development
3. **Rotate keys** regularly in production
4. **Monitor webhook events** for failed payments