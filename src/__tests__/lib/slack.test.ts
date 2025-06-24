import { extractLinksFromMessage, isValidUrl, shouldProcessUrl } from '@/lib/slack'

describe('Slack utilities', () => {
  describe('extractLinksFromMessage', () => {
    it('should extract HTTP and HTTPS links from message text', () => {
      const text = 'Check out this article: https://example.com/article and this one http://test.com/page'
      const links = extractLinksFromMessage(text)
      
      expect(links).toEqual([
        'https://example.com/article',
        'http://test.com/page'
      ])
    })

    it('should return empty array for text without links', () => {
      const text = 'This is just regular text without any links'
      const links = extractLinksFromMessage(text)
      
      expect(links).toEqual([])
    })

    it('should handle complex URLs with query parameters', () => {
      const text = 'Here is a complex URL: https://example.com/path?param1=value1&param2=value2#section'
      const links = extractLinksFromMessage(text)
      
      expect(links).toEqual([
        'https://example.com/path?param1=value1&param2=value2#section'
      ])
    })

    it('should ignore malformed URLs', () => {
      const text = 'This has a malformed URL: htp://broken.com'
      const links = extractLinksFromMessage(text)
      
      expect(links).toEqual([])
    })
  })

  describe('isValidUrl', () => {
    it('should return true for valid HTTP URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true)
    })

    it('should return true for valid HTTPS URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
    })

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('ftp://example.com')).toBe(false)
      expect(isValidUrl('')).toBe(false)
    })
  })

  describe('shouldProcessUrl', () => {
    it('should return true for processable URLs', () => {
      expect(shouldProcessUrl('https://example.com/article')).toBe(true)
      expect(shouldProcessUrl('http://news.com/story')).toBe(true)
    })

    it('should return false for excluded domains', () => {
      expect(shouldProcessUrl('https://slack.com/some-page')).toBe(false)
      expect(shouldProcessUrl('https://files.slack.com/file')).toBe(false)
      expect(shouldProcessUrl('http://localhost:3000/test')).toBe(false)
    })

    it('should handle malformed URLs gracefully', () => {
      expect(shouldProcessUrl('not-a-url')).toBe(false)
    })
  })
})