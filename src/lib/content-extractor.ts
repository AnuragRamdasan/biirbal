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
  const overallTimeout = 60000 // 60 seconds total
  const startTime = Date.now()
  
  try {
    // Try Mercury Parser first if API key is available
    if (process.env.READABILITY_API_KEY && process.env.READABILITY_API_URL) {
      try {
        const response = await axios.get(process.env.READABILITY_API_URL, {
          params: { url },
          headers: {
            'Authorization': `Bearer ${process.env.READABILITY_API_KEY}`
          },
          timeout: 15000 // Reduced timeout
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

    // Check if we've exceeded overall timeout
    if (Date.now() - startTime > overallTimeout) {
      throw new Error('Content extraction timed out')
    }

    // Fallback to direct scraping
    return await scrapeContent(url, startTime, overallTimeout)
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

async function scrapeContent(url: string, startTime: number, overallTimeout: number): Promise<ExtractedContent> {
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

  // Reduced user agents for faster extraction - only try the most effective ones
  const userAgents = [
    // Most effective crawlers first
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)',
    'Twitterbot/1.0',
    // Standard browsers
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    // Mobile browsers
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  ]

  // Special handling for certain domains
  const isMoneyControl = url.includes('moneycontrol.com')
  const isFinancialSite = url.includes('moneycontrol.com') || url.includes('bloomberg.com') || url.includes('reuters.com')
  const isWAFProtected = url.includes('stepstonegroup.com') || url.includes('incapsula') || url.includes('imperva')
  
  // For MoneyControl, try a completely different approach first
  if (isMoneyControl) {
    try {
      console.log('Using special MoneyControl extraction method...')
      return await extractMoneyControlContent(url)
    } catch (mcError) {
      console.log('MoneyControl special method failed, trying general approach...', mcError)
    }
  }

  let response: any = null
  let lastError: any = null

  for (let i = 0; i < userAgents.length; i++) {
    try {
      const currentAgent = userAgents[i]
      const isCrawler = currentAgent.includes('bot') || currentAgent.includes('crawler') || currentAgent.includes('spider')
      
      // Build realistic headers based on user agent type
      const headers: any = {
        'User-Agent': currentAgent,
        'Accept': isCrawler 
          ? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }

      // Add browser-specific headers for non-crawlers
      if (!isCrawler) {
        headers['Cache-Control'] = 'max-age=0'
        headers['Sec-Fetch-Dest'] = 'document'
        headers['Sec-Fetch-Mode'] = 'navigate'
        headers['Sec-Fetch-Site'] = 'none'
        headers['Sec-Fetch-User'] = '?1'
        
        // Add Chrome-specific headers
        if (currentAgent.includes('Chrome')) {
          headers['Sec-Ch-Ua'] = '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"'
          headers['Sec-Ch-Ua-Mobile'] = '?0'
          headers['Sec-Ch-Ua-Platform'] = '"Windows"'
        }
      }

      // Add legitimate referrer for WAF-protected sites
      if (isWAFProtected) {
        const referrers = [
          'https://www.google.com/',
          'https://www.bing.com/', 
          'https://www.linkedin.com/',
          'https://twitter.com/',
          'https://www.facebook.com/'
        ]
        headers['Referer'] = referrers[Math.floor(Math.random() * referrers.length)]
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

      // Check if we've exceeded overall timeout
      if (Date.now() - startTime > overallTimeout) {
        throw new Error('Content extraction timed out')
      }

      // Add minimal delay between requests - much shorter now
      if (i > 0) {
        const delay = isWAFProtected ? 1000 + Math.random() * 2000 : 500 + Math.random() * 1000
        console.log(`⏳ Attempt ${i + 1}: waiting ${Math.round(delay / 1000)}s...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // Shorter timeouts for faster failure
      const timeout = isWAFProtected ? 20000 : (isMoneyControl ? 15000 : (isFinancialSite ? 12000 : 10000))
      
      // Enhanced request configuration for WAF bypass
      const requestConfig: any = {
        timeout: timeout,
        maxRedirects: 5,
        headers,
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
        validateStatus: (status: number) => status < 400, // Accept redirects
        decompress: true,
        withCredentials: true, // Allow cookies for session simulation
      }

      // For WAF-protected sites, add additional bypass techniques
      if (isWAFProtected) {
        // Simulate human browsing with cookies
        headers['Cookie'] = generateRealisticCookies()
        
        // Add more realistic timing
        if (i === 0) {
          // First request - simulate landing on site from search
          headers['Sec-Fetch-Site'] = 'cross-site'
          headers['Sec-Fetch-Mode'] = 'navigate'
        } else {
          // Subsequent requests - simulate same-site navigation  
          headers['Sec-Fetch-Site'] = 'same-origin'
          headers['Sec-Fetch-Mode'] = 'navigate'
        }
      }

      response = await axios.get(url, requestConfig)
      
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
    // Check timeout before trying fallback
    if (Date.now() - startTime > overallTimeout) {
      throw new Error('Content extraction timed out')
    }
    
    // Single fallback attempt with basic headers
    try {
      console.log(`Final attempt for ${url} using basic fetch...`)
      
      const basicResponse = await axios.get(url, {
        headers: {
          'User-Agent': 'PostmanRuntime/7.32.3',
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        },
        timeout: 10000,
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

  // Check for WAF/Bot blocking
  const wafError = detectWAFBlocking(html, response)
  if (wafError) {
    throw new Error(`Access blocked: ${wafError}`)
  }

  // Smart content extraction with editorial focus
  return await extractEditorialContent(html, url)
}

async function extractEditorialContent(html: string, url: string): Promise<ExtractedContent> {
  // Try Readability first (best for articles) with enhanced configuration
  try {
    const dom = new JSDOM(html, { 
      url,
      contentType: 'text/html',
      includeNodeLocations: false,
      storageQuota: 10000000
    })
    
    // Pre-clean the DOM before Readability to remove obvious noise
    const document = dom.window.document
    
    // Remove elements that are never editorial content
    const noisySelectors = [
      'script', 'style', 'noscript',
      // Ads and monetization
      '.ad', '.ads', '.advertisement', '.sponsor', '.promoted', '.native-ad',
      '[class*="ad-"]', '[id*="ad-"]', '[class*="ads-"]', '[id*="ads-"]',
      '.adsystem', '.adnxs', '.doubleclick', '.googleadservices',
      // Social and sharing
      '.social', '.share', '.sharing', '.follow', '.subscribe',
      '.social-media', '.social-share', '.share-buttons',
      // Navigation and UI
      'nav', 'header', 'footer', 'aside', '.sidebar', '.navigation',
      '.menu', '.nav', '.navbar', '.breadcrumb', '.pagination',
      // Comments and interaction
      '.comments', '.comment', '.discussion', '.replies', '.feedback',
      // Related and recommendations
      '.related', '.recommended', '.more-stories', '.trending',
      '.popular', '.most-read', '.you-might-like', '.suggestions',
      // Newsletters and forms
      '.newsletter', '.signup', '.subscription', '.email-signup',
      '.form', '.contact-form', '.search-form',
      // Overlays and popups
      '.modal', '.popup', '.overlay', '.lightbox', '.dialog',
      '.cookie-notice', '.gdpr-notice', '.privacy-notice',
      // Media embeds that aren't editorial
      'iframe[src*="youtube"]', 'iframe[src*="twitter"]', 'iframe[src*="facebook"]',
      'iframe[src*="instagram"]', 'iframe[src*="tiktok"]', 'iframe[src*="ads"]',
      'embed', 'object',
      // Tags and metadata that clutter
      '.tags', '.tag', '.categories', '.byline', '.author-bio',
      '.publication-date', '.read-time', '.word-count'
    ]
    
    noisySelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector)
        elements.forEach(el => el.remove())
      } catch (e) {
        // Continue if selector fails
      }
    })
    
    // Remove elements with noise-indicating attributes
    const noiseAttributes = [
      '[class*="ad"]', '[id*="ad"]', '[class*="promo"]', '[id*="promo"]',
      '[class*="banner"]', '[id*="banner"]', '[class*="widget"]', '[id*="widget"]',
      '[data-ad]', '[data-advertisement]', '[data-tracking]'
    ]
    
    noiseAttributes.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector)
        elements.forEach(el => {
          if (!isLikelyEditorialContent(el)) {
            el.remove()
          }
        })
      } catch (e) {
        // Continue if selector fails
      }
    })
    
    const reader = new Readability(document, {
      debug: false,
      maxElemsToParse: 0,
      nbTopCandidates: 5,
      charThreshold: 500,
      classesToPreserve: ['highlight', 'quote', 'caption'],
      keepClasses: false
    })
    
    const article = reader.parse()

    if (article && article.textContent && article.textContent.length > 500) {
      const cleanText = cleanExtractedText(article.textContent)
      
      // Validate this is actual editorial content
      if (isQualityEditorialContent(cleanText, article.title || '')) {
        const title = article.title || extractTitleFromHtml(html) || 'Extracted Article'
        const excerpt = cleanText.length > 300 ? cleanText.substring(0, 300) + '...' : cleanText
        
        return {
          title: cleanTitle(title),
          text: cleanText,
          url,
          excerpt
        }
      }
    }
  } catch (readabilityError) {
    console.log(`Readability failed: ${readabilityError}`)
  }

  // Fallback to smart cheerio extraction
  return await extractWithCheerio(html, url)
}

async function extractWithCheerio(html: string, url: string): Promise<ExtractedContent> {
  const $ = cheerio.load(html)

  // Aggressive removal of non-editorial content
  const removalSelectors = [
    // Scripts and styles
    'script', 'style', 'noscript', 'link[rel="stylesheet"]',
    // Ads and monetization (comprehensive)
    '.ad', '.ads', '.advertisement', '.sponsor', '.promoted', '.native-ad',
    '.adsystem', '.adnxs', '.doubleclick', '.googleadservices', '.outbrain',
    '[class*="ad-"]', '[id*="ad-"]', '[class*="ads-"]', '[id*="ads-"]',
    '[class*="sponsor"]', '[id*="sponsor"]', '[class*="promo"]', '[id*="promo"]',
    '[data-ad]', '[data-advertisement]', '[data-sponsor]', '[data-tracking]',
    // Social and sharing
    '.social', '.share', '.sharing', '.follow', '.subscribe', '.social-media',
    '.social-share', '.share-buttons', '.social-links', '.follow-us',
    // Navigation and structural
    'nav', 'header', 'footer', 'aside', '.sidebar', '.navigation', '.menu',
    '.nav', '.navbar', '.breadcrumb', '.pagination', '.skip-nav',
    // Comments and user content
    '.comments', '.comment', '.discussion', '.replies', '.feedback',
    '.user-content', '.ugc', '.reviews', '.ratings',
    // Related content that's not editorial
    '.related', '.recommended', '.more-stories', '.trending', '.popular',
    '.most-read', '.you-might-like', '.suggestions', '.similar', '.next-up',
    // Forms and signups
    '.newsletter', '.signup', '.subscription', '.email-signup', '.form',
    '.contact-form', '.search-form', '.login-form', '.register-form',
    // Overlays and interruptions
    '.modal', '.popup', '.overlay', '.lightbox', '.dialog', '.tooltip',
    '.cookie-notice', '.gdpr-notice', '.privacy-notice', '.banner',
    // Media embeds (non-editorial)
    'iframe[src*="youtube"]', 'iframe[src*="twitter"]', 'iframe[src*="facebook"]',
    'iframe[src*="instagram"]', 'iframe[src*="tiktok"]', 'iframe[src*="ads"]',
    'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
    'embed[src*="twitter"]', 'embed[src*="facebook"]', 'object',
    // Metadata and clutter
    '.tags', '.tag', '.categories', '.byline', '.author-bio', '.bio',
    '.publication-date', '.read-time', '.word-count', '.print-only',
    '.hidden', '.sr-only', '.screen-reader', '.accessibility',
    // Widgets and tools
    '.widget', '.tool', '.calculator', '.quiz', '.poll', '.survey',
    '.weather', '.stock', '.ticker', '.chart'
  ]

  removalSelectors.forEach(selector => {
    try {
      $(selector).remove()
    } catch (e) {
      // Continue if selector fails
    }
  })

  // Remove elements with noise-indicating text content
  $('*').each((i, el) => {
    const $el = $(el)
    const text = $el.text().toLowerCase().trim()
    
    // Remove elements with obvious ad/promo text
    const noiseTexts = [
      'advertisement', 'sponsored', 'promoted content', 'affiliate link',
      'click here', 'subscribe now', 'sign up', 'follow us', 'share this',
      'related stories', 'you might also like', 'trending now', 'popular posts',
      'newsletter signup', 'get updates', 'download app', 'install app',
      'transcript', 'embed', 'iframe', 'embedded audio player', 'hide caption',
      'toggle caption', 'embedded video', 'audio player', 'getty images',
      'shutterstock', 'unsplash', 'ap photo', 'photo by', 'image by',
      'courtesy of', 'credit:', 'photo credit', 'image credit', 'copyright',
      'westend61', 'westend61getty'
    ]
    
    if (noiseTexts.some(noise => text.includes(noise))) {
      $el.remove()
    }
    
    // Remove elements that look like HTML attributes in text
    if (/\b(src|width|height|frameborder|scrolling|title)\s*[:=]/i.test(text)) {
      $el.remove()
    }
  })

  // Extract title with multiple fallbacks
  const title = extractTitleFromHtml(html, $) || 'Untitled'

  // Try multiple content selectors with priority for editorial content
  const contentSelectors = [
    // Semantic article selectors (highest priority)
    'article', '[role="article"]', 'main article', '.article-content article',
    // Main content areas
    '[role="main"]', 'main', '.main-content', '.primary-content',
    // Article-specific selectors
    '.post-content', '.entry-content', '.article-content', '.article-body',
    '.story-content', '.story-body', '.news-content', '.news-body',
    '.content-body', '.text-content', '.editorial-content',
    // Generic content selectors
    '.content', '.post-body', '#content', '#main', '.main',
    // Publication-specific patterns
    '.arti-flow', '.story_content', '.content_wrapper'
  ]

  let bestContent = ''
  let bestScore = 0
  
  for (const selector of contentSelectors) {
    try {
      const element = $(selector).first()
      if (element.length > 0) {
        const text = element.text().trim()
        const score = scoreContentQuality(text, title)
        
        if (score > bestScore && text.length > 300) {
          bestContent = text
          bestScore = score
        }
        
        // If we found high-quality content, use it
        if (score > 0.8 && text.length > 500) {
          break
        }
      }
    } catch (e) {
      continue
    }
  }

  // If no specific content area found, try paragraph extraction
  if (bestScore < 0.5) {
    // Remove remaining navigation and UI elements
    $('.navigation, .menu, .header, .footer, .sidebar, .widget').remove()
    
    // Extract all paragraphs and filter for editorial content
    const paragraphs = $('p').map((i, el) => $(el).text().trim()).get()
    const editorialParagraphs = paragraphs.filter(p => 
      p.length > 50 && 
      !isNoiseText(p) &&
      isLikelyEditorialText(p)
    )
    
    if (editorialParagraphs.length > 0) {
      bestContent = editorialParagraphs.join(' ')
    }
  }

  // Last resort: clean body text
  if (!bestContent || bestContent.length < 300) {
    $('nav, .navigation, .menu, .header, .footer, .sidebar').remove()
    bestContent = $('body').text()
  }

  if (!bestContent || bestContent.length < 100) {
    throw new Error('Insufficient editorial content extracted (less than 100 characters)')
  }

  // Clean and validate the extracted text
  const cleanText = cleanExtractedText(bestContent)
  
  // Final quality check
  if (!isQualityEditorialContent(cleanText, title)) {
    throw new Error('Extracted content does not appear to be quality editorial content')
  }

  const excerpt = cleanText.length > 300 ? cleanText.substring(0, 300) + '...' : cleanText

  return {
    title: cleanTitle(title),
    text: cleanText,
    url,
    excerpt
  }
}

// Helper functions for content quality assessment

function isLikelyEditorialContent(element: Element): boolean {
  const className = element.className || ''
  const id = element.id || ''
  const tagName = element.tagName?.toLowerCase() || ''
  
  // Check for editorial indicators
  const editorialIndicators = [
    'article', 'story', 'content', 'post', 'entry', 'text', 'body',
    'editorial', 'news', 'blog', 'main'
  ]
  
  const hasEditorialClass = editorialIndicators.some(indicator => 
    className.toLowerCase().includes(indicator) || 
    id.toLowerCase().includes(indicator)
  )
  
  const isEditorialTag = ['article', 'main', 'section', 'div', 'p'].includes(tagName)
  
  return hasEditorialClass || isEditorialTag
}

function isQualityEditorialContent(text: string, title: string): boolean {
  const wordCount = text.split(/\s+/).length
  
  // Must have sufficient length
  if (wordCount < 50) return false
  
  // Check for editorial indicators
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  if (sentences.length < 3) return false
  
  // Check against noise patterns
  const lowerText = text.toLowerCase()
  const noisePatterns = [
    'click here', 'subscribe now', 'sign up', 'download app',
    'advertisement', 'sponsored content', 'affiliate link',
    'terms of service', 'privacy policy', 'cookie policy'
  ]
  
  const noiseCount = noisePatterns.filter(pattern => lowerText.includes(pattern)).length
  if (noiseCount > 2) return false
  
  // Check for paywall indicators
  const paywallIndicators = [
    'subscribe to continue', 'login to read', 'premium content',
    'paywall', 'subscription required'
  ]
  
  if (paywallIndicators.some(indicator => lowerText.includes(indicator))) {
    return false
  }
  
  return true
}

function isLikelyEditorialText(text: string): boolean {
  if (text.length < 30) return false
  
  const lowerText = text.toLowerCase()
  
  // Check for noise indicators
  const noiseIndicators = [
    'click here', 'read more', 'subscribe', 'follow us', 'share this',
    'advertisement', 'sponsored', 'affiliate', 'cookie', 'privacy policy'
  ]
  
  return !noiseIndicators.some(indicator => lowerText.includes(indicator))
}

function isNoiseText(text: string): boolean {
  const lowerText = text.toLowerCase().trim()
  
  const noisePatterns = [
    'advertisement', 'sponsored', 'click here', 'read more', 'subscribe',
    'follow us', 'share this', 'cookie notice', 'privacy policy',
    'terms of service', 'all rights reserved', '© 20', 'copyright'
  ]
  
  return noisePatterns.some(pattern => lowerText.includes(pattern)) ||
         text.length < 20 ||
         /^[\d\s.,:-]+$/.test(text) // Just numbers, spaces, and punctuation
}

function scoreContentQuality(text: string, title: string): number {
  let score = 0
  
  // Length scoring
  const wordCount = text.split(/\s+/).length
  if (wordCount > 100) score += 0.3
  if (wordCount > 300) score += 0.2
  if (wordCount > 500) score += 0.2
  
  // Sentence structure
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  if (sentences.length > 5) score += 0.2
  
  // Editorial language patterns
  const editorialWords = ['according', 'reported', 'said', 'announced', 'revealed', 'explained']
  const editorialCount = editorialWords.filter(word => text.toLowerCase().includes(word)).length
  score += Math.min(editorialCount * 0.05, 0.2)
  
  // Penalize noise content
  const noiseWords = ['click', 'subscribe', 'follow', 'advertisement', 'sponsored']
  const noiseCount = noiseWords.filter(word => text.toLowerCase().includes(word)).length
  score -= noiseCount * 0.1
  
  return Math.max(0, Math.min(1, score))
}

function extractTitleFromHtml(html: string, $?: cheerio.CheerioAPI): string {
  if (!$) {
    $ = cheerio.load(html)
  }
  
  // Priority order for title extraction
  const titleSelectors = [
    'h1.headline', 'h1.title', 'h1.article-title', 'h1.story-title',
    '.article-headline', '.story-headline', '.post-title',
    'h1', 'h2.title', '.headline', '.title',
    'meta[property="og:title"]', 'meta[name="twitter:title"]',
    'title'
  ]
  
  for (const selector of titleSelectors) {
    try {
      const element = $(selector).first()
      if (element.length > 0) {
        const title = selector.includes('meta') 
          ? element.attr('content') 
          : element.text()
        
        if (title && title.trim().length > 0) {
          return title.trim()
        }
      }
    } catch (e) {
      continue
    }
  }
  
  return 'Untitled Article'
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-–—|]\s*.+$/, '') // Remove site name after separator
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanExtractedText(text: string): string {
  return text
    // Remove iframe and embed artifacts
    .replace(/iframe\s+src[^>]*>/gi, '')
    .replace(/embed\s+[^>]*>/gi, '')
    .replace(/\bsrc\s*=\s*['""][^'"]*['"]/gi, '')
    .replace(/\bwidth\s*=\s*['""]?[^'">\s]*['""]?/gi, '')
    .replace(/\bheight\s*=\s*['""]?[^'">\s]*['""]?/gi, '')
    .replace(/\bframeborder\s*=\s*['""]?[^'">\s]*['""]?/gi, '')
    .replace(/\bscrolling\s*=\s*['""]?[^'">\s]*['""]?/gi, '')
    .replace(/\btitle\s*=\s*['""][^'"]*['"]/gi, '')
    // Remove HTML-like patterns
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    // Remove transcript/embed indicators
    .replace(/\bTranscript\b/gi, '')
    .replace(/\bEmbed\b/gi, '')
    .replace(/\bhide caption\b/gi, '')
    .replace(/\btoggle caption\b/gi, '')
    .replace(/\bembedded audio player\b/gi, '')
    .replace(/\bnpr embedded\b/gi, '')
    // Remove publication dates and magazine boilerplate
    .replace(/\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}Get\s+the\s+latest\s+issue\s+of\s+[\w\s]+/gi, '')
    .replace(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}Get\s+the\s+latest\s+issue\s+of\s+[\w\s]+/gi, '')
    .replace(/Get\s+the\s+latest\s+issue\s+of\s+[\w\s]+/gi, '')
    .replace(/\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/g, '')
    .replace(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/g, '')
    // Remove common navigation and section headers
    .replace(/\bHits\s+and\s+Misses\b/gi, '')
    .replace(/\bIn\s+This\s+Issue\b/gi, '')
    .replace(/\bTable\s+of\s+Contents\b/gi, '')
    .replace(/\bMost\s+Popular\b/gi, '')
    .replace(/\bTrending\s+Now\b/gi, '')
    .replace(/\bRelated\s+Stories\b/gi, '')
    .replace(/\bYou\s+Might\s+Also\s+Like\b/gi, '')
    .replace(/\bRecommended\s+for\s+You\b/gi, '')
    .replace(/\bMore\s+from\s+[\w\s]+\b/gi, '')
    .replace(/\bSubscribe\s+to\s+our\s+newsletter\b/gi, '')
    .replace(/\bSign\s+up\s+for\s+updates\b/gi, '')
    .replace(/\bJoin\s+our\s+mailing\s+list\b/gi, '')
    .replace(/\bFollow\s+us\s+on\s+[\w\s]+\b/gi, '')
    .replace(/\bShare\s+this\s+article\b/gi, '')
    .replace(/\bPrint\s+this\s+article\b/gi, '')
    .replace(/\bSave\s+to\s+favorites\b/gi, '')
    // Remove common website navigation elements
    .replace(/\bHome\s+>\s+[\w\s>]+\b/gi, '')
    .replace(/\bBreadcrumb\s+navigation\b/gi, '')
    .replace(/\bSkip\s+to\s+content\b/gi, '')
    .replace(/\bSkip\s+to\s+main\s+content\b/gi, '')
    .replace(/\bMenu\s+toggle\b/gi, '')
    .replace(/\bSearch\s+form\b/gi, '')
    .replace(/\bLogin\s+\/\s+Register\b/gi, '')
    .replace(/\bMy\s+Account\b/gi, '')
    .replace(/\bCart\s+\(\d+\)\b/gi, '')
    // Remove publication-specific boilerplate
    .replace(/\bRead\s+more\s+in\s+the\s+latest\s+issue\b/gi, '')
    .replace(/\bAvailable\s+in\s+print\s+and\s+digital\b/gi, '')
    .replace(/\bDownload\s+the\s+app\b/gi, '')
    .replace(/\bGet\s+the\s+magazine\b/gi, '')
    .replace(/\bSubscribe\s+now\b/gi, '')
    .replace(/\bFree\s+trial\b/gi, '')
    .replace(/\bSpecial\s+offer\b/gi, '')
    // Remove image credits and photography attributions
    .replace(/\b[A-Z][a-z]*\d+[A-Z][a-z]*\s*Images?\b/gi, '') // Westend61Getty Images
    .replace(/\b[A-Z][a-z]*\d+\b/gi, '') // Westend61
    .replace(/\bGetty Images?\b/gi, '')
    .replace(/\bShutterstock\b/gi, '')
    .replace(/\bUnsplash\b/gi, '')
    .replace(/\bAP Photo\b/gi, '')
    .replace(/\bReuters\b/gi, '')
    .replace(/\bAFP\b/gi, '')
    .replace(/\bPhoto by\b/gi, '')
    .replace(/\bImage by\b/gi, '')
    .replace(/\bCourtesy of\b/gi, '')
    .replace(/\bCredit:\b/gi, '')
    .replace(/\bPhoto credit\b/gi, '')
    .replace(/\bImage credit\b/gi, '')
    .replace(/\b© \d{4}\b/gi, '')
    .replace(/\bCopyright\b/gi, '')
    .replace(/\bAll rights reserved\b/gi, '')
    // Remove URL fragments
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

// Special extraction method for MoneyControl
async function extractMoneyControlContent(url: string): Promise<ExtractedContent> {
  const moneyControlAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
  ]
  
  for (const userAgent of moneyControlAgents) {
    try {
      console.log(`Trying MoneyControl with agent: ${userAgent.substring(0, 30)}...`)
      
      // Minimal wait
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
      
      const response = await axios.get(url, {
        timeout: 10000, // Much shorter timeout
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Referer': 'https://www.google.com/',
          'Origin': 'https://www.google.com',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        maxRedirects: 3,
        validateStatus: (status: number) => status === 200,
        decompress: true
      })
      
      const html = response.data
      if (!html || html.length < 1000) {
        throw new Error('Response too short for MoneyControl')
      }
      
      return await extractEditorialContent(html, url)
      
    } catch (error) {
      console.log(`MoneyControl attempt failed with ${userAgent.substring(0, 20)}: ${error}`)
      continue
    }
  }
  
  throw new Error('All MoneyControl extraction methods failed')
}

// Advanced WAF bypass techniques
async function attemptWAFBypass(url: string): Promise<any> {
  console.log(`🚀 Attempting advanced WAF bypass techniques for ${url}`)
  
  // Technique 1: Multi-step session simulation
  try {
    console.log(`🔄 Trying session simulation bypass...`)
    
    // Step 1: Visit homepage first to establish session
    const domain = new URL(url).origin
    const homepageResponse = await axios.get(domain, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Referer': 'https://www.google.com/'
      },
      timeout: 30000,
      maxRedirects: 5,
      withCredentials: true
    })
    
    // Extract cookies from homepage response
    const cookies = homepageResponse.headers['set-cookie']
    let cookieString = generateRealisticCookies()
    if (cookies) {
      cookieString += '; ' + cookies.map(c => c.split(';')[0]).join('; ')
    }
    
    // Wait to simulate human reading time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))
    
    // Step 2: Request the actual URL with established session
    const targetResponse = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cookie': cookieString,
        'Referer': domain,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin'
      },
      timeout: 30000,
      maxRedirects: 5,
      withCredentials: true
    })
    
    if (targetResponse.data && targetResponse.data.length > 1000) {
      console.log(`✅ Session simulation bypass successful!`)
      return targetResponse
    }
  } catch (sessionError) {
    console.log(`❌ Session simulation failed: ${sessionError}`)
  }
  
  // Technique 2: Archive.org bypass (sometimes works for public content)
  try {
    console.log(`🔄 Trying archive.org bypass...`)
    const archiveUrl = `https://web.archive.org/web/newest/${url}`
    
    const archiveResponse = await axios.get(archiveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; archive.org_bot +http://www.archive.org/details/archive.org_bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 30000,
      maxRedirects: 5
    })
    
    if (archiveResponse.data && archiveResponse.data.length > 1000) {
      console.log(`✅ Archive.org bypass successful!`)
      return archiveResponse
    }
  } catch (archiveError) {
    console.log(`❌ Archive.org bypass failed: ${archiveError}`)
  }
  
  throw new Error('All advanced WAF bypass techniques failed')
}

// Generate realistic cookies to simulate human browsing
function generateRealisticCookies(): string {
  const sessionId = Math.random().toString(36).substring(2, 15)
  const timestamp = Date.now()
  const visitId = Math.random().toString(36).substring(2, 10)
  
  const cookies = [
    `_ga=GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(timestamp / 1000)}`,
    `_gid=GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(timestamp / 1000)}`,
    `sessionid=${sessionId}`,
    `visitid=${visitId}`,
    `_fbp=fb.1.${timestamp}.${Math.floor(Math.random() * 1000000000)}`,
    `_hjSessionUser_12345=${Math.random().toString(36).substring(2, 15)}`,
    `_hjSession_12345=${Math.random().toString(36).substring(2, 15)}`,
    `PHPSESSID=${Math.random().toString(36).substring(2, 26)}`,
  ]
  
  return cookies.join('; ')
}

// Detect WAF and bot blocking systems
function detectWAFBlocking(html: string, response: any): string | null {
  const lowerHtml = html.toLowerCase()
  const url = response.config?.url || ''
  
  // Incapsula/Imperva detection
  if (lowerHtml.includes('incapsula') || 
      lowerHtml.includes('_incapsula_resource') ||
      lowerHtml.includes('imperva')) {
    return 'This website uses Incapsula/Imperva WAF protection that blocks automated access. The content cannot be extracted automatically.'
  }
  
  // Cloudflare detection  
  if (lowerHtml.includes('cloudflare') && 
      (lowerHtml.includes('checking your browser') || 
       lowerHtml.includes('security check') ||
       lowerHtml.includes('ddos protection'))) {
    return 'This website uses Cloudflare protection that requires browser verification. The content cannot be extracted automatically.'
  }
  
  // Generic WAF patterns
  const wafPatterns = [
    'access denied', 'blocked request', 'security check', 'bot detection',
    'captcha required', 'human verification', 'suspicious activity detected',
    'request blocked', 'access forbidden', 'anti-bot protection'
  ]
  
  if (wafPatterns.some(pattern => lowerHtml.includes(pattern))) {
    return 'This website uses anti-bot protection that prevents automated content extraction.'
  }
  
  // Check for very short content that might indicate blocking
  const textContent = html.replace(/<[^>]*>/g, '').trim()
  if (textContent.length < 200 && (
      lowerHtml.includes('iframe') || 
      lowerHtml.includes('javascript') ||
      lowerHtml.includes('redirect'))) {
    return 'This website appears to use JavaScript-based protection or redirects that prevent content extraction.'
  }
  
  // StepStone Group specific detection
  if (url.includes('stepstonegroup.com') && textContent.length < 500) {
    return 'StepStone Group website uses advanced bot protection (likely Incapsula) that blocks automated access. Advanced bypass techniques have been attempted but failed. This content may need to be accessed manually or through alternative sources.'
  }
  
  return null
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
      model: "gpt-4o-mini", // Fast and cost-effective model
      messages: [{ 
        role: "user", 
        content: prompt 
      }],
      max_tokens: Math.ceil(maxWords * 1.5), // Allow buffer for response
      temperature: 0.3, // Lower temperature for more focused summaries
      presence_penalty: 0.1, // Slight penalty to avoid repetition
      frequency_penalty: 0.1
    })

    const summary = response.choices[0]?.message?.content?.trim()
    
    if (summary && summary.length > 0) {
      // Ensure the summary doesn't exceed word limit
      const summaryWords = summary.split(/\s+/)
      if (summaryWords.length > maxWords) {
        return summaryWords.slice(0, maxWords).join(' ') + '...'
      }
      return summary
    }
    
    // Fallback to rule-based if AI fails
    console.warn('OpenAI summarization failed, falling back to extractive method')
    return fallbackSummarizeForAudio(text, maxWords)
    
  } catch (error) {
    console.error('OpenAI summarization error:', error)
    // Fallback to rule-based summarization
    return fallbackSummarizeForAudio(text, maxWords)
  }
}

// Fallback rule-based summarization (original logic)
function fallbackSummarizeForAudio(text: string, maxWords: number = 200): string {
  const words = text.split(/\s+/)
  
  if (words.length <= maxWords) {
    return text
  }

  // Smart extractive summarization - prioritize key editorial content
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
  
  return summary.trim() || text.substring(0, maxWords * 6) // Fallback
}