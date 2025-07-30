import { GET } from '@/app/api/health/queue/route'

// Mock queue client
jest.mock('@/lib/queue/client', () => ({
  queueClient: {
    getStats: jest.fn().mockResolvedValue({
      waiting: 5,
      active: 2,
      completed: 100,
      failed: 3,
      delayed: 0
    })
  }
}))

// Mock worker health check
jest.mock('@/lib/queue/bull-worker', () => ({
  workerHealthCheck: jest.fn().mockResolvedValue({
    healthy: true,
    redis: { connected: true },
    queueName: 'link processing',
    concurrency: 2,
    issues: []
  })
}))

describe('/api/health/queue', () => {
  it('should return 200 when queue is healthy', async () => {
    const response = await GET()
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.health.healthy).toBe(true)
    expect(data.health.queue.stats).toEqual({
      waiting: 5,
      active: 2,
      completed: 100,
      failed: 3,
      delayed: 0
    })
  })

  it('should return 500 when queue health check fails', async () => {
    const { queueClient } = require('@/lib/queue/client')
    queueClient.getStats.mockRejectedValueOnce(new Error('Redis connection failed'))
    
    const response = await GET()
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Redis connection failed')
  })

  it('should return 503 when queue is unhealthy', async () => {
    const { workerHealthCheck } = require('@/lib/queue/bull-worker')
    workerHealthCheck.mockResolvedValueOnce({
      healthy: false,
      redis: { connected: false },
      queueName: 'link processing',
      concurrency: 2,
      issues: ['Redis connection lost']
    })
    
    const response = await GET()
    const data = await response.json()
    
    expect(response.status).toBe(503)
    expect(data.success).toBe(true)
    expect(data.health.healthy).toBe(false)
  })
})