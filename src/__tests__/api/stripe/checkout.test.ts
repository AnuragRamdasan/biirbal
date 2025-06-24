import { NextRequest } from 'next/server'
import { POST } from '@/app/api/stripe/checkout/route'

// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  createStripeCustomer: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
  createCheckoutSession: jest.fn().mockResolvedValue({
    id: 'cs_test123',
    url: 'https://checkout.stripe.com/test'
  }),
  PRICING_PLANS: {
    STARTER: {
      id: 'starter',
      name: 'Starter',
      price: 9.99,
      monthlyLimit: 100,
      stripePriceId: 'price_starter'
    }
  }
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    team: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'team1',
        teamName: 'Test Team',
        subscription: null
      })
    },
    subscription: {
      upsert: jest.fn().mockResolvedValue({ id: 'sub1' })
    }
  }
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
    // Mock team not found
    const { prisma } = require('@/lib/prisma')
    prisma.team.findUnique.mockResolvedValueOnce(null)
    
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