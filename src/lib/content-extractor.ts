import axios from 'axios'
import * as cheerio from 'cheerio'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import OpenAI from 'openai'


export interface ExtractedContent {
  title: string
  text: string
  url: string
  excerpt: string
}

export async function extractContentFromUrl(url: string): Promise<ExtractedContent> {
  // Set overall timeout for entire extraction process
  const overallTimeout = 30000 // 30 seconds total
  const startTime = Date.now()
  
  try {
    // Try ScrapingBee first if API key is available
    if (process.env.SCRAPINGBEE_API_KEY) {
      try {
        // Check if we've exceeded overall timeout
        if (Date.now() - startTime > overallTimeout) {
          throw new Error('Content extraction timed out')
        }
        
        const content = await scrapeWithScrapingBee(url)
        if (content) {
          return content
        }
      } catch (apiError) {
        console.log('ScrapingBee failed, falling back to Readability API:', apiError)
      }
    }

    // Check timeout before Readability API
    if (Date.now() - startTime > overallTimeout) {
      throw new Error('Content extraction timed out')
    }

    // Try Readability API as fallback
    if (process.env.READABILITY_API_KEY && process.env.READABILITY_API_URL) {
      try {
        const response = await axios.get(process.env.READABILITY_API_URL, {
          params: { url },
          headers: {
            'Authorization': `Bearer ${process.env.READABILITY_API_KEY}`
          },
          timeout: 10000 // Shorter timeout
        })

        if (response.data && response.data.title) {
          const cleanText = cleanContent(response.data.content || response.data.excerpt || '')
          return {
            title: response.data.title,
            text: cleanText,
            url,
            excerpt: cleanText.length > 300 ? cleanText.substring(0, 300) + '...' : cleanText
          }
        }
      } catch (apiError) {
        console.log('Readability API failed, falling back to scraping:', apiError)
      }
    }

    // Check timeout before final fallback
    if (Date.now() - startTime > overallTimeout) {
      throw new Error('Content extraction timed out')
    }

    // Final fallback to direct scraping with Readability library
    return await scrapeWithReadability(url)
  } catch (error: any) {
    console.error('Content extraction failed:', error)
    throw new Error(`Content extraction failed: ${error.message}`)
  }
}

async function scrapeWithScrapingBee(url: string): Promise<ExtractedContent | null> {
  if (!process.env.SCRAPINGBEE_API_KEY) {
    return null
  }

  try {
    // Use ScrapingBee API directly with axios - optimized for speed
    const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: process.env.SCRAPINGBEE_API_KEY,
        url: url,
        render_js: '0', // Disable JS rendering for speed
        wait: '1000' // Shorter wait time
      },
      timeout: 60000, // Allow more time for post-processing
      responseType: 'arraybuffer'
    })

    if (response.status !== 200) {
      throw new Error(`ScrapingBee returned status ${response.status}`)
    }

    const html = response.data.toString()
    
    // Use Readability to extract clean content from the scraped HTML
    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article || !article.textContent || article.textContent.length < 100) {
      throw new Error('Insufficient content extracted by ScrapingBee')
    }

    const cleanText = cleanContent(article.textContent)
    const title = article.title || extractTitleFromHtml(html) || 'Untitled Article'

    return {
      title: cleanTitle(title),
      text: cleanText,
      url,
      excerpt: cleanText.length > 300 ? cleanText.substring(0, 300) + '...' : cleanText
    }
  } catch (error: any) {
    console.error('ScrapingBee error:', error.message)
    if (error.response) {
      console.error('ScrapingBee response status:', error.response.status)
      console.error('ScrapingBee response data:', error.response.data?.toString())
    }
    return null
  }
}

async function scrapeWithReadability(url: string): Promise<ExtractedContent> {
  // Validate URL
  try {
    new URL(url)
  } catch {
    throw new Error('Invalid URL format')
  }

  // Simple request with standard headers
  const response = await axios.get(url, {
    timeout: 10000, // Shorter timeout
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br'
    },
    maxRedirects: 5
  })

  const html = response.data
  
  if (!html || typeof html !== 'string') {
    throw new Error('Invalid response content')
  }

  // Use Readability to extract content
  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (!article || !article.textContent || article.textContent.length < 100) {
    throw new Error('Insufficient content extracted')
  }

  const cleanText = cleanContent(article.textContent)
  const title = article.title || extractTitleFromHtml(html) || 'Untitled Article'

  return {
    title: cleanTitle(title),
    text: cleanText,
    url,
    excerpt: cleanText.length > 300 ? cleanText.substring(0, 300) + '...' : cleanText
  }
}

