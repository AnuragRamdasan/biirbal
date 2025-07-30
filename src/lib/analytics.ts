import { 
  AnalyticsEventName
} from '../types/analytics'
import type { 
  AnalyticsEvent, 
  AnalyticsUser,
  SignUpEvent,
  TeamOnboardedEvent,
  SubscriptionEvent,
  LinkSharedEvent,
  LinkProcessedEvent,
  AudioPlayedEvent,
  AudioCompletedEvent,
  DashboardVisitEvent,
  UsageLimitEvent,
  FeatureUsedEvent,
  PurchaseEvent,
  ViewItemEvent
} from '../types/analytics'

// Check if analytics is enabled and available
export const isAnalyticsEnabled = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    'gtag' in window &&
    typeof window.gtag === 'function' &&
    process.env.NODE_ENV === 'production' &&
    !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  )
}

// Set user properties for enhanced tracking
export const setAnalyticsUser = (user: AnalyticsUser): void => {
  if (!isAnalyticsEnabled()) return

  ;(window as any).gtag('set', {
    user_id: user.user_id,
    custom_map: {
      team_id: user.team_id,
      plan_type: user.plan_type,
      team_size: user.team_size,
      monthly_usage: user.monthly_usage,
      usage_percentage: user.usage_percentage,
      is_exception_team: user.is_exception_team
    }
  })
}

// Generic event tracking function
export const trackEvent = (
  eventName: AnalyticsEventName | string,
  eventData?: AnalyticsEvent | any
): void => {
  if (!isAnalyticsEnabled()) {
    console.log('Analytics (dev):', eventName, eventData)
    return
  }

  ;(window as any).gtag('event', eventName, {
    ...eventData,
    send_to: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  })
}

// Specific tracking functions for better type safety

export const trackSignUp = (data: SignUpEvent): void => {
  trackEvent(AnalyticsEventName.SIGN_UP, {
    ...data,
    event_category: 'user_journey'
  })
}

export const trackTeamOnboarded = (data: TeamOnboardedEvent): void => {
  trackEvent(AnalyticsEventName.TEAM_ONBOARDED, {
    ...data,
    event_category: 'user_journey',
    value: data.time_to_onboard_minutes
  })
}

export const trackSubscriptionStarted = (data: SubscriptionEvent): void => {
  trackEvent(AnalyticsEventName.SUBSCRIPTION_STARTED, {
    ...data,
    event_category: 'conversion'
  })
}

export const trackSubscriptionCancelled = (data: SubscriptionEvent): void => {
  trackEvent(AnalyticsEventName.SUBSCRIPTION_CANCELLED, {
    ...data,
    event_category: 'churn'
  })
}

export const trackLinkShared = (data: any): void => {
  // Extract domain from URL if provided
  let processedData = { ...data }
  if (data.url && !data.link_domain) {
    try {
      const url = new URL(data.url)
      processedData.link_domain = url.hostname
      // Remove full URL for privacy
      delete processedData.url
    } catch (error) {
      // Handle invalid URLs gracefully
    }
  }
  
  if (!isAnalyticsEnabled()) {
    console.log('Analytics (dev): link_shared', processedData)
    return
  }
  
  trackEvent('link_shared' as AnalyticsEventName, {
    ...processedData,
    event_category: 'product_usage'
  })
}

export const trackLinkProcessed = (data: any): void => {
  if (!isAnalyticsEnabled()) {
    console.log('Analytics (dev): link_processed', data)
    return
  }
  
  trackEvent('link_processed' as AnalyticsEventName, {
    ...data,
    event_category: 'product_usage',
    value: data.processing_time_seconds
  })
}

export const trackAudioPlayed = (data: AudioPlayedEvent): void => {
  trackEvent(AnalyticsEventName.AUDIO_PLAYED, {
    ...data,
    event_category: 'engagement',
    value: data.audio_duration_seconds
  })
}

export const trackAudioCompleted = (data: AudioCompletedEvent): void => {
  trackEvent(AnalyticsEventName.AUDIO_COMPLETED, {
    ...data,
    event_category: 'engagement',
    value: data.completion_percentage
  })
}

export const trackDashboardVisit = (data: DashboardVisitEvent): void => {
  trackEvent(AnalyticsEventName.DASHBOARD_VISIT, {
    ...data,
    event_category: 'navigation'
  })
}

