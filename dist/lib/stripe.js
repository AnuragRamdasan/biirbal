"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRICING_PLANS = exports.stripe = void 0;
exports.getPlanById = getPlanById;
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
        monthlyLinkLimit: 30,
        userLimit: 2,
        stripePriceId: null
    },
    PRO: {
        id: 'pro',
        name: 'Pro',
        price: 19.99,
        monthlyLinkLimit: 100,
        userLimit: 5,
        stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro'
    },
    ENTERPRISE: {
        id: 'enterprise',
        name: 'Enterprise',
        price: 69.99,
        monthlyLinkLimit: -1, // -1 means unlimited
        userLimit: -1, // -1 means unlimited
        stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise'
    }
};
// Helper function to get plan details
function getPlanById(planId) {
    return Object.values(exports.PRICING_PLANS).find(plan => plan.id === planId);
}
// Helper function to check if usage is within limits
function checkUsageLimits(plan, currentLinks, currentUsers) {
    const linkLimitExceeded = plan.monthlyLinkLimit !== -1 && currentLinks >= plan.monthlyLinkLimit;
    const userLimitExceeded = plan.userLimit !== -1 && currentUsers >= plan.userLimit;
    return {
        linkLimitExceeded,
        userLimitExceeded,
        canProcessMore: !linkLimitExceeded && !userLimitExceeded,
        linkWarning: plan.monthlyLinkLimit !== -1 && currentLinks >= (plan.monthlyLinkLimit * 0.8), // 80% warning
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
async function createCheckoutSession(customerId, priceId, teamId, successUrl, cancelUrl) {
    if (!exports.stripe) {
        throw new Error('Stripe is not configured');
    }
    const session = await exports.stripe.checkout.sessions.create({
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
    });
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
