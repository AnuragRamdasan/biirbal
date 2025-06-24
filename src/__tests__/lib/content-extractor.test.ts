import { extractContentFromUrl, summarizeForAudio } from '@/lib/content-extractor'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('Content Extractor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('extractContentFromUrl', () => {
    it('should extract content using readability API when available', async () => {
      process.env.READABILITY_API_KEY = 'test-key'
      process.env.READABILITY_API_URL = 'https://api.readability.com'

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          title: 'Test Article',
          content: 'This is the full content of the article.',
          excerpt: 'This is a summary.'
        }
      })

      const result = await extractContentFromUrl('https://example.com/article')

      expect(result).toEqual({
        title: 'Test Article',
        text: 'This is the full content of the article.',
        url: 'https://example.com/article',
        excerpt: 'This is a summary.'
      })
    })

    it('should fallback to scraping when readability API fails', async () => {
      process.env.READABILITY_API_KEY = 'test-key'
      process.env.READABILITY_API_URL = 'https://api.readability.com'

      // Mock API failure
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'))
      
      // Mock successful scraping
      mockedAxios.get.mockResolvedValueOnce({
        data: `
          <html>
            <head><title>Scraped Title</title></head>
            <body>
              <article>
                <h1>Main Article</h1>
                <p>This is the main content that should be extracted.</p>
              </article>
            </body>
          </html>
        `
      })

      const result = await extractContentFromUrl('https://example.com/article')

      expect(result.title).toBe('Scraped Title')
      expect(result.text).toContain('This is the main content')
      expect(result.url).toBe('https://example.com/article')
    })

    it('should handle scraping errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'))

      await expect(extractContentFromUrl('https://example.com/article'))
        .rejects.toThrow('Failed to extract content from URL')
    })
  })

  describe('summarizeForAudio', () => {
    it('should return original text if under word limit', () => {
      const shortText = 'This is a short text that should not be summarized.'
      const result = summarizeForAudio(shortText, 200)
      
      expect(result).toBe(shortText)
    })

    it('should summarize long text by extracting key sentences', () => {
      const longText = 'This is the first sentence. This is the second sentence with important information. This is the third sentence. This is the fourth sentence. This is the fifth sentence. This is the sixth sentence. This is the seventh sentence. This is the eighth sentence. This is the ninth sentence. This is the tenth sentence.'
      
      const result = summarizeForAudio(longText, 10) // Very low word limit
      
      expect(result.length).toBeLessThan(longText.length)
      expect(result).toContain('This is the first sentence')
    })

    it('should handle edge cases with empty or very short text', () => {
      expect(summarizeForAudio('', 100)).toBe('')
      expect(summarizeForAudio('Short.', 100)).toBe('Short.')
    })
  })
})