export const trackUsageLimit = (data: UsageLimitEvent): void => {
  const eventName = data.percentage_reached >= 100 
    ? AnalyticsEventName.MONTHLY_LIMIT_REACHED
    : data.percentage_reached >= 80
    ? AnalyticsEventName.HEAVY_USAGE
    : AnalyticsEventName.LOW_USAGE

  trackEvent(eventName, {
    ...data,
    event_category: 'usage_patterns',
    value: data.percentage_reached
  })
}

export const trackFeatureUsed = (data: FeatureUsedEvent): void => {
  trackEvent(AnalyticsEventName.FEATURE_USED, {
    ...data,
    event_category: 'feature_usage',
    event_label: data.feature_name
  })
}

export const trackPurchase = (data: PurchaseEvent): void => {
  trackEvent(AnalyticsEventName.PURCHASE, {
    ...data,
    event_category: 'ecommerce'
  })
}

export const trackViewItem = (data: ViewItemEvent): void => {
  trackEvent(AnalyticsEventName.VIEW_ITEM, {
    ...data,
    event_category: 'ecommerce'
  })
}

// Enhanced page view tracking with SaaS context
export const trackPageView = (
  url: string, 
  title?: string, 
  user?: Partial<AnalyticsUser>
): void => {
  if (!isAnalyticsEnabled()) return

  // Set user properties if provided
  if (user) {
    setAnalyticsUser({
      plan_type: 'free',
      team_size: 1,
      monthly_usage: 0,
      usage_percentage: 0,
      is_exception_team: false,
      ...user
    } as AnalyticsUser)
  }

  ;(window as any).gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!, {
    page_title: title,
    page_location: url,
    custom_map: {
      team_id: user?.team_id,
      plan_type: user?.plan_type
    }
  })
}

// Conversion tracking helpers
export const trackConversion = (
  conversionId: string,
  value?: number,
  currency: string = 'USD'
): void => {
  if (!isAnalyticsEnabled()) return

  ;(window as any).gtag('event', 'conversion', {
    send_to: conversionId,
    value: value,
    currency: currency
  })
}

// User identification for cross-session tracking
export const identifyUser = (
  userId: string, 
  teamId: string,
  properties?: Record<string, any>
): void => {
  if (!isAnalyticsEnabled()) return

  ;(window as any).gtag('set', {
    user_id: `${teamId}_${userId}`,
    custom_map: {
      team_id: teamId,
      slack_user_id: userId,
      ...properties
    }
  })
}

// Batch event tracking for performance
export const trackEvents = (
  events: Array<{ name: AnalyticsEventName; data?: AnalyticsEvent }>
): void => {
  events.forEach(({ name, data }) => {
    trackEvent(name, data)
  })
}

// Debug function for development
export const debugAnalytics = (): void => {
  if (typeof window !== 'undefined') {
    console.log('Analytics Debug Info:', {
      gtagAvailable: !!(window as any).gtag,
      measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
      nodeEnv: process.env.NODE_ENV,
      dataLayer: (window as any).dataLayer
    })
  }
}

// Additional functions expected by tests
export const trackUserAction = (data: any): void => {
  if (!isAnalyticsEnabled()) {
    console.log('Analytics (dev): user_action', data)
    return
  }
  
  trackEvent('user_action' as AnalyticsEventName, {
    ...data,
    event_category: 'user_interaction'
  })
}

export const trackSubscriptionEvent = (data: any): void => {
  if (!isAnalyticsEnabled()) {
    console.log('Analytics (dev): subscription', data)
    return
  }
  
  trackEvent('subscription' as AnalyticsEventName, {
    ...data,
    event_category: 'subscription'
  })
}

export const trackPerformance = (data: any): void => {
  if (!isAnalyticsEnabled()) {
    console.log('Analytics (dev): performance', data)
    return
  }
  
  trackEvent('performance' as AnalyticsEventName, {
    ...data,
    event_category: 'performance'
  })
}

export interface AnalyticsConfig {
  enabled: boolean
  environment: string
  sampling?: {
    rate: number
  }
}

export const getAnalyticsConfig = (): AnalyticsConfig => {
  return {
    enabled: isAnalyticsEnabled(),
    environment: process.env.NODE_ENV || 'development',
    sampling: {
      rate: 1.0
    }
  }
}