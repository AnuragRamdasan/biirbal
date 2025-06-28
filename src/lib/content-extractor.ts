import axios from 'axios'
import * as cheerio from 'cheerio'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

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
          timeout: 30000
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
  } catch (error: any) {
    console.error('Content extraction failed:', error)
    
    // Provide more specific error messages and throw to stop workflow
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Unable to connect to the website. Please check if the URL is accessible.')
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('Request timed out. The website may be slow or unresponsive.')
    } else if (error.response?.status === 403) {
      throw new Error('Access forbidden. The website may be blocking automated requests.')
    } else if (error.response?.status === 404) {
      throw new Error('Article not found. The URL may be incorrect or the content may have been removed.')
    } else if (error.response?.status >= 500) {
      throw new Error('The website is experiencing server issues. Please try again later.')
    } else if (error.message?.includes('paywall') || error.message?.includes('login')) {
      throw error // Re-throw paywall errors as-is
    } else if (error.message?.includes('Insufficient content')) {
      throw error // Re-throw content quality errors as-is
    } else {
      throw new Error(`Content extraction failed: ${error.message}`)
    }
  }
}

async function scrapeContent(url: string): Promise<ExtractedContent> {
  // Validate URL
  try {
    new URL(url)
  } catch {
    throw new Error('Invalid URL format')
  }

  // Check for non-article URLs
  const nonArticlePatterns = [
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|tar|gz)$/i,
    /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i,
    /\.(mp3|mp4|wav|avi|mkv|mov)$/i,
    /youtube\.com\/watch/i,
    /vimeo\.com/i,
    /twitter\.com/i,
    /facebook\.com/i,
    /instagram\.com/i,
  ]

  if (nonArticlePatterns.some(pattern => pattern.test(url))) {
    throw new Error('URL appears to be a media file or social media post, not an article')
  }

  // Try multiple user agents to bypass blocking
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Android 14; Mobile; rv:123.0) Gecko/123.0 Firefox/123.0',
    'curl/8.4.0',
    'Googlebot/2.1 (+http://www.google.com/bot.html)'
  ]

  // Special handling for certain domains
  const isMoneyControl = url.includes('moneycontrol.com')
  const isFinancialSite = url.includes('moneycontrol.com') || url.includes('bloomberg.com') || url.includes('reuters.com')

  let response: any = null
  let lastError: any = null

  for (let i = 0; i < userAgents.length; i++) {
    try {
      const headers: any = {
        'User-Agent': userAgents[i],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Connection': 'keep-alive',
        'DNT': '1',
      }

      // Add site-specific headers
      if (isMoneyControl) {
        headers['Referer'] = 'https://www.google.com/'
        headers['Sec-Ch-Ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"'
        headers['Sec-Ch-Ua-Mobile'] = '?0'
        headers['Sec-Ch-Ua-Platform'] = '"Windows"'
      }

      if (isFinancialSite) {
        headers['X-Requested-With'] = undefined // Remove any XHR indicators
        delete headers['DNT'] // Some financial sites block DNT requests
      }

      // Add random delay between requests to appear more human
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 3000))
      }

      response = await axios.get(url, {
        timeout: 30000,
        maxRedirects: 5,
        headers,
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
        validateStatus: (status) => status < 400, // Accept redirects
        proxy: false, // Disable proxy
        withCredentials: false, // No cookies
        decompress: true
      })
      
      // If we get here, the request was successful
      break
    } catch (error: any) {
      lastError = error
      console.log(`Attempt ${i + 1} failed with User-Agent: ${userAgents[i]}`)
      
      // If it's not a 403/blocking error, don't retry
      if (error.response?.status !== 403 && error.response?.status !== 429 && !error.message?.includes('blocked')) {
        throw error
      }
      
      // Wait longer before retrying with exponential backoff
      if (i < userAgents.length - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 10000) + Math.random() * 3000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  if (!response) {
    // Try one final attempt with a completely different approach
    try {
      console.log(`Final attempt for ${url} using basic fetch...`)
      
      const basicResponse = await axios.get(url, {
        headers: {
          'User-Agent': 'PostmanRuntime/7.32.3',
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        },
        timeout: 15000,
        maxRedirects: 3,
        validateStatus: () => true // Accept any status code
      })
      
      if (basicResponse.status === 200 && basicResponse.data) {
        response = basicResponse
      } else {
        throw lastError || new Error('Failed to fetch content after trying multiple user agents')
      }
    } catch (finalError) {
      throw lastError || new Error('Failed to fetch content after trying multiple user agents')
    }
  }

  const html = response.data
  
  if (!html || typeof html !== 'string') {
    throw new Error('Invalid response content')
  }

  // Check content type
  const contentType = response.headers['content-type'] || ''
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new Error(`Unsupported content type: ${contentType}`)
  }

  // Try Readability first (best for articles)
  try {
    const dom = new JSDOM(html, { 
      url,
      contentType: 'text/html',
      includeNodeLocations: false,
      storageQuota: 10000000
    })
    
    const reader = new Readability(dom.window.document, {
      debug: false,
      maxElemsToParse: 0,
      nbTopCandidates: 5,
      charThreshold: 500,
      classesToPreserve: ['highlight'],
    })
    
    const article = reader.parse()

    if (article && article.textContent && article.textContent.length > 500) {
      const cleanText = article.textContent
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim()
      
      const title = article.title || 'Extracted Article'
      const excerpt = cleanText.length > 300 ? cleanText.substring(0, 300) + '...' : cleanText
      
      return {
        title,
        text: cleanText,
        url,
        excerpt
      }
    }
  } catch (readabilityError) {
    console.log(`Readability failed: ${readabilityError}`)
  }

  // Fallback to cheerio extraction
  const $ = cheerio.load(html)

  // Remove unwanted elements
  $(
    'script, style, nav, footer, header, aside, .ad, .advertisement, ' +
    '.sidebar, .comments, .social-share, .related-posts, .newsletter, ' +
    '.popup, .modal, .cookie-notice, .gdpr-notice, iframe, embed, object'
  ).remove()

  // Extract title
  const title = $('title').text().trim() || 
                $('h1').first().text().trim() || 
                $('meta[property="og:title"]').attr('content') || 
                'Untitled'

  // Try multiple content selectors
  const contentSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.content',
    '.post-body',
    '.article-body',
    '.story-body',
    '#content',
    '#main',
    '.main-content',
  ]

  let text = ''
  
  for (const selector of contentSelectors) {
    const element = $(selector)
    if (element.length > 0) {
      text = element.text()
      if (text.length > 500) {
        break
      }
    }
  }

  // If no specific content area found, try body
  if (!text || text.length < 500) {
    $('nav, .navigation, .menu, .header, .footer, .sidebar').remove()
    text = $('body').text()
  }

  if (!text || text.length < 100) {
    throw new Error('Insufficient content extracted (less than 100 characters)')
  }

  // Clean and normalize text
  const cleanText = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim()

  // Validate content quality
  const wordCount = cleanText.split(/\s+/).length
  if (wordCount < 50) {
    throw new Error(`Content too short: only ${wordCount} words`)
  }

  // Check for paywall indicators
  const paywallIndicators = [
    'subscribe to continue reading',
    'please log in',
    'premium subscription required',
    'this content is for subscribers',
    'sign up to read',
    'register to continue',
    'paywall',
  ]

  const lowerText = cleanText.toLowerCase()
  if (paywallIndicators.some(indicator => lowerText.includes(indicator))) {
    throw new Error('Content appears to be behind a paywall or login requirement')
  }

  const excerpt = cleanText.length > 300 ? cleanText.substring(0, 300) + '...' : cleanText

  return {
    title,
    text: cleanText,
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