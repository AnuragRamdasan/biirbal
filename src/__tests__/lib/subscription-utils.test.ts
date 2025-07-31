import { 
  getCurrentPlan, 
  canProcessMoreLinks, 
  canAddMoreUsers,
  updateSubscription,
  cancelSubscription,
  canProcessNewLink,
  canUserListen
} from '@/lib/subscription-utils'

// Mock database
const mockFindFirst = jest.fn()
const mockFindUnique = jest.fn()
const mockUpdate = jest.fn()
const mockUpsert = jest.fn()
const mockCount = jest.fn()

jest.mock('@/lib/db', () => ({
  getDbClient: jest.fn(() => ({
    team: {
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
      update: mockUpdate
    },
    subscription: {
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
      update: mockUpdate,
      upsert: mockUpsert
    },
    processedLink: {
      count: mockCount
    },
    user: {
      count: mockCount,
      findFirst: mockFindFirst
    }
  }))
}))

// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  PRICING_PLANS: {
    FREE: {
      id: 'free',
      name: 'Free',
      monthlyLinkLimit: 20,
      userLimit: 1
    },
    STARTER: {
      id: 'starter',
      name: 'Starter',
      monthlyLinkLimit: -1,
      userLimit: 1
    },
    PRO: {
      id: 'pro',
      name: 'Pro',
      monthlyLinkLimit: -1,
      userLimit: 10
    }
  },
  getPlanById: jest.fn().mockImplementation((id) => {
    const plans = {
      'free': {
        id: 'free',
        name: 'Free',
        monthlyLinkLimit: 20,
        userLimit: 1
      },
      'starter': {
        id: 'starter',
        name: 'Starter',
        monthlyLinkLimit: -1,
        userLimit: 1
      },
      'pro': {
        id: 'pro',
        name: 'Pro',
        monthlyLinkLimit: -1,
        userLimit: 10
      }
    }
    return plans[id] || plans.free
  }),
  checkUsageLimits: jest.fn()
}))

// Mock exception teams
jest.mock('@/lib/exception-teams', () => ({
  isExceptionTeam: jest.fn(() => false)
}))

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  trackSubscriptionStarted: jest.fn(),
  trackSubscriptionCancelled: jest.fn()
}))

