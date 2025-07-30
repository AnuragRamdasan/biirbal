import { NextRequest } from 'next/server'
import { GET } from '@/app/api/dashboard/usage/route'

// Mock subscription utils
jest.mock('@/lib/subscription-utils', () => ({
  getTeamUsageStats: jest.fn(),
  getUpgradeMessage: jest.fn(),
  canUserConsume: jest.fn()
}))

describe('/api/dashboard/usage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    const { getTeamUsageStats, getUpgradeMessage, canUserConsume } = require('@/lib/subscription-utils')
    
    getTeamUsageStats.mockResolvedValue({
      currentLinks: 45,
      currentUsers: 3,
      plan: { id: 'starter', name: 'Starter' },
      canProcessMore: true,
      linkLimitExceeded: false,
      userLimitExceeded: false,
      linkWarning: false,
      userWarning: false,
      linkUsagePercentage: 45,
      userUsagePercentage: 30,
      isExceptionTeam: false
    })
    
    getUpgradeMessage.mockResolvedValue(null)
    canUserConsume.mockResolvedValue(true)
  })

  it('should return usage stats for authenticated team', async () => {
    const url = new URL('http://localhost:3000/api/dashboard/usage?teamId=T123')
    const request = new NextRequest(url, {
      method: 'GET'
    })
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.currentLinks).toBe(45)
    expect(data.currentUsers).toBe(3)
    expect(data.plan).toEqual({ id: 'starter', name: 'Starter' })
  })

  it('should return 400 for missing teamId', async () => {
    const url = new URL('http://localhost:3000/api/dashboard/usage')
    const request = new NextRequest(url, {
      method: 'GET'
    })
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('teamId is required')
  })

  it('should return 500 for non-existent team', async () => {
    const { getTeamUsageStats } = require('@/lib/subscription-utils')
    getTeamUsageStats.mockRejectedValueOnce(new Error('Team not found'))
    
    const url = new URL('http://localhost:3000/api/dashboard/usage?teamId=T999')
    const request = new NextRequest(url, {
      method: 'GET'
    })
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to get usage stats')
  })

  it('should handle database errors', async () => {
    const { getTeamUsageStats } = require('@/lib/subscription-utils')
    getTeamUsageStats.mockRejectedValueOnce(new Error('Database error'))
    
    const url = new URL('http://localhost:3000/api/dashboard/usage?teamId=T123')
    const request = new NextRequest(url, {
      method: 'GET'
    })
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to get usage stats')
  })
})