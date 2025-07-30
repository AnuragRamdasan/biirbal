import { 
  generateMetadata,
  generateOpenGraphTags,
  generateTwitterTags,
  generateStructuredData,
  generateCanonicalUrl
} from '@/lib/seo'

describe('SEO Utilities', () => {
  describe('generateMetadata', () => {
    it('should generate basic metadata', () => {
      const metadata = generateMetadata({
        title: 'Test Page',
        description: 'Test description'
      })

      expect(metadata.title).toBe('Test Page')
      expect(metadata.description).toBe('Test description')
    })

    it('should include default metadata', () => {
      const metadata = generateMetadata({
        title: 'Test Page'
      })

      expect(metadata.title).toBe('Test Page')
      expect(metadata.description).toBeDefined()
      expect(metadata.keywords).toBeDefined()
    })

    it('should handle custom keywords', () => {
      const metadata = generateMetadata({
        title: 'Test Page',
        keywords: ['custom', 'keywords']
      })

      expect(metadata.keywords).toContain('custom')
      expect(metadata.keywords).toContain('keywords')
    })
  })

  describe('generateOpenGraphTags', () => {
    it('should generate basic Open Graph tags', () => {
      const ogTags = generateOpenGraphTags({
        title: 'Test Page',
        description: 'Test description',
        url: 'https://example.com'
      })

      expect(ogTags['og:title']).toBe('Test Page')
      expect(ogTags['og:description']).toBe('Test description')
      expect(ogTags['og:url']).toBe('https://example.com')
      expect(ogTags['og:type']).toBe('website')
    })

    it('should include image when provided', () => {
      const ogTags = generateOpenGraphTags({
        title: 'Test Page',
        description: 'Test description',
        url: 'https://example.com',
        image: 'https://example.com/image.jpg'
      })

      expect(ogTags['og:image']).toBe('https://example.com/image.jpg')
    })

    it('should set correct type for articles', () => {
      const ogTags = generateOpenGraphTags({
        title: 'Test Article',
        description: 'Test description',
        url: 'https://example.com',
        type: 'article'
      })

      expect(ogTags['og:type']).toBe('article')
    })
  })

  describe('generateTwitterTags', () => {
    it('should generate basic Twitter Card tags', () => {
      const twitterTags = generateTwitterTags({
        title: 'Test Page',
        description: 'Test description'
      })

      expect(twitterTags['twitter:card']).toBe('summary')
      expect(twitterTags['twitter:title']).toBe('Test Page')
      expect(twitterTags['twitter:description']).toBe('Test description')
    })

    it('should use large image card when image provided', () => {
      const twitterTags = generateTwitterTags({
        title: 'Test Page',
        description: 'Test description',
        image: 'https://example.com/image.jpg'
      })

      expect(twitterTags['twitter:card']).toBe('summary_large_image')
      expect(twitterTags['twitter:image']).toBe('https://example.com/image.jpg')
    })

    it('should include site handle when provided', () => {
      const twitterTags = generateTwitterTags({
        title: 'Test Page',
        description: 'Test description',
        site: '@testsite'
      })

      expect(twitterTags['twitter:site']).toBe('@testsite')
    })
  })

  describe('generateStructuredData', () => {
    it('should generate basic structured data', () => {
      const structuredData = generateStructuredData({
        type: 'WebPage',
        name: 'Test Page',
        description: 'Test description',
        url: 'https://example.com'
      })

      expect(structuredData['@context']).toBe('https://schema.org')
      expect(structuredData['@type']).toBe('WebPage')
      expect(structuredData.name).toBe('Test Page')
      expect(structuredData.description).toBe('Test description')
      expect(structuredData.url).toBe('https://example.com')
    })

    it('should generate organization structured data', () => {
      const structuredData = generateStructuredData({
        type: 'Organization',
        name: 'Test Org',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png'
      })

      expect(structuredData['@type']).toBe('Organization')
      expect(structuredData.name).toBe('Test Org')
      expect(structuredData.logo).toBe('https://example.com/logo.png')
    })

    it('should generate article structured data', () => {
      const structuredData = generateStructuredData({
        type: 'Article',
        headline: 'Test Article',
        description: 'Test description',
        author: 'John Doe',
        datePublished: '2023-01-01'
      })

      expect(structuredData['@type']).toBe('Article')
      expect(structuredData.headline).toBe('Test Article')
      expect(structuredData.author).toBe('John Doe')
      expect(structuredData.datePublished).toBe('2023-01-01')
    })
  })

  describe('generateCanonicalUrl', () => {
    it('should generate canonical URL', () => {
      const canonicalUrl = generateCanonicalUrl('/test-page')
      expect(canonicalUrl).toMatch(/https?:\/\/.*\/test-page/)
    })

    it('should handle absolute URLs', () => {
      const canonicalUrl = generateCanonicalUrl('https://example.com/test-page')
      expect(canonicalUrl).toBe('https://example.com/test-page')
    })

    it('should normalize URLs', () => {
      const canonicalUrl = generateCanonicalUrl('/test-page/')
      expect(canonicalUrl).not.toMatch(/\/test-page\/$/)
      expect(canonicalUrl).toMatch(/\/test-page$/)
    })

    it('should handle query parameters', () => {
      const canonicalUrl = generateCanonicalUrl('/test-page?param=value')
      expect(canonicalUrl).toContain('/test-page')
      expect(canonicalUrl).not.toContain('?param=value')
    })
  })
})