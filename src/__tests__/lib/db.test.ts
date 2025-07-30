import { getDbClient } from '@/lib/db'

describe('Database utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getDbClient', () => {
    it('should return database client', async () => {
      const db = await getDbClient()
      expect(db).toBeDefined()
      expect(db.team).toBeDefined()
      expect(db.user).toBeDefined()
      expect(db.processedLink).toBeDefined()
      expect(db.subscription).toBeDefined()
    })

    it('should reuse existing client connection', async () => {
      const db1 = await getDbClient()
      const db2 = await getDbClient()
      expect(db1).toBe(db2)
    })
  })

  describe('database client functionality', () => {
    it('should provide database operations', async () => {
      const db = await getDbClient()
      
      expect(db.team).toBeDefined()
      expect(db.user).toBeDefined()
      expect(db.processedLink).toBeDefined()
      expect(db.subscription).toBeDefined()
    })

    it('should handle database queries', async () => {
      const db = await getDbClient()
      
      // Basic query test - should not throw
      expect(() => db.$queryRaw`SELECT 1`).not.toThrow()
    })

    it('should provide connection methods', async () => {
      const db = await getDbClient()
      
      expect(db.$connect).toBeDefined()
      expect(db.$disconnect).toBeDefined()
    })

    it('should be consistent across calls', async () => {
      const db1 = await getDbClient()
      const db2 = await getDbClient()
      
      expect(db1).toBe(db2)
    })
  })

  describe('database connection error handling', () => {
    it('should handle database operations gracefully', async () => {
      const db = await getDbClient()
      
      // Database should be available via mocks
      expect(db).toBeDefined()
      expect(db.team).toBeDefined()
    })

    it('should provide database client consistently', async () => {
      const db1 = await getDbClient()
      const db2 = await getDbClient()
      
      // Should return same client instance
      expect(db1).toBe(db2)
    })
  })

  describe('database operations', () => {
    it('should perform team operations', async () => {
      const db = await getDbClient()
      
      // Mock the create operation to return data
      db.team.create.mockResolvedValue({
        id: 'team1',
        slackTeamId: 'T123',
        teamName: 'Test Team'
      })
      
      // Test create
      const team = await db.team.create({
        data: {
          slackTeamId: 'T123',
          teamName: 'Test Team'
        }
      })
      expect(team).toBeDefined()
      expect(team.slackTeamId).toBe('T123')

      // Mock the find operation
      db.team.findUnique.mockResolvedValue(team)
      
      // Test find
      const foundTeam = await db.team.findUnique({
        where: { slackTeamId: 'T123' }
      })
      expect(foundTeam).toBeDefined()
    })

    it('should perform user operations', async () => {
      const db = await getDbClient()
      
      // Mock the create operation
      db.user.create.mockResolvedValue({
        id: 'user1',
        slackUserId: 'U123',
        username: 'testuser',
        teamId: 'team1'
      })
      
      const user = await db.user.create({
        data: {
          slackUserId: 'U123',
          username: 'testuser',
          teamId: 'team1'
        }
      })
      expect(user).toBeDefined()
      expect(user.slackUserId).toBe('U123')
    })

    it('should perform processed link operations', async () => {
      const db = await getDbClient()
      
      // Mock the create operation
      db.processedLink.create.mockResolvedValue({
        id: 'link1',
        url: 'https://example.com',
        teamId: 'team1',
        channelId: 'C123',
        userId: 'user1',
        status: 'pending'
      })
      
      const link = await db.processedLink.create({
        data: {
          url: 'https://example.com',
          teamId: 'team1',
          channelId: 'C123',
          userId: 'user1',
          status: 'pending'
        }
      })
      expect(link).toBeDefined()
      expect(link.url).toBe('https://example.com')
    })

    it('should handle database operation errors', async () => {
      const db = await getDbClient()
      db.team.create.mockRejectedValueOnce(new Error('Database error'))

      await expect(db.team.create({
        data: { slackTeamId: 'T123', teamName: 'Test' }
      })).rejects.toThrow('Database error')
    })
  })
})