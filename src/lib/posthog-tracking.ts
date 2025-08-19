'use client'

import posthog from 'posthog-js'

// High-value conversion events for Biirbal.ai
export const CONVERSION_EVENTS = {
  // User Acquisition & Onboarding
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  SLACK_TEAM_INSTALLED: 'slack_team_installed',
  EXTENSION_INSTALLED: 'extension_installed',
  
  // Product Usage (Activation)
  FIRST_LINK_SAVED: 'first_link_saved',
  LINK_PROCESSED: 'link_processed',
  AUDIO_PLAYED: 'audio_played',
  AUDIO_COMPLETED: 'audio_completed',
  
  // Revenue & Subscription (Revenue)
  SUBSCRIPTION_STARTED: 'subscription_started',
  PAYMENT_SUCCESSFUL: 'payment_successful',
  UPGRADE_PLAN: 'upgrade_plan',
  
  // Retention & Engagement
  DAILY_ACTIVE_USER: 'daily_active_user',
  WEEKLY_ACTIVE_USER: 'weekly_active_user',
  TEAM_MEMBER_INVITED: 'team_member_invited',
  TEAM_MEMBER_JOINED: 'team_member_joined',
  
  // Product Features
  EXTENSION_LINK_SAVED: 'extension_link_saved',
  SLACK_LINK_SHARED: 'slack_link_shared',
  DASHBOARD_VISITED: 'dashboard_visited',
  PRICING_PAGE_VISITED: 'pricing_page_visited',
} as const

export type ConversionEvent = typeof CONVERSION_EVENTS[keyof typeof CONVERSION_EVENTS]

interface EventProperties {
  [key: string]: any
}

export const trackConversion = (event: ConversionEvent, properties?: EventProperties) => {
  if (typeof window === 'undefined') {
    return // Skip server-side
  }

  try {
    const enrichedProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer,
    }
    
    // Check if PostHog is initialized
    if (posthog && posthog.__loaded) {
      posthog.capture(event, enrichedProperties)
    }
  } catch (error) {
    // Silent fail
  }
}

// User identification for better tracking
export const identifyUser = (userId: string, properties?: EventProperties) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (posthog && posthog.__loaded) {
      posthog.identify(userId, properties)
    }
  } catch (error) {
    // Silent fail
  }
}

// Set user properties
export const setUserProperties = (properties: EventProperties) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (posthog && posthog.__loaded) {
      posthog.people.set(properties)
    }
  } catch (error) {
    // Silent fail
  }
}

// Track page views
export const trackPageView = (pageName?: string) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const properties = {
      page: pageName || window.location.pathname,
      title: document.title,
    }
    
    if (posthog && posthog.__loaded) {
      posthog.capture('$pageview', properties)
    }
  } catch (error) {
    // Silent fail
  }
}