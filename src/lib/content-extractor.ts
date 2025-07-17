import axios from 'axios'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import OpenAI from 'openai'

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
    throw new Error(`Content extraction failed: ${error.message}`)
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

export async function summarizeForAudio(text: string, maxWords: number = 150): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required')
  }

  const words = text.split(/\s+/)
  if (words.length <= maxWords) {
    return text
  }

  console.log(`🤖 Summarizing ${words.length} words to ${maxWords} words`)

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  const prompt = `Create a concise summary of this article for audio narration. Keep it under ${maxWords} words:

${text.substring(0, 12000)}`

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

