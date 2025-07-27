"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamUsageStats = getTeamUsageStats;
exports.canUserConsume = canUserConsume;
exports.canAddNewUser = canAddNewUser;
exports.canProcessNewLink = canProcessNewLink;
exports.updateSubscriptionFromStripe = updateSubscriptionFromStripe;
exports.getUpgradeMessage = getUpgradeMessage;
const db_1 = require("./db");
const stripe_1 = require("./stripe");
const exception_teams_1 = require("./exception-teams");
const analytics_1 = require("./analytics");
async function getTeamUsageStats(teamId) {
    const db = await (0, db_1.getDbClient)();
    // Check if this is an exception team first
    const isException = (0, exception_teams_1.isExceptionTeam)(teamId);
    // Get team subscription - teamId is actually the Slack team ID
    const team = await db.team.findUnique({
        where: { slackTeamId: teamId },
        include: {
            subscription: true,
            users: { where: { isActive: true } },
            processedLinks: {
                where: {
                    createdAt: {
                        gte: getFirstDayOfCurrentMonth()
                    }
                }
            }
        }
    });
    if (!team) {
        throw new Error('Team not found');
    }
    const subscription = team.subscription;
    if (!subscription) {
        throw new Error('Team subscription not found');
    }
    // Get plan details
    const plan = (0, stripe_1.getPlanById)(subscription.planId) || stripe_1.PRICING_PLANS.FREE;
    // Calculate current usage
    const currentLinks = team.processedLinks.length;
    const currentUsers = team.users.length;
    // For exception teams, bypass all limits
    if (isException) {
        return {
            currentLinks,
            currentUsers,
            plan,
            canProcessMore: true,
            linkLimitExceeded: false,
            userLimitExceeded: false,
            linkWarning: false,
            userWarning: false,
            linkUsagePercentage: 0,
            userUsagePercentage: 0,
            isExceptionTeam: true
        };
    }
    // Check limits for regular teams
    const limits = (0, stripe_1.checkUsageLimits)(plan, currentLinks, currentUsers);
    // Calculate usage percentages
    const linkUsagePercentage = plan.monthlyLinkLimit === -1 ? 0 :
        Math.round((currentLinks / plan.monthlyLinkLimit) * 100);
    const userUsagePercentage = plan.userLimit === -1 ? 0 :
        Math.round((currentUsers / plan.userLimit) * 100);
    return {
        currentLinks,
        currentUsers,
        plan,
        canProcessMore: limits.canProcessMore,
        linkLimitExceeded: limits.linkLimitExceeded,
        userLimitExceeded: limits.userLimitExceeded,
        linkWarning: limits.linkWarning,
        userWarning: limits.userWarning,
        linkUsagePercentage,
        userUsagePercentage,
        isExceptionTeam: false
    };
}
async function canUserConsume(teamId, userId) {
    try {
        // Exception teams are always allowed
        if ((0, exception_teams_1.isExceptionTeam)(teamId)) {
            return true;
        }
        const db = await (0, db_1.getDbClient)();
        // Get team and user info
        const team = await db.team.findUnique({
            where: { slackTeamId: teamId },
            include: {
                subscription: true,
                users: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'asc' } // First users get priority
                }
            }
        });
        if (!team || !team.subscription) {
            return false;
        }
        const plan = (0, stripe_1.getPlanById)(team.subscription.planId) || stripe_1.PRICING_PLANS.FREE;
        // Free plan or unlimited users plan
        if (plan.id === 'free' || plan.userLimit === -1) {
            return true;
        }
        // Check if user is within the seat limit (first N users get access)
        const userIndex = team.users.findIndex(user => user.slackUserId === userId);
        return userIndex !== -1 && userIndex < plan.userLimit;
    }
    catch (error) {
        console.error('Error checking user consumption access:', error);
        return false;
    }
}
async function canAddNewUser(teamId) {
    try {
        // Exception teams are always allowed
        if ((0, exception_teams_1.isExceptionTeam)(teamId)) {
            return { allowed: true };
        }
        const stats = await getTeamUsageStats(teamId);
        if (stats.userLimitExceeded) {
            return {
                allowed: false,
                reason: `User limit of ${stats.plan.userLimit} reached. Upgrade your plan to add more users.`
            };
        }
        return { allowed: true };
    }
    catch (error) {
        console.error('Error checking if can add user:', error);
        return { allowed: false, reason: 'Unable to verify user limits' };
    }
}
async function canProcessNewLink(teamId, userId) {
    try {
        // Exception teams are always allowed
        if ((0, exception_teams_1.isExceptionTeam)(teamId)) {
            return { allowed: true };
        }
        const stats = await getTeamUsageStats(teamId);
        // For paid plans, only check seat limits
        const isPaidPlan = stats.plan.id !== 'free';
        if (isPaidPlan) {
            // For paid plans, check if user seat limit is exceeded
            if (stats.userLimitExceeded) {
                return {
                    allowed: false,
                    reason: `User limit of ${stats.plan.userLimit} reached. Upgrade your plan to add more users.`
                };
            }
            // If a specific user is provided, check if they have access
            if (userId) {
                const hasAccess = await canUserConsume(teamId, userId);
                if (!hasAccess) {
                    return {
                        allowed: false,
                        reason: 'User access disabled due to seat limit exceeded. Contact admin to upgrade plan.'
                    };
                }
            }
        }
        else {
            // For free plan, check both link and user limits
            if (stats.linkLimitExceeded) {
                return {
                    allowed: false,
                    reason: `Monthly link limit of ${stats.plan.monthlyLinkLimit} reached. Upgrade your plan to process more links.`
                };
            }
            if (stats.userLimitExceeded) {
                return {
                    allowed: false,
                    reason: `User limit of ${stats.plan.userLimit} reached. Upgrade your plan to add more users.`
                };
            }
        }
        return { allowed: true };
    }
    catch (error) {
        console.error('Error checking usage limits:', error);
        return { allowed: false, reason: 'Unable to verify usage limits' };
    }
}
async function updateSubscriptionFromStripe(teamId, stripeSubscriptionId, planId, status) {
    const db = await (0, db_1.getDbClient)();
    const plan = (0, stripe_1.getPlanById)(planId);
    if (!plan) {
        throw new Error(`Invalid plan ID: ${planId}`);
    }
    // Get current subscription to track changes
    const currentSubscription = await db.subscription.findUnique({
        where: { teamId }
    });
    await db.subscription.upsert({
        where: { teamId },
        update: {
            stripeSubscriptionId,
            planId,
            status: mapStripeStatusToSubscriptionStatus(status),
            monthlyLinkLimit: plan.monthlyLinkLimit,
            userLimit: plan.userLimit,
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        },
        create: {
            teamId,
            stripeSubscriptionId,
            planId,
            status: mapStripeStatusToSubscriptionStatus(status),
            monthlyLinkLimit: plan.monthlyLinkLimit,
            userLimit: plan.userLimit,
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
    });
    // Track subscription events
    const mappedStatus = mapStripeStatusToSubscriptionStatus(status);
    if (mappedStatus === 'ACTIVE') {
        // Track subscription started or upgraded
        (0, analytics_1.trackSubscriptionStarted)({
            team_id: teamId,
            plan_type: planId,
            previous_plan: currentSubscription?.planId,
            currency: 'USD',
            value: plan.price || 0
        });
    }
    else if (mappedStatus === 'CANCELED') {
        // Track subscription cancelled
        (0, analytics_1.trackSubscriptionCancelled)({
            team_id: teamId,
            plan_type: planId,
            previous_plan: currentSubscription?.planId,
            currency: 'USD',
            value: plan.price || 0
        });
    }
}
function getFirstDayOfCurrentMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}
function mapStripeStatusToSubscriptionStatus(stripeStatus) {
    switch (stripeStatus) {
        case 'active':
            return 'ACTIVE';
        case 'past_due':
            return 'PAST_DUE';
        case 'canceled':
        case 'cancelled':
            return 'CANCELED';
        case 'incomplete':
            return 'INCOMPLETE';
        case 'incomplete_expired':
            return 'INCOMPLETE_EXPIRED';
        case 'unpaid':
            return 'UNPAID';
        default:
            return 'TRIAL';
    }
}
function getUpgradeMessage(stats) {
    // For paid plans, prioritize seat-based warnings
    const isPaidPlan = stats.plan.id !== 'free';
    if (isPaidPlan) {
        if (stats.userLimitExceeded) {
            if (stats.plan.id === 'starter') {
                return 'Starter plan is for individual use only. Upgrade to Pro for up to 10 team members or Business for unlimited users.';
            }
            if (stats.plan.id === 'pro') {
                return 'You\'ve reached your Pro plan limit of 10 users. Upgrade to Business for unlimited users.';
            }
        }
        if (stats.userWarning) {
            if (stats.plan.id === 'pro') {
                return `You're approaching your user limit (${stats.currentUsers}/${stats.plan.userLimit}). Consider upgrading to Business for unlimited users.`;
            }
        }
    }
    else {
        // Free plan - check both limits but prioritize links
        if (stats.linkLimitExceeded) {
            return 'You\'ve reached your free plan limit of 20 links. Upgrade to Starter for unlimited links.';
        }
        if (stats.userLimitExceeded) {
            return 'You\'ve reached your free plan limit of 1 user. Upgrade to Starter for individual use or Pro for up to 10 team members.';
        }
        if (stats.linkWarning) {
            return `You've used ${stats.linkUsagePercentage}% of your free plan links. Consider upgrading to Starter for unlimited links.`;
        }
        if (stats.userWarning) {
            return `You're approaching your user limit (${stats.currentUsers}/${stats.plan.userLimit}). Consider upgrading for more users.`;
        }
    }
    return null;
}
