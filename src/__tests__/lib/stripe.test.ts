import { 
  PRICING_PLANS, 
  getPlanById, 
  getPriceId, 
  getPlanPrice, 
  checkUsageLimits,
  createStripeCustomer,
  createCheckoutSession 
} from '@/lib/stripe'

describe('Stripe utilities', () => {
  describe('getPlanById', () => {
    it('should return correct plan for valid ID', () => {
      const plan = getPlanById('starter')
      expect(plan).toBe(PRICING_PLANS.STARTER)
    })

    it('should return undefined for invalid ID', () => {
      const plan = getPlanById('invalid')
      expect(plan).toBeUndefined()
    })
  })

  describe('getPriceId', () => {
    it('should return monthly price ID for monthly billing', () => {
      const priceId = getPriceId(PRICING_PLANS.STARTER, false)
      expect(priceId).toBe(PRICING_PLANS.STARTER.stripePriceId.monthly)
    })

    it('should return annual price ID for annual billing', () => {
      const priceId = getPriceId(PRICING_PLANS.STARTER, true)
      expect(priceId).toBe(PRICING_PLANS.STARTER.stripePriceId.annual)
    })

    it('should return null for plan without price ID', () => {
      const priceId = getPriceId(PRICING_PLANS.FREE, false)
      expect(priceId).toBeNull()
    })

    it('should handle legacy string format', () => {
      const legacyPlan = { stripePriceId: 'price_legacy' }
      const priceId = getPriceId(legacyPlan, false)
      expect(priceId).toBe('price_legacy')
    })
  })

  describe('getPlanPrice', () => {
    it('should return monthly price for monthly billing', () => {
      const price = getPlanPrice(PRICING_PLANS.STARTER, false)
      expect(price).toBe(9.00)
    })

    it('should return annual price for annual billing', () => {
      const price = getPlanPrice(PRICING_PLANS.STARTER, true)
      expect(price).toBe(99.00)
    })

    it('should return monthly price if no annual price available', () => {
      const plan = { price: 10, stripePriceId: 'test' }
      const price = getPlanPrice(plan, true)
      expect(price).toBe(10)
    })
  })

  describe('checkUsageLimits', () => {
    it('should allow processing within free plan limits', () => {
      const result = checkUsageLimits(PRICING_PLANS.FREE, 10, 1)
      expect(result.canProcessMore).toBe(true)
      expect(result.linkLimitExceeded).toBe(false)
      expect(result.userLimitExceeded).toBe(false)
    })

    it('should block processing when free plan link limit exceeded', () => {
      const result = checkUsageLimits(PRICING_PLANS.FREE, 25, 1)
      expect(result.canProcessMore).toBe(false)
      expect(result.linkLimitExceeded).toBe(true)
    })

    it('should block processing when user limit exceeded', () => {
      const result = checkUsageLimits(PRICING_PLANS.FREE, 5, 2)
      expect(result.canProcessMore).toBe(false)
      expect(result.userLimitExceeded).toBe(true)
    })

    it('should ignore link limits for paid plans', () => {
      const result = checkUsageLimits(PRICING_PLANS.STARTER, 1000, 1)
      expect(result.canProcessMore).toBe(true)
      expect(result.linkLimitExceeded).toBe(false)
    })

    it('should enforce user limits for paid plans', () => {
      const result = checkUsageLimits(PRICING_PLANS.STARTER, 100, 5)
      expect(result.canProcessMore).toBe(false)
      expect(result.userLimitExceeded).toBe(true)
    })

    it('should allow unlimited users for business plan', () => {
      const result = checkUsageLimits(PRICING_PLANS.BUSINESS, 1000, 100)
      expect(result.canProcessMore).toBe(true)
      expect(result.userLimitExceeded).toBe(false)
    })
  })

  describe('createStripeCustomer', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should create customer with valid data', async () => {
      const customer = await createStripeCustomer('team1', 'Test Team')
      expect(customer.id).toBe('cus_test123')
    })

    it('should handle Stripe errors', async () => {
      const mockStripe = global.mockStripeInstance
      mockStripe.customers.create.mockRejectedValueOnce(new Error('Stripe error'))
      
      await expect(createStripeCustomer('team1', 'Test Team')).rejects.toThrow('Stripe error')
    })
  })

  describe('createCheckoutSession', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should create checkout session with valid parameters', async () => {
      const session = await createCheckoutSession(
        'cus_test123',
        'price_test',
        'team1',
        'http://localhost:3000/success',
        'http://localhost:3000/cancel'
      )
      expect(session.id).toBe('cs_test123')
      expect(session.url).toBe('https://checkout.stripe.com/test')
    })

    it('should handle checkout session creation errors', async () => {
      const mockStripe = global.mockStripeInstance
      mockStripe.checkout.sessions.create.mockRejectedValueOnce(new Error('Session creation failed'))

      await expect(createCheckoutSession(
        'cus_test123',
        'price_test',
        'team1',
        'http://localhost:3000/success',
        'http://localhost:3000/cancel'
      )).rejects.toThrow('Session creation failed')
    })
  })
})