function cleanContent(text: string): string {
  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove HTML entities
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    // Remove iframe and embed artifacts
    .replace(/iframe\s+src[^>]*>/gi, '')
    .replace(/embed\s+[^>]*>/gi, '')
    .replace(/\bsrc\s*=\s*['""][^'"]*['"]/gi, '')
    .replace(/\bwidth\s*=\s*['""]?[^'">\s]*['""]?/gi, '')
    .replace(/\bheight\s*=\s*['""]?[^'">\s]*['""]?/gi, '')
    .replace(/\bframeborder\s*=\s*['""]?[^'">\s]*['""]?/gi, '')
    .replace(/\bscrolling\s*=\s*['""]?[^'">\s]*['""]?/gi, '')
    .replace(/\btitle\s*=\s*['""][^'"]*['"]/gi, '')
    // Remove ad and promotional content
    .replace(/\bAdvertisement\b/gi, '')
    .replace(/\bSponsored\b/gi, '')
    .replace(/\bPromoted\s+Content\b/gi, '')
    .replace(/\bClick\s+here\b/gi, '')
    .replace(/\bSubscribe\s+now\b/gi, '')
    .replace(/\bSign\s+up\b/gi, '')
    .replace(/\bFollow\s+us\b/gi, '')
    .replace(/\bShare\s+this\b/gi, '')
    .replace(/\bRelated\s+Stories\b/gi, '')
    .replace(/\bYou\s+Might\s+Also\s+Like\b/gi, '')
    .replace(/\bRecommended\s+for\s+You\b/gi, '')
    .replace(/\bTrending\s+Now\b/gi, '')
    .replace(/\bMost\s+Popular\b/gi, '')
    // Remove navigation elements
    .replace(/\bHome\s*>\s*[\w\s>]+\b/gi, '')
    .replace(/\bMenu\s+toggle\b/gi, '')
    .replace(/\bSearch\s+form\b/gi, '')
    .replace(/\bLogin\s*\/\s*Register\b/gi, '')
    // Remove image credits
    .replace(/\bGetty\s+Images?\b/gi, '')
    .replace(/\bShutterstock\b/gi, '')
    .replace(/\bUnsplash\b/gi, '')
    .replace(/\bPhoto\s+by\b/gi, '')
    .replace(/\bImage\s+by\b/gi, '')
    .replace(/\bCourtesy\s+of\b/gi, '')
    .replace(/\bCredit:\b/gi, '')
    .replace(/\bPhoto\s+credit\b/gi, '')
    .replace(/\bImage\s+credit\b/gi, '')
    .replace(/\b©\s*\d{4}\b/gi, '')
    .replace(/\bCopyright\b/gi, '')
    .replace(/\bAll\s+rights\s+reserved\b/gi, '')
    // Remove URLs
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/www\.[^\s]+/g, '')
    // Remove technical attributes
    .replace(/\b(src|width|height|frameborder|scrolling|title)\s*[:=]\s*[^\s]*/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\.{3,}/g, '...')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim()
}

function extractTitleFromHtml(html: string): string {
  const $ = cheerio.load(html)
  
  // Try meta tags first
  const ogTitle = $('meta[property="og:title"]').attr('content')
  if (ogTitle) return ogTitle.trim()
  
  const twitterTitle = $('meta[name="twitter:title"]').attr('content')
  if (twitterTitle) return twitterTitle.trim()
  
  // Try heading tags
  const h1 = $('h1').first().text()
  if (h1) return h1.trim()
  
  // Fallback to page title
  const title = $('title').text()
  if (title) return title.trim()
  
  return 'Untitled Article'
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-–—|]\s*.+$/, '') // Remove site name after separator
    .replace(/\s+/g, ' ')
    .trim()
}

export async function summarizeForAudio(text: string, maxWords: number = 200): Promise<string> {
  const words = text.split(/\s+/)
  
  // If text is already short enough, return as-is
  if (words.length <= maxWords) {
    return text
  }

  try {
    // Use OpenAI for high-quality editorial summarization
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const prompt = `Create a professional, concise summary of this article suitable for audio narration. Focus on the main points, key facts, and important context. Keep it under ${maxWords} words and make it engaging for listeners:

${text.substring(0, 12000)}` // Limit input to avoid token limits

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ 
        role: "user", 
        content: prompt 
      }],
      max_tokens: Math.ceil(maxWords * 1.5),
      temperature: 0.3,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    })

    const summary = response.choices[0]?.message?.content?.trim()
    
    if (summary && summary.length > 0) {
      const summaryWords = summary.split(/\s+/)
      if (summaryWords.length > maxWords) {
        return summaryWords.slice(0, maxWords).join(' ') + '...'
      }
      return summary
    }
    
    // Fallback to extractive summarization
    return fallbackSummarizeForAudio(text, maxWords)
    
  } catch (error) {
    console.error('OpenAI summarization error:', error)
    return fallbackSummarizeForAudio(text, maxWords)
  }
}

function fallbackSummarizeForAudio(text: string, maxWords: number = 200): string {
  const words = text.split(/\s+/)
  
  if (words.length <= maxWords) {
    return text
  }

  // Smart extractive summarization
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  
  // Score sentences for importance
  const scoredSentences = sentences.map(sentence => {
    let score = 0
    const lowerSentence = sentence.toLowerCase()
    
    // Boost sentences with editorial keywords
    const editorialKeywords = ['said', 'announced', 'reported', 'according', 'revealed', 'explained', 'stated']
    editorialKeywords.forEach(keyword => {
      if (lowerSentence.includes(keyword)) score += 2
    })
    
    // Boost sentences with numbers/data
    if (/\d+/.test(sentence)) score += 1
    
    // Penalty for very short or very long sentences
    const wordCount = sentence.split(/\s+/).length
    if (wordCount < 5 || wordCount > 30) score -= 1
    
    return { sentence: sentence.trim(), score, wordCount }
  })
  
  // Sort by score and select best sentences within word limit
  scoredSentences.sort((a, b) => b.score - a.score)
  
  let summary = ''
  let wordCount = 0
  
  for (const item of scoredSentences) {
    if (wordCount + item.wordCount > maxWords) {
      break
    }
    summary += item.sentence + '. '
    wordCount += item.wordCount
  }
  
  return summary.trim() || text.substring(0, maxWords * 6)
}