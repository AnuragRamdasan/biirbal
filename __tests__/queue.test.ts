/**
 * Queue System Tests
 * 
 * Comprehensive test suite for the Vercel KV-based queue system.
 * Tests queue client, worker functionality, and error handling.
 */

import { queueClient } from '@/lib/queue/client'
import { processJobs } from '@/lib/queue/worker'

// Mock link processor
jest.mock('@/lib/link-processor', () => ({
  processLink: jest.fn().mockResolvedValue(undefined)
}))

const { kv: mockKV } = require('@vercel/kv')

describe('Queue Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('add', () => {
    it('should add a job to the queue', async () => {
      mockKV.hset.mockResolvedValue('OK')
      mockKV.zadd.mockResolvedValue(1)
      mockKV.incr.mockResolvedValue(1)

      const jobId = await queueClient.add('PROCESS_LINK', {
        url: 'https://example.com',
        messageTs: '123',
        channelId: 'C123',
        teamId: 'T123',
        slackTeamId: 'ST123'
      })

      expect(jobId).toMatch(/^job:\d+:\w+$/)
      expect(mockKV.hset).toHaveBeenCalledWith(
        `job:${jobId}`,
        expect.objectContaining({
          id: jobId,
          type: 'PROCESS_LINK',
          priority: 1,
          maxRetries: 3,
          retryCount: 0
        })
      )
      expect(mockKV.zadd).toHaveBeenCalledWith(
        'queue:pending',
        { score: 1, member: jobId }
      )
      expect(mockKV.incr).toHaveBeenCalledWith('stats:jobs:added')
    })

    it('should accept custom priority and retries', async () => {
      mockKV.hset.mockResolvedValue('OK')
      mockKV.zadd.mockResolvedValue(1)
      mockKV.incr.mockResolvedValue(1)

      const jobId = await queueClient.add('PROCESS_LINK', {
        url: 'https://example.com',
        messageTs: '123',
        channelId: 'C123',
        teamId: 'T123',
        slackTeamId: 'ST123'
      }, {
        priority: 5,
        maxRetries: 1
      })

      expect(mockKV.hset).toHaveBeenCalledWith(
        `job:${jobId}`,
        expect.objectContaining({
          priority: 5,
          maxRetries: 1
        })
      )
    })
  })

  describe('getNext', () => {
    it('should return null when no jobs available', async () => {
      mockKV.zpopmax.mockResolvedValue([])

      const job = await queueClient.getNext('worker-1')

      expect(job).toBeNull()
    })

    it('should return and mark job as processing', async () => {
      const jobId = 'job:123:abc'
      const jobData = {
        id: jobId,
        type: 'PROCESS_LINK',
        data: {
          url: 'https://example.com',
          messageTs: '123',
          channelId: 'C123',
          teamId: 'T123',
          slackTeamId: 'ST123'
        },
        priority: 1,
        maxRetries: 3,
        retryCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      mockKV.zpopmax.mockResolvedValue([{ member: jobId, score: 1 }])
      mockKV.hgetall.mockResolvedValue(jobData)
      mockKV.hset.mockResolvedValue('OK')
      mockKV.zadd.mockResolvedValue(1)

      const job = await queueClient.getNext('worker-1')

      expect(job).toEqual(expect.objectContaining({
        id: jobId,
        type: 'PROCESS_LINK'
      }))
      expect(mockKV.zadd).toHaveBeenCalledWith(
        'queue:processing',
        expect.objectContaining({ member: jobId })
      )
    })
  })

  describe('complete', () => {
    it('should mark job as completed', async () => {
      const jobId = 'job:123:abc'
      mockKV.hset.mockResolvedValue('OK')
      mockKV.zrem.mockResolvedValue(1)
      mockKV.incr.mockResolvedValue(1)

      await queueClient.complete(jobId)

      expect(mockKV.hset).toHaveBeenCalledWith(
        `job:${jobId}`,
        expect.objectContaining({
          completedAt: expect.any(Number),
          updatedAt: expect.any(Number)
        })
      )
      expect(mockKV.zrem).toHaveBeenCalledWith('queue:processing', jobId)
      expect(mockKV.incr).toHaveBeenCalledWith('stats:jobs:completed')
    })
  })

  describe('fail', () => {
    it('should retry job when retries available', async () => {
      const jobId = 'job:123:abc'
      const jobData = {
        id: jobId,
        maxRetries: 3,
        retryCount: 1,
        priority: 1
      }

      mockKV.hgetall.mockResolvedValue(jobData)
      mockKV.zrem.mockResolvedValue(1)
      mockKV.hset.mockResolvedValue('OK')

      await queueClient.fail(jobId, 'Test error', true)

      expect(mockKV.hset).toHaveBeenCalledWith(
        `job:${jobId}`,
        expect.objectContaining({
          retryCount: 2,
          error: 'Test error'
        })
      )
    })

    it('should mark job as permanently failed when max retries reached', async () => {
      const jobId = 'job:123:abc'
      const jobData = {
        id: jobId,
        maxRetries: 3,
        retryCount: 3,
        priority: 1
      }

      mockKV.hgetall.mockResolvedValue(jobData)
      mockKV.zrem.mockResolvedValue(1)
      mockKV.hset.mockResolvedValue('OK')
      mockKV.incr.mockResolvedValue(1)

      await queueClient.fail(jobId, 'Test error', true)

      expect(mockKV.hset).toHaveBeenCalledWith(
        `job:${jobId}`,
        expect.objectContaining({
          completedAt: expect.any(Number),
          error: 'Test error'
        })
      )
      expect(mockKV.incr).toHaveBeenCalledWith('stats:jobs:failed')
    })
  })

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      mockKV.zcard.mockImplementation((key: string) => {
        if (key === 'queue:pending') return Promise.resolve(5)
        if (key === 'queue:processing') return Promise.resolve(2)
        return Promise.resolve(0)
      })
      mockKV.get.mockImplementation((key: string) => {
        if (key === 'stats:jobs:completed') return Promise.resolve('100')
        if (key === 'stats:jobs:failed') return Promise.resolve('10')
        return Promise.resolve('0')
      })

      const stats = await queueClient.getStats()

      expect(stats).toEqual({
        pending: 5,
        processing: 2,
        completed: 100,
        failed: 10,
        avgProcessingTime: 0,
        healthy: true
      })
    })
  })

  describe('cleanup', () => {
    it('should reset stuck jobs', async () => {
      const stuckJobId = 'job:123:stuck'
      const stuckJob = {
        id: stuckJobId,
        maxRetries: 3,
        retryCount: 1,
        priority: 1
      }

      mockKV.zrangebyscore.mockResolvedValue([stuckJobId])
      mockKV.hgetall.mockResolvedValue(stuckJob)
      mockKV.zrem.mockResolvedValue(1)
      mockKV.zadd.mockResolvedValue(1)
      mockKV.hset.mockResolvedValue('OK')

      const result = await queueClient.cleanup()

      expect(result).toEqual({
        cleaned: 0, // TODO: Implement cleanup
        reset: 1
      })
      expect(mockKV.zrem).toHaveBeenCalledWith('queue:processing', stuckJobId)
      expect(mockKV.zadd).toHaveBeenCalledWith(
        'queue:pending',
        { score: 1, member: stuckJobId }
      )
    })
  })
})

