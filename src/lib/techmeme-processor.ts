import axios from 'axios'
import { JSDOM } from 'jsdom'
import { getDbClient } from './db'
import { extractContentFromUrl, summarizeForAudio } from './content-extractor'
import { generateAudioSummary, uploadAudioToStorage } from './text-to-speech'
import { logger } from './logger'

interface TechMemeArticle {
  title: string
  link: string
  pubDate: string
  description?: string
}

interface ProcessedFeedArticle {
  id: string
  title: string
  url: string
  slug: string
  summary: string
  audioFileUrl: string
  publishedAt: Date
  wordCount: number
  ogImage?: string
}

export async function fetchTechMemeFeed(): Promise<TechMemeArticle[]> {
  try {
    logger.info('Fetching TechMeme RSS feed...')
    
    const response = await axios.get('https://www.techmeme.com/feed.xml', {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Biirbal/1.0; +https://biirbal.ai)'
      }
    })

    const dom = new JSDOM(response.data, { contentType: 'text/xml' })
    const document = dom.window.document
    
    const items = document.querySelectorAll('item')
    const articles: TechMemeArticle[] = []

    items.forEach((item) => {
      const title = item.querySelector('title')?.textContent
      const link = item.querySelector('link')?.textContent
      const pubDate = item.querySelector('pubDate')?.textContent
      const description = item.querySelector('description')?.textContent

      if (title && link && pubDate) {
        articles.push({
          title: title.trim(),
          link: link.trim(),
          pubDate,
          description: description?.trim()
        })
      }
    })

    logger.info(`Fetched ${articles.length} articles from TechMeme`)
    return articles

  } catch (error: any) {
    logger.error('Failed to fetch TechMeme feed:', error)
    throw new Error(`TechMeme feed fetch failed: ${error.message}`)
  }
}

export function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100)
}

export async function processTechMemeArticle(article: TechMemeArticle): Promise<ProcessedFeedArticle | null> {
  const db = await getDbClient()
  
  try {
    // Check if article already exists
    const existing = await db.feedArticle.findUnique({
      where: { url: article.link }
    })

    if (existing) {
      logger.info(`Article already processed: ${article.title}`)
      return null
    }

    logger.info(`Processing new article: ${article.title}`)

    // Extract content
    const content = await extractContentFromUrl(article.link)
    
    // Generate summary for audio
    const summary = await summarizeForAudio(content.text, 150, article.link)
    
    // Generate audio
    const audioBuffer = await generateAudioSummary(summary)
    
    // Create unique slug
    let baseSlug = createSlug(article.title)
    let slug = baseSlug
    let counter = 1
    
    while (await db.feedArticle.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Upload audio
    const audioKey = `feed-audio/${slug}-${Date.now()}.mp3`
    const audioUrl = await uploadAudioToStorage(audioBuffer, audioKey)

    // Save to database
    const feedArticle = await db.feedArticle.create({
      data: {
        title: content.title,
        url: article.link,
        slug,
        extractedText: content.text,
        summary,
        audioFileUrl: audioUrl,
        audioFileKey: audioKey,
        ogImage: content.ogImage,
        publishedAt: new Date(article.pubDate),
        wordCount: content.wordCount,
        source: 'techmeme',
        tags: extractTags(article.title, content.text)
      }
    })

    logger.info(`Successfully processed article: ${feedArticle.id}`)

    return {
      id: feedArticle.id,
      title: feedArticle.title,
      url: feedArticle.url,
      slug: feedArticle.slug,
      summary: feedArticle.summary!,
      audioFileUrl: feedArticle.audioFileUrl!,
      publishedAt: feedArticle.publishedAt,
      wordCount: feedArticle.wordCount!,
      ogImage: feedArticle.ogImage
    }

  } catch (error: any) {
    logger.error(`Failed to process article ${article.title}:`, error)
    return null
  }
}

function extractTags(title: string, content: string): string[] {
  const techKeywords = [
    'ai', 'artificial intelligence', 'machine learning', 'startup', 'vc', 'venture capital',
    'crypto', 'blockchain', 'tech', 'software', 'app', 'mobile', 'web', 'cloud',
    'security', 'privacy', 'data', 'analytics', 'saas', 'enterprise', 'consumer'
  ]
  
  const text = (title + ' ' + content).toLowerCase()
  const foundTags = techKeywords.filter(keyword => 
    text.includes(keyword.toLowerCase())
  ).slice(0, 5)
  
  return foundTags
}

export async function getLatestFeedArticles(limit = 10): Promise<ProcessedFeedArticle[]> {
  const db = await getDbClient()
  
  const articles = await db.feedArticle.findMany({
    where: { 
      isPublished: true,
      audioFileUrl: { not: null }
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      url: true,
      slug: true,
      summary: true,
      audioFileUrl: true,
      publishedAt: true,
      wordCount: true,
      ogImage: true
    }
  })

  return articles.map(article => ({
    ...article,
    summary: article.summary!,
    audioFileUrl: article.audioFileUrl!,
    wordCount: article.wordCount!
  }))
}