import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/queue/worker/route'

// Mock worker functions
jest.mock('@/lib/queue/bull-worker', () => ({
  processJobs: jest.fn().mockResolvedValue({
    processed: 5,
    failed: 1,
    duration: 1500
  }),
  workerHealthCheck: jest.fn().mockResolvedValue({
    healthy: true,
    issues: [],
    uptime: 3600
  })
}))

describe('/api/queue/worker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should process queue jobs successfully', async () => {
    const response = await POST()
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.results).toEqual({
      processed: 5,
      failed: 1,
      duration: 1500
    })
  })

  it('should handle worker errors gracefully', async () => {
    const { processJobs } = require('@/lib/queue/bull-worker')
    processJobs.mockRejectedValueOnce(new Error('Worker failed'))
    
    const response = await POST()
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Worker failed')
  })

  it('should return health check successfully', async () => {
    const response = await GET()
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.health).toEqual({
      healthy: true,
      issues: [],
      uptime: 3600
    })
  })

  it('should handle health check errors gracefully', async () => {
    const { workerHealthCheck } = require('@/lib/queue/bull-worker')
    workerHealthCheck.mockRejectedValueOnce(new Error('Health check failed'))
    
    const response = await GET()
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Health check failed')
  })
})