describe('Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should process jobs until none available', async () => {
    // First call returns a job, second call returns null
    const jobData = {
      id: 'job:123:abc',
      type: 'PROCESS_LINK',
      data: {
        url: 'https://example.com',
        messageTs: '123',
        channelId: 'C123',
        teamId: 'T123',
        slackTeamId: 'ST123'
      }
    }

    mockKV.zpopmax
      .mockResolvedValueOnce([{ member: 'job:123:abc', score: 1 }])
      .mockResolvedValueOnce([])
    mockKV.hgetall.mockResolvedValue(jobData)
    mockKV.hset.mockResolvedValue('OK')
    mockKV.zadd.mockResolvedValue(1)
    mockKV.zrem.mockResolvedValue(1)
    mockKV.incr.mockResolvedValue(1)

    const { processLink } = require('@/lib/link-processor')
    processLink.mockResolvedValue(undefined)

    const results = await processJobs({
      maxJobs: 5,
      timeout: 10000,
      workerId: 'test-worker'
    })

    expect(results.processed).toBe(1)
    expect(results.completed).toBe(1)
    expect(results.failed).toBe(0)
    expect(processLink).toHaveBeenCalledWith(jobData.data)
  })

  it('should handle job processing errors', async () => {
    const jobData = {
      id: 'job:123:abc',
      type: 'PROCESS_LINK',
      data: {
        url: 'https://example.com',
        messageTs: '123',
        channelId: 'C123',
        teamId: 'T123',
        slackTeamId: 'ST123'
      },
      maxRetries: 3,
      retryCount: 0
    }

    mockKV.zpopmax.mockResolvedValueOnce([{ member: 'job:123:abc', score: 1 }])
    mockKV.hgetall
      .mockResolvedValueOnce(jobData)
      .mockResolvedValueOnce(jobData) // For fail() call
    mockKV.hset.mockResolvedValue('OK')
    mockKV.zadd.mockResolvedValue(1)
    mockKV.zrem.mockResolvedValue(1)

    const { processLink } = require('@/lib/link-processor')
    processLink.mockRejectedValue(new Error('Processing failed'))

    const results = await processJobs({
      maxJobs: 1,
      timeout: 10000,
      workerId: 'test-worker'
    })

    expect(results.processed).toBe(1)
    expect(results.completed).toBe(0)
    expect(results.failed).toBe(1)
    expect(results.jobs[0].error).toBe('Processing failed')
  })

  it('should respect timeout limits', async () => {
    const results = await processJobs({
      maxJobs: 100,
      timeout: 1, // Very short timeout
      workerId: 'test-worker'
    })

    expect(results.processed).toBe(0)
  })

  it('should respect maxJobs limit', async () => {
    // Mock multiple jobs available
    mockKV.zpopmax.mockImplementation(() => 
      Promise.resolve([{ member: `job:${Date.now()}:abc`, score: 1 }])
    )
    mockKV.hgetall.mockResolvedValue({
      id: 'job:123:abc',
      type: 'PROCESS_LINK',
      data: {
        url: 'https://example.com',
        messageTs: '123',
        channelId: 'C123',
        teamId: 'T123',
        slackTeamId: 'ST123'
      }
    })
    mockKV.hset.mockResolvedValue('OK')
    mockKV.zadd.mockResolvedValue(1)
    mockKV.zrem.mockResolvedValue(1)
    mockKV.incr.mockResolvedValue(1)

    const { processLink } = require('@/lib/link-processor')
    processLink.mockResolvedValue(undefined)

    const results = await processJobs({
      maxJobs: 2,
      timeout: 10000,
      workerId: 'test-worker'
    })

    expect(results.processed).toBe(2)
  })
})