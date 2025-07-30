import { NextRequest } from 'next/server'
import { POST } from '@/app/api/slack/events/route'
import crypto from 'crypto'

// Mock the link processor
jest.mock('@/lib/link-processor', () => ({
  processLinkInBackground: jest.fn()
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    team: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123',
        isActive: true,
        subscription: {
          monthlyLinkLimit: 100,
          updatedAt: new Date()
        }
      })
    },
    channel: {
      upsert: jest.fn().mockResolvedValue({ id: 'channel1' })
    }
  }
}))

describe('/api/slack/events', () => {
  beforeEach(() => {
    process.env.SLACK_SIGNING_SECRET = 'test_signing_secret'
  })

  const createMockRequest = (body: string, timestamp?: string) => {
    const ts = timestamp || Math.floor(Date.now() / 1000).toString()
    const hmac = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET!)
    hmac.update(`v0:${ts}:${body}`)
    const signature = `v0=${hmac.digest('hex')}`

    return new NextRequest('http://localhost:3000/api/slack/events', {
      method: 'POST',
      body,
      headers: {
        'x-slack-signature': signature,
        'x-slack-request-timestamp': ts,
        'content-type': 'application/json'
      }
    })
  }

  it('should handle URL verification challenge', async () => {
    const challengeEvent = {
      type: 'url_verification',
      challenge: 'test_challenge_123'
    }
    
    const body = JSON.stringify(challengeEvent)
    const request = createMockRequest(body)
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.challenge).toBe('test_challenge_123')
  })

  it('should process message events with links', async () => {
    const messageEvent = {
      type: 'event_callback',
      team_id: 'T123',
      event: {
        type: 'message',
        text: 'Check out this article: https://example.com/article',
        channel: 'C123',
        ts: '1234567890.123',
        user: 'U123'
      }
    }
    
    const body = JSON.stringify(messageEvent)
    const request = createMockRequest(body)
    
    const response = await POST(request)
    
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('should ignore bot messages', async () => {
    const botMessageEvent = {
      type: 'event_callback',
      team_id: 'T123',
      event: {
        type: 'message',
        text: 'Bot message with link: https://example.com/article',
        channel: 'C123',
        ts: '1234567890.123',
        bot_id: 'B123',
        user: 'U123'
      }
    }
    
    const body = JSON.stringify(botMessageEvent)
    const request = createMockRequest(body)
    
    const response = await POST(request)
    
    expect(response.status).toBe(200)
  })

  it('should reject requests with invalid signatures', async () => {
    const event = { type: 'event_callback' }
    const body = JSON.stringify(event)
    
    const request = new NextRequest('http://localhost:3000/api/slack/events', {
      method: 'POST',
      body,
      headers: {
        'x-slack-signature': 'v0=0000000000000000000000000000000000000000000000000000000000000000',
        'x-slack-request-timestamp': Math.floor(Date.now() / 1000).toString(),
        'content-type': 'application/json'
      }
    })
    
    const response = await POST(request)
    
    expect(response.status).toBe(401)
  })

  it('should handle missing headers', async () => {
    const event = { type: 'event_callback' }
    const body = JSON.stringify(event)
    
    const request = new NextRequest('http://localhost:3000/api/slack/events', {
      method: 'POST',
      body,
      headers: {
        'content-type': 'application/json'
      }
    })
    
    const response = await POST(request)
    
    expect(response.status).toBe(400)
  })
})