import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  setAnalyticsUser,
  trackPageView,
  trackDashboardVisit,
  trackFeatureUsed,
  trackAudioPlayed,
  trackAudioCompleted,
  trackUsageLimit,
  identifyUser
} from '../lib/analytics'
import type {
  AnalyticsUser,
  FeatureUsedEvent,
  AudioPlayedEvent,
  AudioCompletedEvent,
  UsageLimitEvent
} from '../types/analytics'

interface UseAnalyticsOptions {
  user?: AnalyticsUser
  autoTrackPageViews?: boolean
  trackScrollDepth?: boolean
  trackTimeOnPage?: boolean
}

interface AnalyticsHookReturn {
  // User identification
  setUser: (user: AnalyticsUser) => void
  identifyUser: (userId: string, teamId: string, properties?: Record<string, any>) => void
  
  // Page tracking
  trackPage: (url?: string, title?: string) => void
  trackDashboard: (teamId: string, userId?: string, sessionDuration?: number) => void
  
  // Feature tracking
  trackFeature: (featureName: string, context?: Record<string, any>) => void
  
  // Audio tracking
  trackAudioPlay: (linkId: string, duration: number, source: 'dashboard' | 'slack') => void
  trackAudioComplete: (linkId: string, completionPercentage: number, listenDuration: number) => void
  
  // Usage tracking
  trackUsage: (limitType: 'monthly_links' | 'team_users', currentUsage: number, limitValue: number) => void
  
  // Conversion tracking
  trackConversion: (step: string, value?: number) => void
}

export const useAnalytics = (options: UseAnalyticsOptions = {}): AnalyticsHookReturn => {
  const router = useRouter()
  const pageStartTime = useRef<number>(Date.now())
  const currentUser = useRef<AnalyticsUser | undefined>(options.user)
  const scrollDepthRef = useRef<number>(0)
  const maxScrollDepth = useRef<number>(0)

  // Set user on initialization
  useEffect(() => {
    if (options.user) {
      setAnalyticsUser(options.user)
      currentUser.current = options.user
    }
  }, [options.user])

  // Auto track page views
  useEffect(() => {
    if (options.autoTrackPageViews !== false) {
      const handleRouteChange = () => {
        pageStartTime.current = Date.now()
        trackPageView(window.location.href, document.title, currentUser.current)
      }

      // Track initial page view
      handleRouteChange()

      // Listen for route changes (if using Next.js router)
      const originalPush = router.push
      router.push = (...args) => {
        handleRouteChange()
        return originalPush.apply(router, args)
      }

      return () => {
        router.push = originalPush
      }
    }
  }, [router, options.autoTrackPageViews])

  // Track scroll depth
  useEffect(() => {
    if (options.trackScrollDepth) {
      const handleScroll = () => {
        const scrollTop = window.pageYOffset
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        const scrollPercent = Math.round((scrollTop / docHeight) * 100)
        
        if (scrollPercent > maxScrollDepth.current) {
          maxScrollDepth.current = scrollPercent
          
          // Track milestone depths
          if ([25, 50, 75, 90].includes(scrollPercent)) {
            trackFeature(`scroll_depth_${scrollPercent}`, {
              team_id: currentUser.current?.team_id,
              scroll_depth: scrollPercent
            })
          }
        }
      }

      window.addEventListener('scroll', handleScroll, { passive: true })
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [options.trackScrollDepth])

  // Track time on page before unload
  useEffect(() => {
    if (options.trackTimeOnPage) {
      const handleBeforeUnload = () => {
        const timeOnPage = Math.round((Date.now() - pageStartTime.current) / 1000)
        
        if (timeOnPage > 10) { // Only track if spent more than 10 seconds
          trackFeature('time_on_page', {
            team_id: currentUser.current?.team_id,
            duration_seconds: timeOnPage,
            page_path: window.location.pathname,
            max_scroll_depth: maxScrollDepth.current
          })
        }
      }

      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [options.trackTimeOnPage])

  // Hook methods
  const setUser = useCallback((user: AnalyticsUser) => {
    setAnalyticsUser(user)
    currentUser.current = user
  }, [])

  const trackPage = useCallback((url?: string, title?: string) => {
    trackPageView(
      url || window.location.href, 
      title || document.title, 
      currentUser.current
    )
  }, [])

  const trackDashboard = useCallback((teamId: string, userId?: string, sessionDuration?: number) => {
    trackDashboardVisit({
      team_id: teamId,
      user_id: userId,
      page_path: window.location.pathname,
      session_duration_seconds: sessionDuration
    })
  }, [])

  const trackFeature = useCallback((featureName: string, context?: Record<string, any>) => {
    trackFeatureUsed({
      team_id: currentUser.current?.team_id || '',
      feature_name: featureName,
      user_id: currentUser.current?.user_id,
      context
    } as FeatureUsedEvent)
  }, [])

  const trackAudioPlay = useCallback((linkId: string, duration: number, source: 'dashboard' | 'slack') => {
    trackAudioPlayed({
      team_id: currentUser.current?.team_id || '',
      link_id: linkId,
      user_id: currentUser.current?.user_id,
      audio_duration_seconds: duration,
      source
    } as AudioPlayedEvent)
  }, [])

  const trackAudioComplete = useCallback((linkId: string, completionPercentage: number, listenDuration: number) => {
    trackAudioCompleted({
      team_id: currentUser.current?.team_id || '',
      link_id: linkId,
      user_id: currentUser.current?.user_id,
      completion_percentage: completionPercentage,
      listen_duration_seconds: listenDuration
    } as AudioCompletedEvent)
  }, [])

  const trackUsage = useCallback((limitType: 'monthly_links' | 'team_users', currentUsage: number, limitValue: number) => {
    const percentage = limitValue > 0 ? Math.round((currentUsage / limitValue) * 100) : 0
    
    trackUsageLimit({
      team_id: currentUser.current?.team_id || '',
      limit_type: limitType,
      current_usage: currentUsage,
      limit_value: limitValue,
      percentage_reached: percentage
    } as UsageLimitEvent)
  }, [])

  const trackConversion = useCallback((step: string, value?: number) => {
    trackFeature(`conversion_${step}`, {
      team_id: currentUser.current?.team_id,
      conversion_step: step,
      conversion_value: value
    })
  }, [])

  return {
    setUser,
    identifyUser,
    trackPage,
    trackDashboard,
    trackFeature,
    trackAudioPlay,
    trackAudioComplete,
    trackUsage,
    trackConversion
  }
}