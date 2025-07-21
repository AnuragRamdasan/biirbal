// Analytics event types for Google Analytics 4 tracking

export interface AnalyticsUser {
  team_id?: string
  user_id?: string
  plan_type: 'free' | 'pro' | 'enterprise'
  team_size: number
  monthly_usage: number
  usage_percentage: number
  is_exception_team: boolean
}

export interface BaseAnalyticsEvent {
  event_category?: string
  event_label?: string
  value?: number
}

// User Journey Events
export interface SignUpEvent extends BaseAnalyticsEvent {
  team_id: string
  source?: 'slack_app_directory' | 'website' | 'referral'
}

export interface TeamOnboardedEvent extends BaseAnalyticsEvent {
  team_id: string
  time_to_onboard_minutes: number
}

export interface SubscriptionEvent extends BaseAnalyticsEvent {
  team_id: string
  plan_type: 'pro' | 'enterprise'
  previous_plan?: 'free' | 'pro'
  currency: string
  value: number
}

// Core Product Events
export interface LinkSharedEvent extends BaseAnalyticsEvent {
  team_id: string
  channel_id: string
  link_domain: string
  user_id: string
}

export interface LinkProcessedEvent extends BaseAnalyticsEvent {
  team_id: string
  link_id: string
  processing_time_seconds: number
  success: boolean
  content_type?: string
  word_count?: number
}

export interface AudioPlayedEvent extends BaseAnalyticsEvent {
  team_id: string
  link_id: string
  user_id?: string
  audio_duration_seconds: number
  source: 'dashboard' | 'slack'
}

export interface AudioCompletedEvent extends BaseAnalyticsEvent {
  team_id: string
  link_id: string
  user_id?: string
  completion_percentage: number
  listen_duration_seconds: number
}

export interface DashboardVisitEvent extends BaseAnalyticsEvent {
  team_id: string
  user_id?: string
  page_path: string
  session_duration_seconds?: number
}

// Usage Pattern Events
export interface UsageLimitEvent extends BaseAnalyticsEvent {
  team_id: string
  limit_type: 'monthly_links' | 'team_users'
  current_usage: number
  limit_value: number
  percentage_reached: number
}

export interface FeatureUsedEvent extends BaseAnalyticsEvent {
  team_id: string
  feature_name: string
  user_id?: string
  context?: Record<string, any>
}

// Enhanced E-commerce Events
export interface PurchaseEvent extends BaseAnalyticsEvent {
  transaction_id: string
  value: number
  currency: string
  items: Array<{
    item_id: string
    item_name: string
    item_category: string
    price: number
    quantity: number
  }>
}

export interface ViewItemEvent extends BaseAnalyticsEvent {
  currency: string
  value: number
  items: Array<{
    item_id: string
    item_name: string
    item_category: string
    price: number
  }>
}

// Union type for all possible events
export type AnalyticsEvent = 
  | SignUpEvent
  | TeamOnboardedEvent 
  | SubscriptionEvent
  | LinkSharedEvent
  | LinkProcessedEvent
  | AudioPlayedEvent
  | AudioCompletedEvent
  | DashboardVisitEvent
  | UsageLimitEvent
  | FeatureUsedEvent
  | PurchaseEvent
  | ViewItemEvent

// Event names enum for consistency
export enum AnalyticsEventName {
  // User Journey
  SIGN_UP = 'sign_up',
  TEAM_ONBOARDED = 'team_onboarded',
  SUBSCRIPTION_STARTED = 'subscription_started',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  
  // Core Product
  LINK_SHARED = 'link_shared',
  LINK_PROCESSED = 'link_processed',
  AUDIO_PLAYED = 'audio_played',
  AUDIO_COMPLETED = 'audio_completed',
  DASHBOARD_VISIT = 'dashboard_visit',
  
  // Usage Patterns
  MONTHLY_LIMIT_REACHED = 'monthly_limit_reached',
  HEAVY_USAGE = 'heavy_usage',
  LOW_USAGE = 'low_usage',
  FEATURE_USED = 'feature_used',
  
  // E-commerce
  PURCHASE = 'purchase',
  VIEW_ITEM = 'view_item',
  ADD_TO_CART = 'add_to_cart',
  BEGIN_CHECKOUT = 'begin_checkout'
}

// Global gtag interface extension
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'set',
      targetId: string,
      config?: any
    ) => void
    dataLayer: any[]
  }
}


// Export to make this a module
export {}