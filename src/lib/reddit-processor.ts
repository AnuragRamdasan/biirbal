import axios from 'axios'
import { getDbClient } from './db'
import { extractContentFromUrl, summarizeForAudio } from './content-extractor'
import { generateAudioSummary, uploadAudioToStorage } from './text-to-speech'
import { logger } from './logger'

interface RedditPost {
  title: string
  url: string
  permalink: string
  created_utc: number
  selftext?: string
  author: string
  subreddit: string
  score: number
  num_comments: number
  thumbnail?: string
  preview?: {
    images: Array<{
      source: {
        url: string
      }
    }>
  }
}

interface RedditArticle {
  title: string
  link: string
  pubDate: string
  description?: string
  subreddit: string
  author: string
  score: number
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

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100)
}

function extractTags(title: string, text: string): string[] {
  const commonTags = ['ai', 'startup', 'tech', 'software', 'mobile', 'web', 'cloud', 'security', 'data', 'vc']
  const content = `${title} ${text}`.toLowerCase()
  return commonTags.filter(tag => content.includes(tag))
}

export async function fetchRedditFeed(): Promise<RedditArticle[]> {
  try {
    logger.info('Fetching Reddit technology posts...')
    
    // Fetch from multiple tech-focused subreddits
    const subreddits = ['technology', 'programming', 'startups', 'artificial', 'MachineLearning']
    const allArticles: RedditArticle[] = []
    
    for (const subreddit of subreddits) {
      try {
        const response = await axios.get(`https://www.reddit.com/r/${subreddit}/hot.json`, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Biirbal/1.0 (by /u/biirbal_bot)'
          },
          params: {
            limit: 10 // Get top 10 from each subreddit
          }
        })

        const posts = response.data?.data?.children || []
        
        for (const postData of posts) {
          const post: RedditPost = postData.data
          
          // Filter for quality posts with external links
          if (
            post.score >= 50 && // Minimum upvotes
            post.url && 
            !post.url.includes('reddit.com') && // External links only
            !post.url.includes('v.redd.it') && // No Reddit videos
            !post.url.includes('i.redd.it') && // No Reddit images
            post.title.length > 20 && // Substantial titles
            !post.title.toLowerCase().includes('[deleted]')
          ) {
            // Get image from preview if available
            let ogImage: string | undefined
            if (post.preview?.images?.[0]?.source?.url) {
              ogImage = post.preview.images[0].source.url.replace(/&amp;/g, '&')
            }

            allArticles.push({
              title: post.title,
              link: post.url,
              pubDate: new Date(post.created_utc * 1000).toISOString(),
              description: post.selftext || '',
              subreddit: post.subreddit,
              author: post.author,
              score: post.score
            })
          }
        }
      } catch (error) {
        logger.warn(`Failed to fetch from r/${subreddit}:`, error)
        continue
      }
    }
    
    // Sort by score (popularity) and take top articles
    const sortedArticles = allArticles
      .sort((a, b) => b.score - a.score)
      .slice(0, 20) // Take top 20 articles across all subreddits
    
    logger.info(`Fetched ${sortedArticles.length} articles from Reddit`)
    return sortedArticles
  } catch (error) {
    logger.error('Failed to fetch Reddit feed:', error)
    throw new Error(`Reddit feed fetch failed: ${error.message}`)
  }
}

export async function processRedditArticle(article: RedditArticle): Promise<ProcessedFeedArticle | null> {
  const db = await getDbClient()
  
  try {
    logger.info(`Processing Reddit article: ${article.title}`)

    // Check if article already exists
    const existingArticle = await db.feedArticle.findUnique({
      where: { url: article.link }
    })

    if (existingArticle) {
      logger.info(`Article already exists: ${article.title}`)
      return null
    }

    // Extract content from the original URL
    let content
    try {
      content = await extractContentFromUrl(article.link)
    } catch (error) {
      logger.error(`Content extraction failed for ${article.link}:`, error.message)
      return null
    }

    if (!content.text || content.text.length < 100) {
      logger.warn(`Content too short for: ${article.title}`)
      return null
    }

    // Generate summary for audio
    const summary = await summarizeForAudio(content.text, content.title)
    if (!summary || summary.length < 50) {
      logger.warn(`Summary generation failed for: ${article.title}`)
      return null
    }

    // Create unique slug
    let baseSlug = createSlug(article.title)
    let slug = baseSlug
    let counter = 1
    
    while (await db.feedArticle.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Generate audio with proper function signature
    const audioResult = await generateAudioSummary(summary, article.title)
    const audioUrl = await uploadAudioToStorage(audioResult.audioBuffer, audioResult.fileName)

    // Save to database
    const feedArticle = await db.feedArticle.create({
      data: {
        title: content.title,
        url: article.link,
        slug,
        extractedText: content.text,
        summary,
        audioFileUrl: audioUrl,
        audioFileKey: audioResult.fileName,
        ogImage: content.ogImage,
        publishedAt: new Date(article.pubDate),
        wordCount: content.wordCount,
        source: 'reddit',
        tags: [...extractTags(article.title, content.text), article.subreddit.toLowerCase()]
      }
    })

    logger.info(`Successfully processed Reddit article: ${feedArticle.id}`)

    return {
      id: feedArticle.id,
      title: feedArticle.title,
      url: article.link,
      slug: feedArticle.slug,
      summary: feedArticle.summary!,
      audioFileUrl: feedArticle.audioFileUrl!,
      publishedAt: feedArticle.publishedAt,
      wordCount: feedArticle.wordCount!,
      ogImage: feedArticle.ogImage
    }

  } catch (error: any) {
    logger.error(`Failed to process Reddit article ${article.title}:`, error)
    return null
  }
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