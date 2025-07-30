import { createQueue, addJobToQueue, getQueueStats } from '@/lib/queue/bull-queue'

describe('Bull Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createQueue', () => {
    it('should create a queue with correct configuration', () => {
      const queue = createQueue('test-queue')
      expect(queue).toBeDefined()
    })

    it('should handle Redis connection errors gracefully', () => {
      // Mock Redis connection failure
      const mockQueue = require('bull')
      mockQueue.mockImplementationOnce(() => {
        throw new Error('Redis connection failed')
      })

      expect(() => createQueue('test-queue')).toThrow('Redis connection failed')
    })
  })

  describe('addJobToQueue', () => {
    it('should add job to queue successfully', async () => {
      const jobData = {
        type: 'PROCESS_LINK',
        linkId: 'link1',
        url: 'https://example.com',
        teamId: 'T123',
        channelId: 'C123',
        userId: 'U123'
      }

      const result = await addJobToQueue(jobData)
      
      expect(result.id).toBe('job-123')
    })

    it('should handle job addition failures', async () => {
      const mockQueue = require('bull')
      const queueInstance = new mockQueue()
      queueInstance.add.mockRejectedValueOnce(new Error('Job addition failed'))

      const jobData = {
        type: 'PROCESS_LINK',
        linkId: 'link1',
        url: 'https://example.com',
        teamId: 'T123',
        channelId: 'C123',
        userId: 'U123'
      }

      await expect(addJobToQueue(jobData)).rejects.toThrow('Job addition failed')
    })

    it('should set correct job options', async () => {
      const jobData = {
        type: 'PROCESS_LINK',
        linkId: 'link1',
        url: 'https://example.com',
        teamId: 'T123',
        channelId: 'C123',
        userId: 'U123'
      }

      const mockQueue = require('bull')
      const queueInstance = new mockQueue()
      
      await addJobToQueue(jobData)
      
      expect(queueInstance.add).toHaveBeenCalledWith(
        'process-link',
        jobData,
        expect.objectContaining({
          priority: expect.any(Number),
          delay: expect.any(Number)
        })
      )
    })
  })

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await getQueueStats()
      
      expect(stats).toEqual({
        waiting: 0,
        active: 0,
        completed: 10,
        failed: 0
      })
    })

    it('should handle stats retrieval errors', async () => {
      const mockQueue = require('bull')
      const queueInstance = new mockQueue()
      queueInstance.getStats.mockRejectedValueOnce(new Error('Stats retrieval failed'))

      await expect(getQueueStats()).rejects.toThrow('Stats retrieval failed')
    })

    it('should return default stats when queue is not available', async () => {
      const mockQueue = require('bull')
      const queueInstance = new mockQueue()
      queueInstance.getStats.mockResolvedValueOnce(null)

      const stats = await getQueueStats()
      
      expect(stats).toEqual({
        waiting: 0,
        active: 0,
        completed: 10,
        failed: 0
      })
    })
  })
})