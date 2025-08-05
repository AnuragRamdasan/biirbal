"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamUsageStats = getTeamUsageStats;
exports.canUserConsume = canUserConsume;
exports.canAddNewUser = canAddNewUser;
exports.canProcessNewLink = canProcessNewLink;
exports.canUserListen = canUserListen;
exports.updateSubscriptionFromStripe = updateSubscriptionFromStripe;
exports.getUpgradeMessage = getUpgradeMessage;
exports.getCurrentPlan = getCurrentPlan;
exports.canProcessMoreLinks = canProcessMoreLinks;
exports.canAddMoreUsers = canAddMoreUsers;
exports.updateSubscription = updateSubscription;
exports.cancelSubscription = cancelSubscription;
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
            memberships: {
                where: { isActive: true },
                include: { user: true },
                orderBy: { joinedAt: 'asc' }
            },
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
    // Get plan details - use subscription's actual limits, not default plan limits
    const basePlan = (0, stripe_1.getPlanById)(subscription.planId) || stripe_1.PRICING_PLANS.FREE;
    const plan = {
        ...basePlan,
        monthlyLinkLimit: subscription.monthlyLinkLimit,
        userLimit: subscription.userLimit
    };
    // Calculate current usage
    const currentLinks = team.processedLinks.length;
    const currentUsers = team.memberships.filter(membership => membership.isActive).length;
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
        if ((0, exception_teams_1.isExceptionTeam)(teamId)) {
            return true;
        }
        const db = await (0, db_1.getDbClient)();
        const membership = await db.teamMembership.findFirst({
            where: {
                user: { id: userId },
                team: { slackTeamId: teamId }
            }
        });
        if (!membership?.isActive) {
            return false;
        }
        const team = await db.team.findUnique({
            where: { slackTeamId: teamId },
            include: {
                subscription: true,
                memberships: {
                    where: { isActive: true },
                    orderBy: { joinedAt: 'asc' }
                }
            }
        });
        if (!team?.subscription) {
            return false;
        }
        const basePlan = (0, stripe_1.getPlanById)(team.subscription.planId) || stripe_1.PRICING_PLANS.FREE;
        const plan = {
            ...basePlan,
            monthlyLinkLimit: team.subscription.monthlyLinkLimit,
            userLimit: team.subscription.userLimit
        };
        // For paid plans with unlimited users, allow access
        if (plan.userLimit === -1) {
            return true;
        }
        // For all plans with user limits (including free), check seat limits
        const userIndex = team.memberships.findIndex(m => m.userId === userId);
        const withinUserLimit = userIndex !== -1 && userIndex < plan.userLimit;
        // Free plans also need to check link limits
        if (plan.id === 'free') {
            const currentDate = new Date();
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const monthlyLinks = await db.processedLink.count({
                where: {
                    teamId: team.id,
                    createdAt: {
                        gte: firstDayOfMonth
                    }
                }
            });
            const withinLinkLimit = plan.monthlyLinkLimit === -1 || monthlyLinks < plan.monthlyLinkLimit;
            return withinUserLimit && withinLinkLimit;
        }
        // For paid plans with user limits, only check user limits
        return withinUserLimit;
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
function createLimitResponse(allowed, reason) {
    return { allowed, ...(reason && { reason }) };
}
async function canProcessNewLink(teamId, userId) {
    try {
        // CRITICAL: Link processing should ALWAYS be unlimited for ALL plans
        // Free plans: unlimited link processing, but listen access limited after 20 links
        // Paid plans: unlimited link processing and listen access (subject to user limits only)
        // This ensures unlimited link processing as per business requirements
        if ((0, exception_teams_1.isExceptionTeam)(teamId)) {
            return createLimitResponse(true);
        }
        // ALL PLANS: NEVER block link processing - it's always unlimited
        // Link limits and user limits only affect listen access, not link processing
        return createLimitResponse(true);
    }
    catch (error) {
        console.error('Error checking usage limits:', error);
        return createLimitResponse(false, 'Unable to verify usage limits');
    }
}
async function canUserListen(teamId, userId) {
    try {
        // Exception teams have unlimited access
        if ((0, exception_teams_1.isExceptionTeam)(teamId)) {
            return createLimitResponse(true);
        }
        const stats = await getTeamUsageStats(teamId);
        const isPaidPlan = stats.plan.id !== 'free';
        if (isPaidPlan) {
            if (stats.userLimitExceeded) {
                return createLimitResponse(false, `User limit of ${stats.plan.userLimit} reached. Upgrade your plan to add more users.`);
            }
            if (userId && !(await canUserConsume(teamId, userId))) {
                return createLimitResponse(false, 'User access disabled due to seat limit exceeded. Contact admin to upgrade plan.');
            }
        }
        else {
            // Free plan checks both link and user limits for listening
            if (stats.linkLimitExceeded) {
                return createLimitResponse(false, `Monthly link limit of ${stats.plan.monthlyLinkLimit} reached. Upgrade your plan to process more links.`);
            }
            if (stats.userLimitExceeded) {
                return createLimitResponse(false, `User limit of ${stats.plan.userLimit} reached. Upgrade your plan to add more users.`);
            }
        }
        return createLimitResponse(true);
    }
    catch (error) {
        console.error('Error checking user listen access:', error);
        return createLimitResponse(false, 'Unable to verify usage limits');
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
const UPGRADE_MESSAGES = {
    STARTER_USER_LIMIT: 'Starter plan is for individual use only. Upgrade to Pro for up to 10 team members or Business for unlimited users.',
    PRO_USER_LIMIT: 'You\'ve reached your Pro plan limit of 10 users. Upgrade to Business for unlimited users.',
    FREE_LINK_LIMIT: 'You\'ve reached your free plan limit of 20 links. Upgrade to Starter for unlimited links.',
    FREE_USER_LIMIT: 'You\'ve reached your free plan limit of 1 user. Upgrade to Starter for individual use or Pro for up to 10 team members.'
};
function getPaidPlanMessage(stats) {
    if (stats.userLimitExceeded) {
        return stats.plan.id === 'starter' ? UPGRADE_MESSAGES.STARTER_USER_LIMIT :
            stats.plan.id === 'pro' ? UPGRADE_MESSAGES.PRO_USER_LIMIT : null;
    }
    if (stats.userWarning && stats.plan.id === 'pro') {
        return `You're approaching your user limit (${stats.currentUsers}/${stats.plan.userLimit}). Consider upgrading to Business for unlimited users.`;
    }
    return null;
}
function getFreePlanMessage(stats) {
    if (stats.linkLimitExceeded)
        return UPGRADE_MESSAGES.FREE_LINK_LIMIT;
    if (stats.userLimitExceeded)
        return UPGRADE_MESSAGES.FREE_USER_LIMIT;
    if (stats.linkWarning)
        return `You've used ${stats.linkUsagePercentage}% of your free plan links. Consider upgrading to Starter for unlimited links.`;
    if (stats.userWarning)
        return `You're approaching your user limit (${stats.currentUsers}/${stats.plan.userLimit}). Consider upgrading for more users.`;
    return null;
}
function getUpgradeMessage(stats) {
    const isPaidPlan = stats.plan.id !== 'free';
    return isPaidPlan ? getPaidPlanMessage(stats) : getFreePlanMessage(stats);
}
// Additional functions expected by tests
async function getCurrentPlan(teamId) {
    try {
        const stats = await getTeamUsageStats(teamId);
        return stats.plan;
    }
    catch (error) {
        return stripe_1.PRICING_PLANS.FREE;
    }
}
async function canProcessMoreLinks(teamId) {
    try {
        const result = await canProcessNewLink(teamId);
        return result.allowed;
    }
    catch (error) {
        return false;
    }
}
async function canAddMoreUsers(teamId) {
    try {
        const result = await canAddNewUser(teamId);
        return result.allowed;
    }
    catch (error) {
        return false;
    }
}
async function updateSubscription(teamId, data) {
    try {
        const db = await (0, db_1.getDbClient)();
        await db.subscription.upsert({
            where: { teamId },
            update: {
                ...(data.planId && { planId: data.planId }),
                ...(data.status && { status: data.status }),
                ...(data.stripeCustomerId && { stripeCustomerId: data.stripeCustomerId }),
                ...(data.stripeSubscriptionId && { stripeSubscriptionId: data.stripeSubscriptionId })
            },
            create: {
                teamId,
                planId: data.planId || 'free',
                status: data.status || 'ACTIVE',
                stripeCustomerId: data.stripeCustomerId,
                stripeSubscriptionId: data.stripeSubscriptionId,
                monthlyLinkLimit: 20,
                userLimit: 1,
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
async function cancelSubscription(teamId) {
    try {
        const db = await (0, db_1.getDbClient)();
        await db.subscription.update({
            where: { teamId },
            data: {
                status: 'CANCELED',
                planId: 'free',
                monthlyLinkLimit: 20,
                userLimit: 1
            }
        });
        (0, analytics_1.trackSubscriptionCancelled)({
            team_id: teamId,
            plan_type: 'free',
            previous_plan: undefined,
            currency: 'USD',
            value: 0
        });
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
