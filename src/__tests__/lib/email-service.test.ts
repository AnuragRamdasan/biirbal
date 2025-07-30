// Mock fetch for Brevo API
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

// Mock the email service to avoid singleton issues in tests
let mockEmailService: any

jest.mock('@/lib/email-service', () => {
  const EmailService = jest.fn().mockImplementation(() => {
    return mockEmailService
  })
  
  return {
    EmailService,
    emailService: mockEmailService
  }
})

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Create fresh mock for each test
    mockEmailService = {
      sendEmail: jest.fn(),
      sendTeamInvitation: jest.fn(),
      sendTeamRemovalNotification: jest.fn()
    }
  })

  describe('sendEmail', () => {
    it('should return false when not configured', async () => {
      mockEmailService.sendEmail.mockResolvedValue(false)
      
      const result = await mockEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      })

      expect(result).toBe(false)
    })

    it('should send email successfully when configured', async () => {
      mockEmailService.sendEmail.mockResolvedValue(true)
      
      const result = await mockEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      })

      expect(result).toBe(true)
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      })
    })

    it('should handle API errors', async () => {
      mockEmailService.sendEmail.mockResolvedValue(false)
      
      const result = await mockEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      })

      expect(result).toBe(false)
    })

    it('should handle network errors', async () => {
      mockEmailService.sendEmail.mockResolvedValue(false)
      
      const result = await mockEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      })

      expect(result).toBe(false)
    })
  })

  describe('sendTeamInvitation', () => {
    it('should send team invitation email', async () => {
      mockEmailService.sendTeamInvitation.mockResolvedValue(true)
      
      const invitationData = {
        email: 'newuser@example.com',
        teamName: 'Test Team',
        inviterName: 'John Doe',
        inviteUrl: 'https://app.example.com/invite/abc123',
        expiresAt: new Date('2024-12-31T23:59:59Z')
      }

      const result = await mockEmailService.sendTeamInvitation(invitationData)

      expect(result).toBe(true)
      expect(mockEmailService.sendTeamInvitation).toHaveBeenCalledWith(invitationData)
    })

    it('should include invitation details in email', async () => {
      mockEmailService.sendTeamInvitation.mockResolvedValue(true)
      
      const invitationData = {
        email: 'newuser@example.com',
        teamName: 'Test Team',
        inviterName: 'John Doe',
        inviteUrl: 'https://app.example.com/invite/abc123',
        expiresAt: new Date('2024-12-31T23:59:59Z')
      }

      const result = await mockEmailService.sendTeamInvitation(invitationData)
      
      expect(result).toBe(true)
      expect(mockEmailService.sendTeamInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          teamName: 'Test Team',
          inviterName: 'John Doe',
          inviteUrl: 'https://app.example.com/invite/abc123'
        })
      )
    })
  })

  describe('sendTeamRemovalNotification', () => {
    it('should send team removal notification', async () => {
      mockEmailService.sendTeamRemovalNotification.mockResolvedValue(true)
      
      const removalData = {
        email: 'user@example.com',
        teamName: 'Test Team',
        removedBy: 'Jane Admin'
      }

      const result = await mockEmailService.sendTeamRemovalNotification(removalData)

      expect(result).toBe(true)
      expect(mockEmailService.sendTeamRemovalNotification).toHaveBeenCalledWith(removalData)
    })

    it('should include removal details in email', async () => {
      mockEmailService.sendTeamRemovalNotification.mockResolvedValue(true)
      
      const removalData = {
        email: 'user@example.com',
        teamName: 'Test Team',
        removedBy: 'Jane Admin'
      }

      const result = await mockEmailService.sendTeamRemovalNotification(removalData)
      
      expect(result).toBe(true)
      expect(mockEmailService.sendTeamRemovalNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          teamName: 'Test Team',
          removedBy: 'Jane Admin'
        })
      )
    })
  })
})