// Mock bull-client before importing queue client
jest.mock('@/lib/queue/bull-client', () => ({
  queueClient: {
    add: jest.fn().mockResolvedValue('job-123'),
    getStatus: jest.fn().mockResolvedValue({ id: 'job-123', status: 'completed' }),
    getStats: jest.fn().mockResolvedValue({
      pending: 0,
      processing: 0,
      completed: 10,
      failed: 0,
      avgProcessingTime: 250,
      healthy: true
    }),
    cleanup: jest.fn().mockResolvedValue({ cleaned: 5, reset: 0 }),
    healthCheck: jest.fn().mockResolvedValue({
      healthy: true,
      issues: [],
      stats: {
        pending: 0,
        processing: 0, 
        completed: 10,
        failed: 0,
        avgProcessingTime: 250,
        healthy: true
      }
    })
  }
}))

// Mock fallback module
jest.mock('@/lib/queue/fallback', () => ({
  processFallback: jest.fn().mockResolvedValue({ success: true })
}))

import { queueClient } from '@/lib/queue/client'

describe('Queue Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('add', () => {
    it('should add job to queue successfully', async () => {
      const jobData = {
        url: 'https://example.com',
        messageTs: '123.456',
        channelId: 'C123',
        teamId: 'T123',
        slackTeamId: 'T123'
      }

      const result = await queueClient.add('PROCESS_LINK', jobData)
      
      expect(result).toBe('job-123')
    })

    it('should fallback to direct processing when Bull fails', async () => {
      const bullClient = require('@/lib/queue/bull-client').queueClient
      bullClient.add.mockRejectedValueOnce(new Error('Bull unavailable'))

      const jobData = {
        url: 'https://example.com',
        messageTs: '123.456',
        channelId: 'C123',
        teamId: 'T123',
        slackTeamId: 'T123'
      }

      const result = await queueClient.add('PROCESS_LINK', jobData)
      
      expect(result).toMatch(/^fallback-/)
    })
  })

  describe('getStatus', () => {
    it('should return job status', async () => {
      const status = await queueClient.getStatus('job-123')
      
      expect(status).toEqual({ id: 'job-123', status: 'completed' })
    })

    it('should return null when status check fails', async () => {
      const bullClient = require('@/lib/queue/bull-client').queueClient
      bullClient.getStatus.mockRejectedValueOnce(new Error('Status check failed'))

      const status = await queueClient.getStatus('job-123')
      
      expect(status).toBeNull()
    })
  })

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      const stats = await queueClient.getStats()
      
      expect(stats).toEqual({
        pending: 0,
        processing: 0,
        completed: 10,
        failed: 0,
        avgProcessingTime: 250,
        healthy: true
      })
    })

    it('should return default stats when Bull fails', async () => {
      const bullClient = require('@/lib/queue/bull-client').queueClient
      bullClient.getStats.mockRejectedValueOnce(new Error('Stats unavailable'))

      const stats = await queueClient.getStats()
      
      expect(stats).toEqual({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
        healthy: false
      })
    })
  })

  describe('cleanup', () => {
    it('should perform cleanup successfully', async () => {
      const result = await queueClient.cleanup()
      
      expect(result).toEqual({ cleaned: 5, reset: 0 })
    })

    it('should return default result when cleanup fails', async () => {
      const bullClient = require('@/lib/queue/bull-client').queueClient
      bullClient.cleanup.mockRejectedValueOnce(new Error('Cleanup failed'))

      const result = await queueClient.cleanup()
      
      expect(result).toEqual({ cleaned: 0, reset: 0 })
    })
  })

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const health = await queueClient.healthCheck()
      
      expect(health.healthy).toBe(true)
      expect(health.issues).toEqual([])
    })

    it('should return unhealthy status when check fails', async () => {
      const bullClient = require('@/lib/queue/bull-client').queueClient
      bullClient.healthCheck.mockRejectedValueOnce(new Error('Health check failed'))

      const health = await queueClient.healthCheck()
      
      expect(health.healthy).toBe(false)
      expect(health.issues).toEqual(['Health check failed'])
    })
  })
})