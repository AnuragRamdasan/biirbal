"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugAnalytics = exports.trackEvents = exports.identifyUser = exports.trackConversion = exports.trackPageView = exports.trackViewItem = exports.trackPurchase = exports.trackFeatureUsed = exports.trackUsageLimit = exports.trackDashboardVisit = exports.trackAudioCompleted = exports.trackAudioPlayed = exports.trackLinkProcessed = exports.trackLinkShared = exports.trackSubscriptionCancelled = exports.trackSubscriptionStarted = exports.trackTeamOnboarded = exports.trackSignUp = exports.trackEvent = exports.setAnalyticsUser = void 0;
const analytics_1 = require("../types/analytics");
// Check if analytics is enabled and available
const isAnalyticsEnabled = () => {
    return (typeof window !== 'undefined' &&
        'gtag' in window &&
        typeof window.gtag === 'function' &&
        process.env.NODE_ENV === 'production' &&
        !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
};
// Set user properties for enhanced tracking
const setAnalyticsUser = (user) => {
    if (!isAnalyticsEnabled())
        return;
    window.gtag('set', {
        user_id: user.user_id,
        custom_map: {
            team_id: user.team_id,
            plan_type: user.plan_type,
            team_size: user.team_size,
            monthly_usage: user.monthly_usage,
            usage_percentage: user.usage_percentage,
            is_exception_team: user.is_exception_team
        }
    });
};
exports.setAnalyticsUser = setAnalyticsUser;
// Generic event tracking function
const trackEvent = (eventName, eventData) => {
    if (!isAnalyticsEnabled()) {
        console.log('Analytics (dev):', eventName, eventData);
        return;
    }
    ;
    window.gtag('event', eventName, {
        ...eventData,
        send_to: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    });
};
exports.trackEvent = trackEvent;
// Specific tracking functions for better type safety
const trackSignUp = (data) => {
    (0, exports.trackEvent)(analytics_1.AnalyticsEventName.SIGN_UP, {
        ...data,
        event_category: 'user_journey'
    });
};
exports.trackSignUp = trackSignUp;
const trackTeamOnboarded = (data) => {
    (0, exports.trackEvent)(analytics_1.AnalyticsEventName.TEAM_ONBOARDED, {
        ...data,
        event_category: 'user_journey',
        value: data.time_to_onboard_minutes
    });
};
exports.trackTeamOnboarded = trackTeamOnboarded;
const trackSubscriptionStarted = (data) => {
    (0, exports.trackEvent)(analytics_1.AnalyticsEventName.SUBSCRIPTION_STARTED, {
        ...data,
        event_category: 'conversion'
    });
};
exports.trackSubscriptionStarted = trackSubscriptionStarted;
const trackSubscriptionCancelled = (data) => {
    (0, exports.trackEvent)(analytics_1.AnalyticsEventName.SUBSCRIPTION_CANCELLED, {
        ...data,
        event_category: 'churn'
    });
};
exports.trackSubscriptionCancelled = trackSubscriptionCancelled;
const trackLinkShared = (data) => {
    (0, exports.trackEvent)(analytics_1.AnalyticsEventName.LINK_SHARED, {
        ...data,
        event_category: 'product_usage'
    });
};
exports.trackLinkShared = trackLinkShared;
const trackLinkProcessed = (data) => {
    (0, exports.trackEvent)(analytics_1.AnalyticsEventName.LINK_PROCESSED, {
        ...data,
        event_category: 'product_usage',
        value: data.processing_time_seconds
    });
};
exports.trackLinkProcessed = trackLinkProcessed;
const trackAudioPlayed = (data) => {
    (0, exports.trackEvent)(analytics_1.AnalyticsEventName.AUDIO_PLAYED, {
        ...data,
        event_category: 'engagement',
        value: data.audio_duration_seconds
    });
};
exports.trackAudioPlayed = trackAudioPlayed;
const trackAudioCompleted = (data) => {
    (0, exports.trackEvent)(analytics_1.AnalyticsEventName.AUDIO_COMPLETED, {
        ...data,
        event_category: 'engagement',
        value: data.completion_percentage
    });
};
exports.trackAudioCompleted = trackAudioCompleted;
const trackDashboardVisit = (data) => {
    (0, exports.trackEvent)(analytics_1.AnalyticsEventName.DASHBOARD_VISIT, {
        ...data,
        event_category: 'navigation'
    });
};
exports.trackDashboardVisit = trackDashboardVisit;
const trackUsageLimit = (data) => {
    const eventName = data.percentage_reached >= 100
        ? analytics_1.AnalyticsEventName.MONTHLY_LIMIT_REACHED
        : data.percentage_reached >= 80
            ? analytics_1.AnalyticsEventName.HEAVY_USAGE
            : analytics_1.AnalyticsEventName.LOW_USAGE;
    (0, exports.trackEvent)(eventName, {
        ...data,
        event_category: 'usage_patterns',
        value: data.percentage_reached
    });
};
exports.trackUsageLimit = trackUsageLimit;
const trackFeatureUsed = (data) => {
    (0, exports.trackEvent)(analytics_1.AnalyticsEventName.FEATURE_USED, {
        ...data,
        event_category: 'feature_usage',
        event_label: data.feature_name
    });
};
exports.trackFeatureUsed = trackFeatureUsed;
const trackPurchase = (data) => {
    (0, exports.trackEvent)(analytics_1.AnalyticsEventName.PURCHASE, {
        ...data,
        event_category: 'ecommerce'
    });
};
exports.trackPurchase = trackPurchase;
const trackViewItem = (data) => {
    (0, exports.trackEvent)(analytics_1.AnalyticsEventName.VIEW_ITEM, {
        ...data,
        event_category: 'ecommerce'
    });
};
exports.trackViewItem = trackViewItem;
// Enhanced page view tracking with SaaS context
const trackPageView = (url, title, user) => {
    if (!isAnalyticsEnabled())
        return;
    // Set user properties if provided
    if (user) {
        (0, exports.setAnalyticsUser)({
            plan_type: 'free',
            team_size: 1,
            monthly_usage: 0,
            usage_percentage: 0,
            is_exception_team: false,
            ...user
        });
    }
    ;
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
        page_title: title,
        page_location: url,
        custom_map: {
            team_id: user?.team_id,
            plan_type: user?.plan_type
        }
    });
};
exports.trackPageView = trackPageView;
// Conversion tracking helpers
const trackConversion = (conversionId, value, currency = 'USD') => {
    if (!isAnalyticsEnabled())
        return;
    window.gtag('event', 'conversion', {
        send_to: conversionId,
        value: value,
        currency: currency
    });
};
exports.trackConversion = trackConversion;
// User identification for cross-session tracking
const identifyUser = (userId, teamId, properties) => {
    if (!isAnalyticsEnabled())
        return;
    window.gtag('set', {
        user_id: `${teamId}_${userId}`,
        custom_map: {
            team_id: teamId,
            slack_user_id: userId,
            ...properties
        }
    });
};
exports.identifyUser = identifyUser;
// Batch event tracking for performance
const trackEvents = (events) => {
    events.forEach(({ name, data }) => {
        (0, exports.trackEvent)(name, data);
    });
};
exports.trackEvents = trackEvents;
// Debug function for development
const debugAnalytics = () => {
    if (typeof window !== 'undefined') {
        console.log('Analytics Debug Info:', {
            gtagAvailable: !!window.gtag,
            measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
            nodeEnv: process.env.NODE_ENV,
            dataLayer: window.dataLayer
        });
    }
};
exports.debugAnalytics = debugAnalytics;
