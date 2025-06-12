import axios from 'axios'
import * as cheerio from 'cheerio'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

export async function extractTextFromUrl(url) {
  // Validate URL
  try {
    new URL(url)
  } catch {
    throw new Error('Invalid URL format')
  }

  // Check for obvious non-article URLs
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

  try {
    console.log(`🔍 Extracting text from: ${url}`)

    // Configure axios with better settings
    const response = await axios.get(url, {
      timeout: 30000, // 30 second timeout
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TaansenBot/1.0; +https://taansen.ai)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      maxContentLength: 10 * 1024 * 1024, // 10MB limit
    })

    const html = response.data
    
    if (!html || typeof html !== 'string') {
      throw new Error('Invalid response content')
    }

    // Check content type
    const contentType = response.headers['content-type'] || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error(`Unsupported content type: ${contentType}`)
    }

    console.log(`📄 Retrieved ${html.length} characters from ${url}`)

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
        maxElemsToParse: 0, // No limit
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
        
        console.log(`✅ Readability extracted ${cleanText.length} characters`)
        return cleanText
      }
    } catch (readabilityError) {
      console.log(`⚠️ Readability failed: ${readabilityError.message}`)
    }

    // Fallback to manual extraction with cheerio
    console.log('🔄 Trying manual extraction...')
    const $ = cheerio.load(html)

    // Remove unwanted elements
    $(
      'script, style, nav, footer, header, aside, .ad, .advertisement, ' +
      '.sidebar, .comments, .social-share, .related-posts, .newsletter, ' +
      '.popup, .modal, .cookie-notice, .gdpr-notice, iframe, embed, object'
    ).remove()

    // Try multiple content selectors in order of preference
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

    let extractedText = ''
    
    for (const selector of contentSelectors) {
      const element = $(selector)
      if (element.length > 0) {
        extractedText = element.text()
        if (extractedText.length > 500) {
          console.log(`✅ Found content using selector: ${selector}`)
          break
        }
      }
    }

    // If no specific content area found, try body but filter out navigation
    if (!extractedText || extractedText.length < 500) {
      console.log('🔄 Trying full body extraction...')
      
      // Remove more navigation elements
      $('nav, .navigation, .menu, .header, .footer, .sidebar').remove()
      extractedText = $('body').text()
    }

    if (!extractedText || extractedText.length < 100) {
      throw new Error('Insufficient content extracted (less than 100 characters)')
    }

    // Clean and normalize text
    const cleanText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .replace(/[^\S\n]+/g, ' ')
      .trim()

    // Validate content quality
    const wordCount = cleanText.split(/\s+/).length
    if (wordCount < 50) {
      throw new Error(`Content too short: only ${wordCount} words`)
    }

    // Check for common paywall/login indicators
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

    console.log(`✅ Successfully extracted ${cleanText.length} characters (${wordCount} words)`)
    return cleanText

  } catch (error) {
    console.error('❌ Text extraction error:', error.message)
    
    // Provide more specific error messages
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
    } else if (error.message.includes('paywall') || error.message.includes('login')) {
      throw error // Re-throw paywall errors as-is
    } else if (error.message.includes('Insufficient content')) {
      throw error // Re-throw content quality errors as-is
    } else {
      throw new Error(`Failed to extract article content: ${error.message}`)
    }
  }
}
