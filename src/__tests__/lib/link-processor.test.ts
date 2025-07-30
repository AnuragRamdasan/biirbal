import { processLink } from '@/lib/link-processor'

// Mock dependencies
jest.mock('@/lib/content-extractor', () => ({
  extractContentFromUrl: jest.fn().mockResolvedValue({
    title: 'Test Article',
    content: 'Test content for audio generation',
    textContent: 'Test content for audio generation',
    url: 'https://example.com/article'
  }),
  summarizeForAudio: jest.fn().mockResolvedValue('Summarized content for audio generation')
}))

jest.mock('@/lib/text-to-speech', () => ({
  generateAudioSummary: jest.fn().mockResolvedValue('audio-data-buffer'),
  uploadAudioToStorage: jest.fn().mockResolvedValue('https://s3.amazonaws.com/bucket/audio.mp3')
}))

jest.mock('@/lib/db', () => {
  const mockDbClient = {
    processedLink: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue({
        id: 'link1',
        url: 'https://example.com/article',
        status: 'pending',
        teamId: 'T123'
      }),
      create: jest.fn().mockResolvedValue({
        id: 'link1',
        url: 'https://example.com/article',
        status: 'processing',
        teamId: 'T123'
      }),
      update: jest.fn().mockResolvedValue({
        id: 'link1',
        status: 'completed',
        audioUrl: 'https://s3.amazonaws.com/bucket/audio.mp3'
      }),
      upsert: jest.fn().mockResolvedValue({
        id: 'link1',
        status: 'completed',
        audioUrl: 'https://s3.amazonaws.com/bucket/audio.mp3'
      })
    },
    team: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'T123',
        slackTeamId: 'T123',
        name: 'Test Team',
        subscription: {
          id: 'sub1',
          plan: 'FREE',
          status: 'active'
        }
      })
    },
    channel: {
      upsert: jest.fn().mockResolvedValue({
        id: 'C123',
        slackChannelId: 'C123',
        name: 'general',
        teamId: 'T123'
      })
    },
    subscription: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'sub1',
        plan: 'FREE',
        status: 'active'
      })
    }
  }
  
  return {
    getDbClient: jest.fn().mockResolvedValue(mockDbClient)
  }
})

jest.mock('@/lib/slack', () => ({
  sendSlackNotification: jest.fn().mockResolvedValue({ ok: true })
}))

describe('Link Processor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should process link successfully', async () => {
    const linkData = {
      url: 'https://example.com/article',
      messageTs: '123.456',
      channelId: 'C123',
      teamId: 'T123',
      slackTeamId: 'T123'
    }

    await expect(processLink(linkData)).resolves.not.toThrow()
    
    const { extractContentFromUrl } = require('@/lib/content-extractor')
    const { generateAudioSummary } = require('@/lib/text-to-speech')
    
    expect(extractContentFromUrl).toHaveBeenCalledWith(linkData.url)
    expect(generateAudioSummary).toHaveBeenCalled()
  })

  it('should handle content extraction failures', async () => {
    const { extractContentFromUrl } = require('@/lib/content-extractor')
    extractContentFromUrl.mockRejectedValueOnce(new Error('Content extraction failed'))

    const linkData = {
      url: 'https://example.com/article',
      messageTs: '123.456',
      channelId: 'C123',
      teamId: 'T123',
      slackTeamId: 'T123'
    }

    // Function should handle error and rethrow it
    await expect(processLink(linkData)).rejects.toThrow('Content extraction failed')
  })

  it('should handle audio generation failures', async () => {
    const { generateAudioSummary } = require('@/lib/text-to-speech')
    generateAudioSummary.mockRejectedValueOnce(new Error('Audio generation failed'))

    const linkData = {
      url: 'https://example.com/article',
      messageTs: '123.456',
      channelId: 'C123',
      teamId: 'T123',
      slackTeamId: 'T123'
    }

    // Function should handle error and rethrow it
    await expect(processLink(linkData)).rejects.toThrow('Audio generation failed')
  })

  it('should handle database failures', async () => {
    const { getDbClient } = require('@/lib/db')
    getDbClient.mockRejectedValueOnce(new Error('Database connection failed'))

    const linkData = {
      url: 'https://example.com/article',
      messageTs: '123.456',
      channelId: 'C123',
      teamId: 'T123',
      slackTeamId: 'T123'
    }

    // Function should handle error and rethrow it
    await expect(processLink(linkData)).rejects.toThrow('Database connection failed')
  })

  it('should handle team not found', async () => {
    const { getDbClient } = require('@/lib/db')
    const mockDb = await getDbClient()
    mockDb.team.findUnique.mockResolvedValueOnce(null)

    const linkData = {
      url: 'https://example.com/article',
      messageTs: '123.456',
      channelId: 'C123',
      teamId: 'T123',
      slackTeamId: 'T123'
    }

    // Function should handle error and rethrow it
    await expect(processLink(linkData)).rejects.toThrow('Team not found')
  })
})