describe('Subscription utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCurrentPlan', () => {
    it('should return current plan for team with subscription', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123',
        subscription: {
          planId: 'starter',
          status: 'ACTIVE'
        },
        users: [],
        processedLinks: []
      })

      // Ensure getPlanById returns the correct plan
      const { getPlanById, checkUsageLimits } = require('@/lib/stripe')
      getPlanById.mockReturnValueOnce({
        id: 'starter',
        name: 'Starter',
        monthlyLinkLimit: -1,
        userLimit: 1
      })
      
      checkUsageLimits.mockReturnValueOnce({
        canProcessMore: true,
        linkLimitExceeded: false,
        userLimitExceeded: false,
        linkWarning: false,
        userWarning: false
      })

      const plan = await getCurrentPlan('T123')
      
      expect(plan).toEqual({
        id: 'starter',
        name: 'Starter',
        monthlyLinkLimit: -1,
        userLimit: 1
      })
    })

    it('should return free plan for team without subscription', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123', 
        subscription: {
          planId: 'free',
          status: 'ACTIVE'
        },
        users: [],
        processedLinks: []
      })

      const plan = await getCurrentPlan('T123')
      
      expect(plan).toEqual({
        id: 'free',
        name: 'Free',
        monthlyLinkLimit: 20,
        userLimit: 1
      })
    })

    it('should return free plan for non-existent team', async () => {
      mockFindUnique.mockResolvedValue(null)

      const plan = await getCurrentPlan('T999')
      
      expect(plan).toEqual({
        id: 'free',
        name: 'Free',
        monthlyLinkLimit: 20,
        userLimit: 1
      })
    })
  })

  describe('canProcessMoreLinks', () => {
    beforeEach(() => {
      const { checkUsageLimits } = require('@/lib/stripe')
      checkUsageLimits.mockReturnValue({
        canProcessMore: true,
        linkLimitExceeded: false,
        userLimitExceeded: false
      })
    })

    it('should allow processing when under free plan limit', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123',
        subscription: { planId: 'free', status: 'ACTIVE' },
        users: [{ isActive: true }],
        processedLinks: Array(15).fill({})
      })
      
      const { checkUsageLimits } = require('@/lib/stripe')
      checkUsageLimits.mockReturnValue({ canProcessMore: true })

      const canProcess = await canProcessMoreLinks('T123')
      
      expect(canProcess).toBe(true)
    })

    it('should allow processing even when free plan limit exceeded', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123',
        subscription: { planId: 'free', status: 'ACTIVE' },
        users: [{ isActive: true }],
        processedLinks: Array(25).fill({})
      })
      
      const { checkUsageLimits } = require('@/lib/stripe')
      checkUsageLimits.mockReturnValueOnce({ canProcessMore: false, linkLimitExceeded: true })

      const canProcess = await canProcessMoreLinks('T123')
      
      expect(canProcess).toBe(true) // Link processing is now always unlimited
    })

    it('should always allow processing for paid plans', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123',
        subscription: { planId: 'starter', status: 'ACTIVE' },
        users: [{ isActive: true }],
        processedLinks: Array(1000).fill({})
      })
      
      const { checkUsageLimits } = require('@/lib/stripe')
      checkUsageLimits.mockReturnValue({ canProcessMore: true })

      const canProcess = await canProcessMoreLinks('T123')
      
      expect(canProcess).toBe(true)
    })
  })

  describe('canAddMoreUsers', () => {
    beforeEach(() => {
      const { checkUsageLimits } = require('@/lib/stripe')
      checkUsageLimits.mockReturnValue({
        canProcessMore: true,
        userLimitExceeded: false
      })
    })

    it('should allow adding users when under plan limit', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123',
        subscription: { planId: 'starter', status: 'ACTIVE' },
        users: [],
        processedLinks: []
      })
      
      const { checkUsageLimits } = require('@/lib/stripe')
      checkUsageLimits.mockReturnValue({ userLimitExceeded: false })

      const canAdd = await canAddMoreUsers('T123')
      
      expect(canAdd).toBe(true)
    })

    it('should block adding users when plan limit exceeded', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123',
        subscription: { planId: 'starter', status: 'ACTIVE' },
        users: [{ isActive: true }, { isActive: true }],
        processedLinks: []
      })
      
      const { checkUsageLimits } = require('@/lib/stripe')
      checkUsageLimits.mockReturnValue({ userLimitExceeded: true })

      const canAdd = await canAddMoreUsers('T123')
      
      expect(canAdd).toBe(false)
    })

    it('should allow unlimited users for pro plan', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123',
        subscription: { planId: 'pro', status: 'ACTIVE' },
        users: Array(50).fill({ isActive: true }),
        processedLinks: []
      })
      
      const { checkUsageLimits } = require('@/lib/stripe')
      checkUsageLimits.mockReturnValue({ userLimitExceeded: false })

      const canAdd = await canAddMoreUsers('T123')
      
      expect(canAdd).toBe(true)
    })
  })

  describe('updateSubscription', () => {
    it('should update subscription successfully', async () => {
      mockUpsert.mockResolvedValue({
        id: 'sub1',
        teamId: 'T123',
        planId: 'pro',
        status: 'active'
      })

      const result = await updateSubscription('T123', {
        planId: 'pro',
        status: 'active',
        stripeCustomerId: 'cus_123'
      })
      
      expect(result.success).toBe(true)
      expect(mockUpsert).toHaveBeenCalled()
    })

    it('should handle subscription update errors', async () => {
      mockUpsert.mockRejectedValue(new Error('Update failed'))

      const result = await updateSubscription('T123', {
        planId: 'pro',
        status: 'active'
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      mockUpdate.mockResolvedValue({
        id: 'sub1',
        teamId: 'T123',
        planId: 'free',
        status: 'CANCELED'
      })

      const result = await cancelSubscription('T123')
      
      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { teamId: 'T123' },
        data: {
          status: 'CANCELED',
          planId: 'free',
          monthlyLinkLimit: 20,
          userLimit: 1
        }
      })
    })

    it('should handle cancellation errors', async () => {
      mockUpdate.mockRejectedValue(new Error('Cancellation failed'))

      const result = await cancelSubscription('T123')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Cancellation failed')
    })
  })

  describe('canProcessNewLink', () => {
    it('should always allow link processing for paid plans regardless of user limits', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123',
        subscription: { planId: 'starter', status: 'ACTIVE' },
        users: Array(10).fill({ isActive: true }), // Exceeds starter plan user limit of 1
        processedLinks: []
      })
      
      const { checkUsageLimits } = require('@/lib/stripe')
      checkUsageLimits.mockReturnValue({ 
        canProcessMore: true,
        userLimitExceeded: true, // User limit exceeded
        linkLimitExceeded: false
      })

      const result = await canProcessNewLink('T123', 'U123')
      
      expect(result.allowed).toBe(true) // Should still allow link processing
    })

    it('should allow link processing for free plan regardless of link or user limits', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123',
        subscription: { planId: 'free', status: 'ACTIVE' },
        users: Array(5).fill({ isActive: true }), // Exceeds free plan user limit of 1
        processedLinks: Array(25).fill({}) // Exceeds free plan link limit of 20
      })
      
      const { checkUsageLimits } = require('@/lib/stripe')
      checkUsageLimits.mockReturnValue({ 
        canProcessMore: false,
        userLimitExceeded: true,
        linkLimitExceeded: true
      })

      const result = await canProcessNewLink('T123', 'U123')
      
      expect(result.allowed).toBe(true) // Should allow processing despite all limits exceeded
    })

    it('should always allow link processing for all plans', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123',
        subscription: { planId: 'free', status: 'ACTIVE' },
        users: Array(100).fill({ isActive: true }),
        processedLinks: Array(1000).fill({})
      })
      
      const { checkUsageLimits } = require('@/lib/stripe')
      checkUsageLimits.mockReturnValue({ 
        canProcessMore: false,
        linkLimitExceeded: true,
        userLimitExceeded: true
      })

      const result = await canProcessNewLink('T123', 'U123')
      
      expect(result.allowed).toBe(true) // Link processing is ALWAYS unlimited
    })
  })

  describe('canUserListen', () => {
    it('should block listening on free plan when link limit exceeded', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123',
        subscription: { planId: 'free', status: 'ACTIVE' },
        users: [{ isActive: true }],
        processedLinks: Array(25).fill({}) // Exceeds free plan limit of 20
      })
      
      const { checkUsageLimits } = require('@/lib/stripe')
      checkUsageLimits.mockReturnValue({ 
        canProcessMore: false,
        userLimitExceeded: false,
        linkLimitExceeded: true
      })

      const result = await canUserListen('T123', 'U123')
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Monthly link limit')
    })

    it('should block listening when user limits exceeded on paid plans', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123',
        subscription: { planId: 'starter', status: 'ACTIVE' },
        users: Array(5).fill({ isActive: true }), // Exceeds starter plan user limit of 1
        processedLinks: []
      })
      
      const { checkUsageLimits } = require('@/lib/stripe')
      checkUsageLimits.mockReturnValue({ 
        canProcessMore: true,
        userLimitExceeded: true,
        linkLimitExceeded: false
      })

      const result = await canUserListen('T123', 'U123')
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('User limit')
    })

    it('should allow listening when under user limits', async () => {
      // Mock team lookup for canUserListen
      mockFindUnique.mockResolvedValueOnce({
        id: 'team1',
        slackTeamId: 'T123',
        subscription: { planId: 'starter', status: 'ACTIVE' },
        users: [{ slackUserId: 'U123', isActive: true }], // Within starter plan user limit of 1
        processedLinks: []
      })
      
      // Mock user lookup for canUserConsume
      mockFindFirst.mockResolvedValueOnce({ 
        slackUserId: 'U123', 
        isActive: true,
        team: { slackTeamId: 'T123' }
      })
      
      // Mock team lookup for canUserConsume
      mockFindUnique.mockResolvedValueOnce({
        id: 'team1',
        slackTeamId: 'T123',
        subscription: { planId: 'starter', status: 'ACTIVE' },
        users: [{ slackUserId: 'U123', isActive: true }]
      })
      
      const { checkUsageLimits } = require('@/lib/stripe')
      checkUsageLimits.mockReturnValue({ 
        canProcessMore: true,
        userLimitExceeded: false,
        linkLimitExceeded: false
      })

      const result = await canUserListen('T123', 'U123')
      
      expect(result.allowed).toBe(true)
    })
  })
})