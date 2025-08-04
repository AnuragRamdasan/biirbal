# Subscription Flow Inconsistencies Analysis

## Overview
After analyzing the subscription flow across the codebase, I've identified multiple critical inconsistencies that could lead to billing errors, access control issues, and poor user experience.

## Major Inconsistencies

### 1. **Hardcoded Limit Values vs Dynamic Plan Limits**

The code has conflicting default values for subscription limits across different files:

#### Free Plan Limits:
- `stripe.ts`: 20 links, 1 user
- `webhooks/route.ts`: 10 links, 2 users (line 175, 287)
- `auth.ts`: 10 links (line 277), 20 links (line 400, 474, 493)
- `checkout/route.ts`: 10 links, 2 users
- `slack/install/route.ts`: 10 links

**Impact**: Users might see different limits depending on which flow creates/updates their subscription.

### 2. **Type Mismatch in stripePriceId**

```typescript
// In stripe.ts:
FREE: {
  stripePriceId: null  // null for free plan
}
STARTER/PRO/BUSINESS: {
  stripePriceId: {
    monthly: string,
    annual: string
  }
}
```

**Problem**: The type system expects `stripePriceId` to be either `null` OR an object, but:
- `checkUsageLimits()` expects `typeof PRICING_PLANS.FREE` which has `stripePriceId: null`
- This causes TypeScript errors when passing paid plans to the same function

### 3. **Inconsistent Plan Identification**

The webhook handler has a critical bug:
```typescript
// Line 138 in webhooks/route.ts
console.error('❌ No plan found for priceId:', priceId)
// 'priceId' is not defined - should be subscription.items.data[0]?.price.id
```

### 4. **Different Default Values in Webhook Handlers**

When handling subscription updates/deletions:
- New subscription: 10 links, 2 users
- Updated subscription: 100 links, 2 users (line 238-239)
- Cancelled subscription: 10 links, 2 users

**Why is the update handler defaulting to 100 links?**

### 5. **Subscription Creation Logic Scattered**

Subscriptions are created/updated in multiple places with different logic:
- `auth.ts`: During user signup (3 different places with different defaults)
- `stripe/webhooks`: During Stripe events
- `slack/install`: During Slack app installation
- `subscription-utils.ts`: Manual updates

Each has different default values and validation logic.

### 6. **Link Processing vs Listen Access Confusion**

The `canProcessNewLink()` function has misleading logic:
```typescript
// Line 213-224 in subscription-utils.ts
// CRITICAL: Link processing should ALWAYS be unlimited for ALL plans
// But the function always returns true, making the checks pointless
```

The comments say link processing is unlimited, but:
- Free plans have a `monthlyLinkLimit` of 20
- The UI likely shows these limits
- But the function always allows processing

**This creates confusion**: Are links limited or not?

### 7. **Team ID Confusion**

There's inconsistency in how team IDs are used:
- Sometimes `teamId` refers to the database ID
- Sometimes it refers to `slackTeamId`
- Functions like `getTeamUsageStats()` expect Slack team ID but the parameter is named `teamId`

Example:
```typescript
// subscription-utils.ts line 28
const team = await db.team.findUnique({
  where: { slackTeamId: teamId }, // teamId is actually slackTeamId!
```

### 8. **Status Mapping Duplication**

The function `mapStripeStatusToSubscriptionStatus()` is duplicated:
- In `subscription-utils.ts` (line 335-353)
- In `webhooks/route.ts` (line 358-370)

With slight differences in implementation.

### 9. **Missing Validation in Critical Paths**

No validation for:
- Plan transitions (can a user go from Business to Free?)
- Stripe price ID matching (what if Stripe sends an unknown price ID?)
- Customer ID consistency (what if the customer ID doesn't match?)

### 10. **currentPeriodEnd Calculation Issues**

Different approaches to calculating subscription end dates:
```typescript
// webhooks/route.ts
currentPeriodEnd: subscription.current_period_end 
  ? new Date(subscription.current_period_end * 1000)
  : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

// subscription-utils.ts
currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
```

One uses Stripe's actual period end, the other always uses 30 days.

## Impact Analysis

### Critical Issues:
1. **Billing Accuracy**: Users might be charged for one plan but receive limits from another
2. **Access Control**: User and link limits are inconsistently enforced
3. **Data Integrity**: Multiple sources of truth for subscription state
4. **User Experience**: Confusing messaging about what's actually limited

### Security Concerns:
1. No validation of Stripe webhook data against local state
2. Team ID confusion could lead to cross-team data access
3. Missing authorization checks in some subscription update paths

## Recommendations

### Immediate Fixes:

1. **Centralize Plan Configuration**
   ```typescript
   // Create a single source of truth
   const DEFAULT_LIMITS = {
     free: { links: 20, users: 1 },
     starter: { links: -1, users: 1 },
     pro: { links: -1, users: 10 },
     business: { links: -1, users: -1 }
   }
   ```

2. **Fix Type Definitions**
   ```typescript
   interface PricingPlan {
     stripePriceId: null | {
       monthly: string;
       annual: string;
     }
   }
   ```

3. **Standardize Team ID Usage**
   - Always use database `team.id` internally
   - Only use `slackTeamId` for Slack API calls
   - Rename parameters to be explicit: `teamId` vs `slackTeamId`

4. **Create Single Subscription Update Function**
   ```typescript
   async function updateSubscriptionWithValidation(
     teamId: string,
     updates: SubscriptionUpdate
   ) {
     // Validate plan transition
     // Update subscription
     // Sync with Stripe
     // Send notifications
   }
   ```

5. **Fix the undefined `priceId` error** in webhooks handler

### Long-term Improvements:

1. **Implement Subscription State Machine**
   - Define valid state transitions
   - Enforce business rules
   - Audit trail for changes

2. **Add Comprehensive Tests**
   - Test each subscription creation path
   - Verify limits are correctly applied
   - Test plan upgrades/downgrades

3. **Create Subscription Sync Job**
   - Periodically sync with Stripe
   - Detect and fix inconsistencies
   - Alert on mismatches

4. **Improve Documentation**
   - Document what each limit means
   - Clarify link processing vs listening
   - Explain the subscription lifecycle

## Code Locations to Fix

1. `src/app/api/stripe/webhooks/route.ts`: Lines 138, 175, 239, 287
2. `src/lib/subscription-utils.ts`: Lines 28, 213-224, 335-353
3. `src/lib/auth.ts`: Lines 277, 400, 474, 493
4. `src/lib/stripe.ts`: Type definitions for PRICING_PLANS
5. All files creating subscriptions: Standardize defaults

This analysis reveals significant technical debt in the subscription system that needs immediate attention to prevent billing errors and access control issues.