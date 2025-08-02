"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRICING_PLANS = exports.stripe = void 0;
exports.getPlanById = getPlanById;
exports.getPriceId = getPriceId;
exports.getPlanPrice = getPlanPrice;
exports.checkUsageLimits = checkUsageLimits;
exports.createStripeCustomer = createStripeCustomer;
exports.createCheckoutSession = createCheckoutSession;
exports.createPortalSession = createPortalSession;
exports.constructWebhookEvent = constructWebhookEvent;
const stripe_1 = __importDefault(require("stripe"));
// Initialize Stripe only if the secret key is available
exports.stripe = process.env.STRIPE_SECRET_KEY
    ? new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-05-28.basil'
    })
    : null;
exports.PRICING_PLANS = {
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
};
// Helper function to get plan details
function getPlanById(planId) {
    return Object.values(exports.PRICING_PLANS).find(plan => plan.id === planId);
}
// Helper function to get price ID based on billing cycle
function getPriceId(plan, isAnnual) {
    if (!plan.stripePriceId)
        return null;
    if (typeof plan.stripePriceId === 'string') {
        // Backward compatibility for old format
        return plan.stripePriceId;
    }
    if (typeof plan.stripePriceId === 'object' && plan.stripePriceId.monthly && plan.stripePriceId.annual) {
        return isAnnual ? plan.stripePriceId.annual : plan.stripePriceId.monthly;
    }
    return null;
}
// Helper function to get plan price based on billing cycle
function getPlanPrice(plan, isAnnual) {
    if (isAnnual && 'annualPrice' in plan) {
        return plan.annualPrice;
    }
    return plan.price;
}
// Helper function to check if usage is within limits
function checkUsageLimits(plan, currentLinks, currentUsers) {
    const linkLimitExceeded = plan.monthlyLinkLimit !== -1 && currentLinks >= plan.monthlyLinkLimit;
    const userLimitExceeded = plan.userLimit !== -1 && currentUsers > plan.userLimit;
    // For paid plans, prioritize seat limits over link limits
    const isPaidPlan = plan.id !== 'free';
    const canProcessMore = isPaidPlan
        ? !userLimitExceeded // Paid plans: only check user limits
        : !linkLimitExceeded && !userLimitExceeded; // Free plan: check both
    return {
        linkLimitExceeded: isPaidPlan ? false : linkLimitExceeded, // Ignore link limits for paid plans
        userLimitExceeded,
        canProcessMore,
        linkWarning: isPaidPlan ? false : (plan.monthlyLinkLimit !== -1 && currentLinks >= (plan.monthlyLinkLimit * 0.8)), // 80% warning
        userWarning: plan.userLimit !== -1 && currentUsers >= (plan.userLimit * 0.8) // 80% warning
    };
}
async function createStripeCustomer(teamId, teamName, email) {
    if (!exports.stripe) {
        throw new Error('Stripe is not configured');
    }
    const customer = await exports.stripe.customers.create({
        metadata: {
            teamId,
            teamName
        },
        email,
        description: `Slack Team: ${teamName}`
    });
    return customer;
}
async function createCheckoutSession(customerId, priceId, teamId, successUrl, cancelUrl, couponCode) {
    if (!exports.stripe) {
        throw new Error('Stripe is not configured');
    }
    // Build session configuration
    const sessionConfig = {
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
    };
    // Add coupon if provided
    if (couponCode) {
        try {
            // First try to find promotion code
            const promotionCodes = await exports.stripe.promotionCodes.list({
                code: couponCode.trim().toUpperCase(),
                limit: 1
            });
            if (promotionCodes.data.length > 0) {
                // Use promotion code
                sessionConfig.discounts = [{
                        promotion_code: promotionCodes.data[0].id
                    }];
                console.log(`✅ Applied promotion code: ${promotionCodes.data[0].id}`);
            }
            else {
                // Try as coupon ID
                try {
                    const coupon = await exports.stripe.coupons.retrieve(couponCode.trim());
                    if (coupon.valid) {
                        sessionConfig.discounts = [{
                                coupon: coupon.id
                            }];
                        console.log(`✅ Applied coupon: ${coupon.id}`);
                    }
                }
                catch (error) {
                    console.log(`❌ Invalid coupon code: ${couponCode}`);
                    // Don't throw error, just proceed without coupon
                }
            }
        }
        catch (error) {
            console.log(`❌ Failed to apply coupon: ${couponCode}`, error);
            // Don't throw error, just proceed without coupon
        }
    }
    const session = await exports.stripe.checkout.sessions.create(sessionConfig);
    return session;
}
async function createPortalSession(customerId, returnUrl) {
    if (!exports.stripe) {
        throw new Error('Stripe is not configured');
    }
    const session = await exports.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
    });
    return session;
}
function constructWebhookEvent(body, signature) {
    if (!exports.stripe) {
        throw new Error('Stripe is not configured');
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('Stripe webhook secret is not configured');
    }
    return exports.stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
}
