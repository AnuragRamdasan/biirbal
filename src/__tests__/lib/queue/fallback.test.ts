import { processFallback, shouldUseFallback } from '@/lib/queue/fallback'

// Mock dependencies
jest.mock('@/lib/link-processor', () => ({
  processLink: jest.fn().mockResolvedValue(undefined)
}))

describe('Fallback Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('processFallback', () => {
    it('should process link directly when queue is unavailable', async () => {
      const jobData = {
        url: 'https://example.com',
        messageTs: '1234567890.123456',
        channelId: 'C123',
        teamId: 'team123',
        slackTeamId: 'T123'
      }

      // Should not throw an error
      await expect(processFallback(jobData)).resolves.toBeUndefined()
      
      const { processLink } = require('@/lib/link-processor')
      expect(processLink).toHaveBeenCalledWith(jobData)
    })

    it('should handle processing errors and retry', async () => {
      const { processLink } = require('@/lib/link-processor')
      processLink.mockRejectedValue(new Error('Processing failed'))

      const jobData = {
        url: 'https://example.com',
        messageTs: '1234567890.123456',
        channelId: 'C123',
        teamId: 'team123',
        slackTeamId: 'T123'
      }

      // Should not throw an error even when processing fails
      await expect(processFallback(jobData)).resolves.toBeUndefined()
      
      expect(processLink).toHaveBeenCalledWith(jobData)
    })
  })

  describe('shouldUseFallback', () => {
    it('should return true when REDIS_URL is not set', () => {
      const originalRedisUrl = process.env.REDIS_URL
      delete process.env.REDIS_URL
      
      const result = shouldUseFallback()
      
      expect(result).toBe(true)
      
      // Restore original value
      if (originalRedisUrl) {
        process.env.REDIS_URL = originalRedisUrl
      }
    })

    it('should return false when REDIS_URL is set', () => {
      const originalRedisUrl = process.env.REDIS_URL
      process.env.REDIS_URL = 'redis://localhost:6379'
      
      const result = shouldUseFallback()
      
      expect(result).toBe(false)
      
      // Restore original value
      if (originalRedisUrl) {
        process.env.REDIS_URL = originalRedisUrl
      } else {
        delete process.env.REDIS_URL
      }
    })
  })
})