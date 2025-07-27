import axios from 'axios'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import OpenAI from 'openai'
import { PROMPTS } from './prompts'

export interface ExtractedContent {
  title: string
  text: string
  url: string
  ogImage?: string
}

export async function extractContentFromUrl(url: string): Promise<ExtractedContent> {
  if (!process.env.SCRAPINGBEE_API_KEY) {
    throw new Error('SCRAPINGBEE_API_KEY is required')
  }

  try {
    console.log(`🕷️ Extracting content from: ${url}`)
    
    const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: process.env.SCRAPINGBEE_API_KEY,
        url: url,
        render_js: '0',
        wait: '1000'
      },
      timeout: 35000,
      responseType: 'arraybuffer'
    })

    if (response.status !== 200) {
      throw new Error(`ScrapingBee returned status ${response.status}`)
    }

    const html = response.data.toString()
    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article || !article.textContent || article.textContent.length < 100) {
      throw new Error('Insufficient content extracted')
    }

    const cleanText = cleanContent(article.textContent)
    const title = article.title || 'Untitled Article'
    const ogImage = extractOgImage(dom.window.document, url)

    console.log(`✅ Extracted ${cleanText.length} characters from: ${title}`)

    return {
      title: cleanTitle(title),
      ogImage,
      text: cleanText,
      url
    }
  } catch (error: any) {
    console.error('Content extraction failed:', error)
    
    // Enhanced error handling for ScrapingBee issues
    if (error.response) {
      const status = error.response.status
      const statusText = error.response.statusText || 'Unknown error'
      
      if (status === 500) {
        console.error('🚨 ScrapingBee server error (500) - retrying with fallback strategy')
        return await extractContentWithFallback(url)
      } else if (status === 429) {
        console.error('🚨 ScrapingBee rate limit exceeded (429)')
        throw new Error('Rate limit exceeded. Please try again later.')
      } else if (status >= 400 && status < 500) {
        console.error(`🚨 ScrapingBee client error (${status}): ${statusText}`)
        throw new Error(`Content extraction failed: Invalid request (${status})`)
      } else {
        console.error(`🚨 ScrapingBee unexpected status (${status}): ${statusText}`)
        throw new Error(`Content extraction failed: Service error (${status})`)
      }
    }
    
    // Network or other errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('🚨 ScrapingBee timeout - trying fallback')
      return await extractContentWithFallback(url)
    }
    
    throw new Error(`Content extraction failed: ${error.message}`)
  }
}

// Fallback extraction method with simpler parameters
async function extractContentWithFallback(url: string): Promise<ExtractedContent> {
  try {
    console.log(`🔄 Trying fallback extraction for: ${url}`)
    
    const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: process.env.SCRAPINGBEE_API_KEY,
        url: url,
        render_js: '0', // Disable JS rendering for faster response
        wait: '0' // No wait time
      },
      timeout: 20000, // Shorter timeout
      responseType: 'arraybuffer'
    })

    if (response.status !== 200) {
      throw new Error(`Fallback extraction failed with status ${response.status}`)
    }

    const html = response.data.toString()
    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article || !article.textContent || article.textContent.length < 50) {
      // More lenient content length for fallback
      throw new Error('Insufficient content from fallback extraction')
    }

    const cleanText = cleanContent(article.textContent)
    const title = article.title || extractTitleFromUrl(url)
    const ogImage = extractOgImage(dom.window.document, url)

    console.log(`✅ Fallback extracted ${cleanText.length} characters from: ${title}`)

    return {
      title: cleanTitle(title),
      ogImage,
      text: cleanText,
      url
    }
  } catch (error: any) {
    console.error('Fallback extraction also failed:', error)
    
    // Generate a minimal content object as last resort
    return {
      title: extractTitleFromUrl(url),
      text: `Content extraction temporarily unavailable for this link. Please try visiting ${url} directly.`,
      url,
      ogImage: undefined
    }
  }
}

function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace('www.', '')
    const path = urlObj.pathname
    
    // Try to extract meaningful title from URL
    if (path && path !== '/') {
      const segments = path.split('/').filter(s => s.length > 0)
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1]
        return `${hostname}: ${lastSegment.replace(/[-_]/g, ' ')}`
      }
    }
    
    return `Content from ${hostname}`
  } catch {
    return 'Shared Link'
  }
}


function cleanContent(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-–—|]\s*.+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function summarizeForAudio(text: string, maxWords: number = 150, sourceUrl?: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required')
  }

  const words = text.split(/\s+/)
  if (words.length <= maxWords) {
    // Even for short text, we want to add source attribution and structure
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const prompt = PROMPTS.summarizeForAudio(maxWords, sourceUrl).replace('{text}', text)

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ 
        role: "user", 
        content: prompt 
      }],
      max_tokens: Math.ceil(maxWords * 1.5),
      temperature: 0.3
    })

    const summary = response.choices[0]?.message?.content?.trim()
    if (summary) return summary
  }

  console.log(`🤖 Summarizing ${words.length} words to ${maxWords} words with storytelling format`)

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  const prompt = PROMPTS.summarizeForAudio(maxWords, sourceUrl).replace('{text}', text.substring(0, 12000))

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ 
      role: "user", 
      content: prompt 
    }],
    max_tokens: Math.ceil(maxWords * 1.5),
    temperature: 0.3
  })

  const summary = response.choices[0]?.message?.content?.trim()

  if (!summary) {
    throw new Error('Failed to generate summary')
  }

  return summary
}

function extractOgImage(document: Document, baseUrl: string): string | undefined {
  console.log('🖼️ Extracting OG image...')
  
  // Try og:image first
  const ogImageMeta = document.querySelector('meta[property="og:image"]')
  if (ogImageMeta) {
    const content = ogImageMeta.getAttribute('content')
    console.log('Found og:image:', content)
    if (content) {
      const resolvedUrl = resolveImageUrl(content, baseUrl)
      if (isValidImageUrl(resolvedUrl)) {
        console.log('✅ Using og:image:', resolvedUrl)
        return resolvedUrl
      }
    }
  }

  // Try twitter:image
  const twitterImageMeta = document.querySelector('meta[name="twitter:image"]')
  if (twitterImageMeta) {
    const content = twitterImageMeta.getAttribute('content')
    console.log('Found twitter:image:', content)
    if (content) {
      const resolvedUrl = resolveImageUrl(content, baseUrl)
      if (isValidImageUrl(resolvedUrl)) {
        console.log('✅ Using twitter:image:', resolvedUrl)
        return resolvedUrl
      }
    }
  }

  // Try link rel="image_src"
  const linkImage = document.querySelector('link[rel="image_src"]')
  if (linkImage) {
    const href = linkImage.getAttribute('href')
    console.log('Found image_src:', href)
    if (href) {
      const resolvedUrl = resolveImageUrl(href, baseUrl)
      if (isValidImageUrl(resolvedUrl)) {
        console.log('✅ Using image_src:', resolvedUrl)
        return resolvedUrl
      }
    }
  }

  console.log('❌ No OG image found')
  return undefined
}

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function resolveImageUrl(imageUrl: string, baseUrl: string): string {
  try {
    return new URL(imageUrl, baseUrl).href
  } catch {
    return imageUrl
  }
}

