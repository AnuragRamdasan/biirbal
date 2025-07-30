import { NextRequest } from 'next/server'
import { GET } from '@/app/api/slack/oauth/route'

describe('/api/slack/oauth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle successful OAuth flow', async () => {
    const url = new URL('http://localhost:3000/api/slack/oauth?code=test_code&state=test_state')
    const request = new NextRequest(url, {
      method: 'GET'
    })
    
    const response = await GET(request)
    
    expect([302, 307]).toContain(response.status) // Redirect (Next.js can use either 302 or 307)
    expect(response.headers.get('location')).toMatch(/installed=true&teamId=T123/)
  })

  it('should handle OAuth errors', async () => {
    // Mock Slack OAuth to fail for both calls (with and without redirect_uri)
    global.mockSlackWebClient.oauth.v2.access
      .mockRejectedValueOnce(new Error('Invalid code'))
      .mockRejectedValueOnce(new Error('Invalid code'))
    
    const url = new URL('http://localhost:3000/api/slack/oauth?code=invalid_code')
    const request = new NextRequest(url, {
      method: 'GET'
    })
    
    const response = await GET(request)
    
    expect([302, 307]).toContain(response.status) // Redirect to error page (Next.js can use either 302 or 307)
    expect(response.headers.get('location')).toMatch(/\?error=/)
  })

  it('should handle missing code parameter', async () => {
    const url = new URL('http://localhost:3000/api/slack/oauth')
    const request = new NextRequest(url, {
      method: 'GET'
    })
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing authorization code')
  })
})