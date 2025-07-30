// Mock email service
jest.mock('@/lib/email-service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' })
}))

import { 
  sendAdminNotification,
  notifyAdminOfError,
  notifyAdminOfNewUser,
  notifyAdminOfSubscription,
  notifyAdminOfUsageLimit,
  formatErrorForAdmin,
  formatUserInfoForAdmin
} from '@/lib/admin-notifications'

describe('Admin Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendAdminNotification', () => {
    it('should send notification via Slack', async () => {
      const result = await sendAdminNotification({
        message: 'Test admin notification',
        channel: 'admin-alerts',
        priority: 'medium'
      })

      expect(result.success).toBe(true)
      expect(result.method).toBe('slack')
    })

    it('should fallback to email when Slack fails', async () => {
      // Create a new WebClient instance that will fail
      global.mockSlackWebClient.chat.postMessage.mockRejectedValueOnce(new Error('Slack API error'))

      const result = await sendAdminNotification({
        message: 'Test admin notification',
        channel: 'admin-alerts',
        priority: 'high'
      })

      expect(result.success).toBe(true)
      expect(result.method).toBe('email')
    })

    it('should handle high priority notifications', async () => {
      await sendAdminNotification({
        message: 'Critical system error',
        priority: 'high'
      })

      expect(global.mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('🚨')
        })
      )
    })

    it('should include metadata in notifications', async () => {
      const metadata = {
        userId: 'U123456',
        teamId: 'T123456',
        timestamp: new Date().toISOString()
      }

      await sendAdminNotification({
        message: 'User action notification',
        metadata
      })

      expect(global.mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('U123456')
        })
      )
    })
  })

  describe('notifyAdminOfError', () => {
    it('should format and send error notification', async () => {
      const error = new Error('Database connection failed')
      const context = {
        function: 'processLink',
        userId: 'U123456',
        teamId: 'T123456'
      }

      const result = await notifyAdminOfError(error, context)

      expect(result.success).toBe(true)
      
      expect(global.mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Database connection failed')
        })
      )
    })

    it('should include stack trace for critical errors', async () => {
      const error = new Error('Critical system failure')
      error.stack = 'Error: Critical system failure\\n    at processLink (file.js:123:45)'

      await notifyAdminOfError(error, { severity: 'critical' })

      expect(global.mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('file.js:123:45')
        })
      )
    })

    it('should rate limit error notifications', async () => {
      const error = new Error('Repeated error')
      const context = { function: 'testFunction' }

      // Send multiple identical errors quickly
      await notifyAdminOfError(error, context)
      await notifyAdminOfError(error, context)
      await notifyAdminOfError(error, context)

      // Should only send notification once due to rate limiting
      expect(global.mockSlackWebClient.chat.postMessage).toHaveBeenCalledTimes(1)
    })
  })

  describe('notifyAdminOfNewUser', () => {
    it('should send new user notification', async () => {
      const userInfo = {
        id: 'U123456',
        email: 'newuser@example.com',
        name: 'John Doe',
        teamId: 'T123456',
        teamName: 'Acme Corp'
      }

      const result = await notifyAdminOfNewUser(userInfo)

      expect(result.success).toBe(true)
      
      expect(global.mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('John Doe')
        })
      )
    })

    it('should include team information in notification', async () => {
      const userInfo = {
        id: 'U123456',
        email: 'user@acme.com',
        name: 'Jane Smith',
        teamId: 'T123456',
        teamName: 'Acme Corp',
        teamDomain: 'acme'
      }

      await notifyAdminOfNewUser(userInfo)

      expect(global.mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Acme Corp')
        })
      )
    })
  })

  describe('notifyAdminOfSubscription', () => {
    it('should send subscription notification', async () => {
      const subscriptionInfo = {
        userId: 'U123456',
        teamId: 'T123456',
        plan: 'PRO',
        action: 'upgraded',
        amount: 29.99
      }

      const result = await notifyAdminOfSubscription(subscriptionInfo)

      expect(result.success).toBe(true)
      
      expect(global.mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('PRO')
        })
      )
    })

    it('should handle subscription cancellations', async () => {
      const subscriptionInfo = {
        userId: 'U123456',
        teamId: 'T123456',
        plan: 'PRO',
        action: 'cancelled',
        reason: 'User requested'
      }

      await notifyAdminOfSubscription(subscriptionInfo)

      expect(global.mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('cancelled')
        })
      )
    })
  })

  describe('notifyAdminOfUsageLimit', () => {
    it('should send usage limit notification', async () => {
      const usageInfo = {
        teamId: 'T123456',
        teamName: 'Acme Corp',
        currentUsage: 950,
        limit: 1000,
        percentage: 95
      }

      const result = await notifyAdminOfUsageLimit(usageInfo)

      expect(result.success).toBe(true)
      
      expect(global.mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('95%')
        })
      )
    })

    it('should escalate when usage exceeds limit', async () => {
      const usageInfo = {
        teamId: 'T123456',
        teamName: 'Acme Corp',
        currentUsage: 1050,
        limit: 1000,
        percentage: 105
      }

      await notifyAdminOfUsageLimit(usageInfo)

      expect(global.mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('🚨')
        })
      )
    })
  })

  describe('formatErrorForAdmin', () => {
    it('should format error with context', () => {
      const error = new Error('Test error')
      const context = {
        function: 'testFunction',
        userId: 'U123456',
        data: { key: 'value' }
      }

      const formatted = formatErrorForAdmin(error, context)

      expect(formatted).toContain('Test error')
      expect(formatted).toContain('testFunction')
      expect(formatted).toContain('U123456')
    })

    it('should handle errors without stack traces', () => {
      const error = new Error('Simple error')
      delete error.stack

      const formatted = formatErrorForAdmin(error)

      expect(formatted).toContain('Simple error')
      expect(typeof formatted).toBe('string')
    })

    it('should truncate very long error messages', () => {
      const longMessage = 'Error: ' + 'x'.repeat(2000)
      const error = new Error(longMessage)

      const formatted = formatErrorForAdmin(error)

      expect(formatted.length).toBeLessThan(1500)
      expect(formatted).toContain('...')
    })
  })

  describe('formatUserInfoForAdmin', () => {
    it('should format user information', () => {
      const userInfo = {
        id: 'U123456',
        name: 'John Doe',
        email: 'john@example.com',
        teamId: 'T123456',
        teamName: 'Acme Corp'
      }

      const formatted = formatUserInfoForAdmin(userInfo)

      expect(formatted).toContain('John Doe')
      expect(formatted).toContain('john@example.com')
      expect(formatted).toContain('Acme Corp')
    })

    it('should handle missing user information', () => {
      const userInfo = {
        id: 'U123456'
      }

      const formatted = formatUserInfoForAdmin(userInfo)

      expect(formatted).toContain('U123456')
      expect(typeof formatted).toBe('string')
    })

    it('should format team information when available', () => {
      const userInfo = {
        id: 'U123456',
        name: 'Jane Smith',
        teamId: 'T123456',
        teamName: 'Test Team',
        teamDomain: 'testteam'
      }

      const formatted = formatUserInfoForAdmin(userInfo)

      expect(formatted).toContain('Test Team')
      expect(formatted).toContain('testteam')
    })
  })
})