import OpenAI from 'openai'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { logger } from './logger'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ExtractedContent {
  title: string
  text: string
  url: string
  wordCount: number
  ogImage?: string
}

export async function extractContentFromUrl(url: string): Promise<ExtractedContent> {
  const contentLogger = logger.child('content-extractor')
  contentLogger.info('Extracting content from URL', { url })

  try {
    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Biirbal/1.0; +https://biirbal.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    
    // Parse with JSDOM
    const dom = new JSDOM(html, { url })
    const document = dom.window.document

    // Extract OG image before Readability modifies the document
    let ogImage: string | undefined
    const ogImageMeta = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null
    if (ogImageMeta?.content) {
      ogImage = ogImageMeta.content
    } else {
      // Try other image meta tags
      const twitterImageMeta = document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement | null
      if (twitterImageMeta?.content) {
        ogImage = twitterImageMeta.content
      }
    }

    // Use Readability for content extraction
    const reader = new Readability(document)
    const article = reader.parse()

    if (!article || !article.textContent) {
      throw new Error('Could not extract readable content from URL')
    }

    const text = article.textContent.trim()
    const wordCount = text.split(/\s+/).filter(Boolean).length

    contentLogger.info('Content extracted successfully', {
      url,
      wordCount,
      titleLength: article.title?.length || 0
    })

    return {
      title: article.title || 'Untitled',
      text,
      url,
      wordCount,
      ogImage,
    }
  } catch (error) {
    contentLogger.error('Failed to extract content', { url, error })
    throw error
  }
}

export async function summarizeForAudio(text: string, maxWords: number = 150, url?: string): Promise<string> {
  const summaryLogger = logger.child('content-extractor')
  summaryLogger.info('Summarizing text for audio', { textLength: text.length, maxWords })

  const wordCount = text.split(/\s+/).filter(Boolean).length
  
  // For short texts, return as-is or with minimal processing
  if (wordCount <= maxWords) {
    summaryLogger.info('Text is short enough, using OpenAI for short-text path', { wordCount, maxWords })
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at creating engaging audio summaries. Create a natural, conversational summary that sounds good when read aloud. Focus on the key insights and make it engaging. Target length: ${maxWords} words or less.`
          },
          {
            role: 'user',
            content: `Please create a concise audio summary of this content:\n\n${text}${url ? `\n\nSource: ${url}` : ''}`
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      })
      
      const summary = response.choices[0]?.message?.content?.trim()
      if (summary) return summary
      // OpenAI returned empty content — throw instead of falling through to the
      // long-text path below, which would make a second paid API call silently.
      throw new Error('OpenAI returned empty summary for short text content')
    } catch (error) {
      summaryLogger.error('Failed to summarize short text with OpenAI', { error })
      throw error
    }
  }

  // For longer texts, use chunking approach
  summaryLogger.info('Text is long, using chunking approach', { wordCount, maxWords })
  
  try {
    // Split text into chunks if needed
    const maxChunkWords = 2000
    const words = text.split(/\s+/)
    const chunks: string[] = []
    
    for (let i = 0; i < words.length; i += maxChunkWords) {
      chunks.push(words.slice(i, i + maxChunkWords).join(' '))
    }
    
    let combinedSummary: string
    
    if (chunks.length === 1) {
      // Single chunk - direct summarization
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at creating engaging audio summaries. Create a natural, conversational summary that sounds good when read aloud. Focus on the key insights and make it engaging. Target length: ${maxWords} words or less.`
          },
          {
            role: 'user',
            content: `Please create a concise audio summary of this content:\n\n${text}${url ? `\n\nSource: ${url}` : ''}`
          }
        ],
        max_tokens: 600,
        temperature: 0.7,
      })
      
      combinedSummary = response.choices[0]?.message?.content?.trim() || text.substring(0, 500)
    } else {
      // Multiple chunks - summarize each then combine
      const chunkSummaries: string[] = []
      
      for (const chunk of chunks) {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Extract the key points from this text section in 2-3 sentences.'
            },
            {
              role: 'user',
              content: chunk
            }
          ],
          max_tokens: 200,
          temperature: 0.5,
        })
        
        const chunkSummary = response.choices[0]?.message?.content?.trim()
        if (chunkSummary) {
          chunkSummaries.push(chunkSummary)
        }
      }
      
      // Final synthesis
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at creating engaging audio summaries. Create a natural, conversational summary that sounds good when read aloud. Target length: ${maxWords} words or less.`
          },
          {
            role: 'user',
            content: `Create a cohesive audio summary from these key points:\n\n${chunkSummaries.join('\n\n')}${url ? `\n\nSource: ${url}` : ''}`
          }
        ],
        max_tokens: 600,
        temperature: 0.7,
      })
      
      combinedSummary = finalResponse.choices[0]?.message?.content?.trim() || chunkSummaries.join(' ')
    }
    
    summaryLogger.info('Summary created successfully', {
      originalWordCount: wordCount,
      summaryWordCount: combinedSummary.split(/\s+/).filter(Boolean).length
    })
    
    return combinedSummary
    
  } catch (error) {
    summaryLogger.error('Failed to summarize text', { error })
    throw error
  }
}
