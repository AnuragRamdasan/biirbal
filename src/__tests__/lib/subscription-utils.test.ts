import { 
  getCurrentPlan, 
  canProcessMoreLinks, 
  canAddMoreUsers,
  updateSubscription,
  cancelSubscription 
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

    it('should block processing when free plan limit exceeded', async () => {
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
      
      expect(canProcess).toBe(false)
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
})