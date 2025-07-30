import { NextRequest } from 'next/server'
import { POST } from '@/app/api/stripe/checkout/route'

// Mock database client
const mockFindUnique = jest.fn()
const mockCount = jest.fn()
const mockUpsert = jest.fn()

jest.mock('@/lib/db', () => ({
  getDbClient: jest.fn(() => ({
    team: {
      findUnique: mockFindUnique.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'team1',
        teamName: 'Test Team',
        subscription: null
      }),
      count: mockCount.mockResolvedValue(1)
    },
    subscription: {
      upsert: mockUpsert.mockResolvedValue({ id: 'sub1' })
    }
  }))
}))

// Mock Stripe functions
jest.mock('@/lib/stripe', () => ({
  createStripeCustomer: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
  createCheckoutSession: jest.fn().mockResolvedValue({
    id: 'cs_test123',
    url: 'https://checkout.stripe.com/test'
  }),
  getPriceId: jest.fn().mockReturnValue('price_1ABC123def456'),
  PRICING_PLANS: {
    FREE: {
      id: 'free',
      name: 'Free',
      price: 0,
      monthlyLinkLimit: 20,
      stripePriceId: null
    },
    STARTER: {
      id: 'starter',
      name: 'Starter',
      price: 9.00,
      annualPrice: 99.00,
      monthlyLinkLimit: -1,
      stripePriceId: {
        monthly: 'price_1ABC123def456',
        annual: 'price_1DEF456ghi789'
      }
    }
  }
}))

// Mock config
jest.mock('@/lib/config', () => ({
  getBaseUrl: jest.fn().mockReturnValue('http://localhost:3000')
}))

describe('/api/stripe/checkout', () => {
  it('should create checkout session for valid request', async () => {
    const requestBody = {
      teamId: 'team1',
      planId: 'starter'
    }
    
    const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'content-type': 'application/json'
      }
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.sessionId).toBe('cs_test123')
    expect(data.url).toBe('https://checkout.stripe.com/test')
  })

  it('should return 400 for missing teamId', async () => {
    const requestBody = {
      planId: 'starter'
    }
    
    const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'content-type': 'application/json'
      }
    })
    
    const response = await POST(request)
    
    expect(response.status).toBe(400)
  })

  it('should return 400 for invalid planId', async () => {
    const requestBody = {
      teamId: 'team1',
      planId: 'invalid_plan'
    }
    
    const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'content-type': 'application/json'
      }
    })
    
    const response = await POST(request)
    
    expect(response.status).toBe(400)
  })

  it('should return 404 for non-existent team', async () => {
    // Mock team not found for this specific test
    mockFindUnique.mockResolvedValueOnce(null)
    
    const requestBody = {
      teamId: 'nonexistent_team',
      planId: 'starter'
    }
    
    const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'content-type': 'application/json'
      }
    })
    
    const response = await POST(request)
    
    expect(response.status).toBe(404)
  })
})