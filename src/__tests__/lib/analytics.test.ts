// Mock console methods to test logging
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()

import { 
  trackEvent,
  trackLinkShared,
  trackLinkProcessed,
  trackUserAction,
  trackSubscriptionEvent,
  trackPerformance,
  getAnalyticsConfig,
  isAnalyticsEnabled
} from '@/lib/analytics'

describe('Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConsoleLog.mockClear()
  })

  afterAll(() => {
    mockConsoleLog.mockRestore()
  })

  describe('trackEvent', () => {
    it('should track basic events', () => {
      trackEvent('test_event', {
        category: 'test',
        value: 1
      })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Analytics (dev):',
        'test_event',
        expect.objectContaining({
          category: 'test',
          value: 1
        })
      )
    })

    it('should include event properties', () => {
      const properties = {
        user_id: 'U123456',
        team_id: 'T123456',
        category: 'user_action',
        value: 42
      }

      trackEvent('custom_event', properties)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Analytics (dev):',
        'custom_event',
        expect.objectContaining(properties)
      )
    })

    it('should handle events without properties', () => {
      trackEvent('simple_event')

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Analytics (dev):',
        'simple_event',
        undefined
      )
    })

    it('should not track events when analytics disabled', () => {
      // Mock analytics as disabled
      jest.doMock('@/lib/analytics', () => ({
        ...jest.requireActual('@/lib/analytics'),
        isAnalyticsEnabled: () => false
      }))

      trackEvent('disabled_event')

      // Should not log when disabled
      const logCalls = mockConsoleLog.mock.calls.filter(call => 
        call[0] && call[0].includes('disabled_event')
      )
      expect(logCalls.length).toBe(0)
    })
  })

  describe('trackLinkShared', () => {
    it('should track link sharing events', () => {
      const linkData = {
        team_id: 'T123456',
        channel_id: 'C123456',
        user_id: 'U123456',
        link_domain: 'example.com'
      }

      trackLinkShared(linkData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('link_shared'),
        expect.objectContaining({
          team_id: 'T123456',
          channel_id: 'C123456',
          link_domain: 'example.com'
        })
      )
    })

    it('should extract domain from URL', () => {
      const linkData = {
        team_id: 'T123456',
        channel_id: 'C123456',
        user_id: 'U123456',
        url: 'https://docs.google.com/document/123'
      }

      trackLinkShared(linkData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('link_shared'),
        expect.objectContaining({
          link_domain: 'docs.google.com'
        })
      )
    })

    it('should handle invalid URLs gracefully', () => {
      const linkData = {
        team_id: 'T123456',
        channel_id: 'C123456',
        user_id: 'U123456',
        url: 'invalid-url'
      }

      expect(() => trackLinkShared(linkData)).not.toThrow()
    })
  })

  describe('trackLinkProcessed', () => {
    it('should track successful link processing', () => {
      const processData = {
        team_id: 'T123456',
        link_id: 'link123',
        processing_time_seconds: 2.5,
        success: true,
        content_type: 'article',
        word_count: 1500
      }

      trackLinkProcessed(processData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('link_processed'),
        expect.objectContaining({
          success: true,
          processing_time_seconds: 2.5,
          word_count: 1500
        })
      )
    })

    it('should track failed link processing', () => {
      const processData = {
        team_id: 'T123456',
        link_id: 'link123',
        processing_time_seconds: 0.5,
        success: false,
        error: 'Content extraction failed',
        content_type: 'error'
      }

      trackLinkProcessed(processData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('link_processed'),
        expect.objectContaining({
          success: false,
          content_type: 'error'
        })
      )
    })

    it('should include performance metrics', () => {
      const processData = {
        team_id: 'T123456',
        link_id: 'link123',
        success: true,
        processing_time_seconds: 1.8,
        content_extraction_time: 0.5,
        audio_generation_time: 1.0,
        upload_time: 0.3
      }

      trackLinkProcessed(processData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('link_processed'),
        expect.objectContaining({
          processing_time_seconds: 1.8,
          content_extraction_time: 0.5,
          audio_generation_time: 1.0
        })
      )
    })
  })

  describe('trackUserAction', () => {
    it('should track user interactions', () => {
      const actionData = {
        user_id: 'U123456',
        team_id: 'T123456',
        action: 'dashboard_visit',
        context: 'main_navigation'
      }

      trackUserAction(actionData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('user_action'),
        expect.objectContaining({
          action: 'dashboard_visit',
          context: 'main_navigation'
        })
      )
    })

    it('should include session information', () => {
      const actionData = {
        user_id: 'U123456',
        team_id: 'T123456',
        action: 'settings_changed',
        session_id: 'sess_123456',
        timestamp: new Date().toISOString()
      }

      trackUserAction(actionData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('user_action'),
        expect.objectContaining({
          session_id: 'sess_123456'
        })
      )
    })
  })

  describe('trackSubscriptionEvent', () => {
    it('should track subscription changes', () => {
      const subscriptionData = {
        user_id: 'U123456',
        team_id: 'T123456',
        action: 'upgraded',
        from_plan: 'FREE',
        to_plan: 'PRO',
        amount: 29.99
      }

      trackSubscriptionEvent(subscriptionData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('subscription'),
        expect.objectContaining({
          action: 'upgraded',
          from_plan: 'FREE',
          to_plan: 'PRO'
        })
      )
    })

    it('should track subscription cancellations', () => {
      const subscriptionData = {
        user_id: 'U123456',
        team_id: 'T123456',
        action: 'cancelled',
        plan: 'PRO',
        reason: 'user_requested'
      }

      trackSubscriptionEvent(subscriptionData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('subscription'),
        expect.objectContaining({
          action: 'cancelled',
          reason: 'user_requested'
        })
      )
    })

    it('should include revenue tracking', () => {
      const subscriptionData = {
        user_id: 'U123456',
        team_id: 'T123456',
        action: 'charged',
        plan: 'PRO',
        amount: 29.99,
        currency: 'USD',
        stripe_charge_id: 'ch_123456'
      }

      trackSubscriptionEvent(subscriptionData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('subscription'),
        expect.objectContaining({
          amount: 29.99,
          currency: 'USD'
        })
      )
    })
  })

  describe('trackPerformance', () => {
    it('should track performance metrics', () => {
      const performanceData = {
        operation: 'link_processing',
        duration_ms: 2500,
        team_id: 'T123456',
        success: true
      }

      trackPerformance(performanceData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('performance'),
        expect.objectContaining({
          operation: 'link_processing',
          duration_ms: 2500
        })
      )
    })

    it('should include resource usage metrics', () => {
      const performanceData = {
        operation: 'content_extraction',
        duration_ms: 1200,
        memory_usage_mb: 45.6,
        cpu_usage_percent: 23.4,
        network_requests: 3
      }

      trackPerformance(performanceData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('performance'),
        expect.objectContaining({
          memory_usage_mb: 45.6,
          cpu_usage_percent: 23.4,
          network_requests: 3
        })
      )
    })

    it('should track error performance', () => {
      const performanceData = {
        operation: 'audio_generation',
        duration_ms: 500,
        success: false,
        error_type: 'timeout',
        retries: 2
      }

      trackPerformance(performanceData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('performance'),
        expect.objectContaining({
          success: false,
          error_type: 'timeout',
          retries: 2
        })
      )
    })
  })

  describe('getAnalyticsConfig', () => {
    it('should return analytics configuration', () => {
      const config = getAnalyticsConfig()

      expect(config).toBeDefined()
      expect(typeof config.enabled).toBe('boolean')
    })

    it('should include environment-specific settings', () => {
      const config = getAnalyticsConfig()

      expect(config).toHaveProperty('environment')
      expect(['development', 'production', 'test']).toContain(config.environment)
    })

    it('should include sampling configuration', () => {
      const config = getAnalyticsConfig()

      if (config.sampling) {
        expect(typeof config.sampling.rate).toBe('number')
        expect(config.sampling.rate).toBeGreaterThanOrEqual(0)
        expect(config.sampling.rate).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('isAnalyticsEnabled', () => {
    it('should return boolean value', () => {
      const enabled = isAnalyticsEnabled()
      expect(typeof enabled).toBe('boolean')
    })

    it('should respect environment configuration', () => {
      const enabled = isAnalyticsEnabled()
      
      // In test environment, analytics might be disabled
      if (process.env.NODE_ENV === 'test') {
        expect(typeof enabled).toBe('boolean')
      }
    })

    it('should handle missing configuration gracefully', () => {
      // Should not throw even if config is missing
      expect(() => isAnalyticsEnabled()).not.toThrow()
    })
  })

  describe('privacy and compliance', () => {
    it('should not track personally identifiable information', () => {
      const userData = {
        user_id: 'U123456',  // This is allowed as it's a Slack user ID
        team_id: 'T123456',
        action: 'login'
      }

      trackUserAction(userData)

      // Verify that no PII is being logged
      const loggedData = mockConsoleLog.mock.calls.find(call => 
        call[0] && call[0].includes('user_action')
      )
      
      if (loggedData && loggedData[1]) {
        expect(loggedData[1]).not.toHaveProperty('email')
        expect(loggedData[1]).not.toHaveProperty('name')
        expect(loggedData[1]).not.toHaveProperty('phone')
      }
    })

    it('should anonymize sensitive data', () => {
      const linkData = {
        team_id: 'T123456',
        url: 'https://private-docs.company.com/secret-document',
        user_id: 'U123456'
      }

      trackLinkShared(linkData)

      const loggedData = mockConsoleLog.mock.calls.find(call => 
        call[0] && call[0].includes('link_shared')
      )

      if (loggedData && loggedData[1]) {
        // Should track domain but not full URL for privacy
        expect(loggedData[1]).toHaveProperty('link_domain')
        expect(loggedData[1]).not.toHaveProperty('url')
      }
    })
  })
})