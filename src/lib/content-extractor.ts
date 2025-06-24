import axios from 'axios'
import * as cheerio from 'cheerio'

export interface ExtractedContent {
  title: string
  text: string
  url: string
  excerpt: string
}

export async function extractContentFromUrl(url: string): Promise<ExtractedContent> {
  try {
    // Try Mercury Parser first if API key is available
    if (process.env.READABILITY_API_KEY && process.env.READABILITY_API_URL) {
      try {
        const response = await axios.get(process.env.READABILITY_API_URL, {
          params: { url },
          headers: {
            'Authorization': `Bearer ${process.env.READABILITY_API_KEY}`
          },
          timeout: 10000
        })

        if (response.data && response.data.title) {
          return {
            title: response.data.title,
            text: response.data.content || response.data.excerpt || '',
            url,
            excerpt: response.data.excerpt || response.data.content?.substring(0, 300) || ''
          }
        }
      } catch (apiError) {
        console.log('Readability API failed, falling back to scraping:', apiError)
      }
    }

    // Fallback to direct scraping
    return await scrapeContent(url)
  } catch (error) {
    console.error('Content extraction failed:', error)
    throw new Error('Failed to extract content from URL')
  }
}

async function scrapeContent(url: string): Promise<ExtractedContent> {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SlackLinkBot/1.0; +https://your-domain.com/bot)'
    },
    timeout: 15000,
    maxContentLength: 10 * 1024 * 1024 // 10MB limit
  })

  const $ = cheerio.load(response.data)

  // Remove script and style elements
  $('script, style, nav, header, footer, .advertisement, .ads, .sidebar').remove()

  // Extract title
  const title = $('title').text().trim() || 
                $('h1').first().text().trim() || 
                $('meta[property="og:title"]').attr('content') || 
                'Untitled'

  // Extract main content
  const contentSelectors = [
    'article',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    'main',
    '.main-content'
  ]

  let text = ''
  for (const selector of contentSelectors) {
    const content = $(selector).first()
    if (content.length) {
      text = content.text().trim()
      break
    }
  }

  // Fallback to body if no main content found
  if (!text) {
    text = $('body').text().trim()
  }

  // Clean up text
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()

  if (!text) {
    throw new Error('No content found in URL')
  }

  const excerpt = text.length > 300 ? text.substring(0, 300) + '...' : text

  return {
    title,
    text,
    url,
    excerpt
  }
}

export function summarizeForAudio(text: string, maxWords: number = 200): string {
  const words = text.split(/\s+/)
  
  if (words.length <= maxWords) {
    return text
  }

  // Simple extractive summarization - take first paragraph and key sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  
  let summary = ''
  let wordCount = 0
  
  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length
    if (wordCount + sentenceWords > maxWords) {
      break
    }
    summary += sentence.trim() + '. '
    wordCount += sentenceWords
  }
  
  return summary.trim() || text.substring(0, maxWords * 6) // Fallback
}