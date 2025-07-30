import { GET } from '@/app/api/health/db/route'

// Mock database health check
jest.mock('@/lib/db', () => ({
  dbHealthCheck: jest.fn().mockResolvedValue(true)
}))

describe('/api/health/db', () => {
  it('should return 200 when database is healthy', async () => {
    const response = await GET()
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.healthy).toBe(true)
  })

  it('should return 503 when database connection fails', async () => {
    const { dbHealthCheck } = require('@/lib/db')
    dbHealthCheck.mockRejectedValueOnce(new Error('Connection failed'))
    
    const response = await GET()
    const data = await response.json()
    
    expect(response.status).toBe(503)
    expect(data.healthy).toBe(false)
  })
})