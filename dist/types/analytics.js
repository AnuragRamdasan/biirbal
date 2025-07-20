"use strict";
// Analytics event types for Google Analytics 4 tracking
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsEventName = void 0;
// Event names enum for consistency
var AnalyticsEventName;
(function (AnalyticsEventName) {
    // User Journey
    AnalyticsEventName["SIGN_UP"] = "sign_up";
    AnalyticsEventName["TEAM_ONBOARDED"] = "team_onboarded";
    AnalyticsEventName["SUBSCRIPTION_STARTED"] = "subscription_started";
    AnalyticsEventName["SUBSCRIPTION_CANCELLED"] = "subscription_cancelled";
    // Core Product
    AnalyticsEventName["LINK_SHARED"] = "link_shared";
    AnalyticsEventName["LINK_PROCESSED"] = "link_processed";
    AnalyticsEventName["AUDIO_PLAYED"] = "audio_played";
    AnalyticsEventName["AUDIO_COMPLETED"] = "audio_completed";
    AnalyticsEventName["DASHBOARD_VISIT"] = "dashboard_visit";
    // Usage Patterns
    AnalyticsEventName["MONTHLY_LIMIT_REACHED"] = "monthly_limit_reached";
    AnalyticsEventName["HEAVY_USAGE"] = "heavy_usage";
    AnalyticsEventName["LOW_USAGE"] = "low_usage";
    AnalyticsEventName["FEATURE_USED"] = "feature_used";
    // E-commerce
    AnalyticsEventName["PURCHASE"] = "purchase";
    AnalyticsEventName["VIEW_ITEM"] = "view_item";
    AnalyticsEventName["ADD_TO_CART"] = "add_to_cart";
    AnalyticsEventName["BEGIN_CHECKOUT"] = "begin_checkout";
})(AnalyticsEventName || (exports.AnalyticsEventName = AnalyticsEventName = {}));
