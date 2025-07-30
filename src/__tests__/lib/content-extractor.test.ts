import { extractContentFromUrl, summarizeForAudio } from '@/lib/content-extractor'

describe('Content Extractor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('extractContentFromUrl', () => {
    it('should extract content using ScrapingBee API', async () => {
      const result = await extractContentFromUrl('https://example.com/article')

      expect(result).toEqual({
        title: 'Test Article Title',
        text: 'Test article content that is long enough to pass the minimum content check. This content needs to be at least 100 characters long to not trigger the insufficient content error.',
        url: 'https://example.com/article',
        ogImage: undefined
      })
    })

    it('should handle extraction errors gracefully', async () => {
      const axios = require('axios')
      axios.get.mockRejectedValueOnce(new Error('API Error'))

      await expect(extractContentFromUrl('https://example.com/article'))
        .rejects.toThrow()
    })

    it('should require SCRAPINGBEE_API_KEY', async () => {
      const originalKey = process.env.SCRAPINGBEE_API_KEY
      delete process.env.SCRAPINGBEE_API_KEY
      
      await expect(extractContentFromUrl('https://example.com/article'))
        .rejects.toThrow('SCRAPINGBEE_API_KEY is required')
      
      process.env.SCRAPINGBEE_API_KEY = originalKey
    })
  })

  describe('summarizeForAudio', () => {
    it('should summarize text using OpenAI even if under word limit', async () => {
      const shortText = 'This is a short text that should be processed.'
      const result = await summarizeForAudio(shortText, 200)
      
      expect(result).toBe('Test summary content')
    })

    it('should summarize long text by calling OpenAI', async () => {
      const longText = 'This is the first sentence. This is the second sentence with more details. This is the third sentence that adds context. This is the fourth sentence with additional information.'
      const result = await summarizeForAudio(longText, 10) // Very low word limit
      
      expect(result).toBe('Test summary content')
    })

    it('should handle empty text', async () => {
      const result = await summarizeForAudio('', 100)
      expect(result).toBe('Test summary content')
    })

    it('should require OpenAI API key', async () => {
      const originalKey = process.env.OPENAI_API_KEY
      delete process.env.OPENAI_API_KEY
      
      await expect(summarizeForAudio('Test text', 100)).rejects.toThrow('OPENAI_API_KEY is required')
      
      process.env.OPENAI_API_KEY = originalKey
    })
  })
})